import {
	CancelError,
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";

type AutoTaskKey<TResults> = Extract<keyof TResults, string>;

export interface AutoBaseOptions<R = unknown> extends CancellableOptions<R> {
	concurrency?: number;
}

export type AutoTaskFn<TResult, TResults extends Record<string, unknown>> = (
	results: Readonly<TResults>,
	token: CancellableToken,
) => Promise<TResult>;

export type AutoTask<
	TResults extends Record<string, unknown>,
	TResult = unknown,
	TDependencies extends
		readonly AutoTaskKey<TResults>[] = readonly AutoTaskKey<TResults>[],
> =
	| AutoTaskFn<TResult, Partial<AutoResult<TResults>>>
	| readonly [
			dependencies: TDependencies,
			task: AutoTaskFn<
				TResult,
				Pick<AutoResult<TResults>, TDependencies[number]>
			>,
	  ];

export type AutoTasks<TResults extends Record<string, unknown>> = {
	[K in keyof TResults]: AutoTask<TResults, TResults[K]>;
};

export interface AutoResolveResult<TResults extends Record<string, unknown>> {
	results: Partial<AutoResult<TResults>>;
	error?: AutoExecutionError<AutoResult<TResults>>;
}

export interface AutoRejectOptions<TResults extends Record<string, unknown>>
	extends AutoBaseOptions<AutoResult<TResults>> {
	errorMode?: "reject";
}

export interface AutoResolveOptions<TResults extends Record<string, unknown>>
	extends AutoBaseOptions<AutoResolveResult<TResults>> {
	errorMode: "resolve";
}

export class AutoExecutionError<
	TResults extends Record<string, unknown>,
> extends Error {
	readonly taskName: string;
	readonly cause: unknown;
	readonly partialResults: Readonly<Partial<TResults>>;

	constructor(
		taskName: string,
		cause: unknown,
		partialResults: Partial<TResults>,
	) {
		super(
			`[${taskName}] ${cause instanceof Error ? cause.message : String(cause)}`,
		);
		this.name = "AutoExecutionError";
		this.taskName = taskName;
		this.cause = cause;
		this.partialResults = { ...partialResults };
	}
}

export type AutoResult<TResults extends Record<string, unknown>> = {
	[K in keyof TResults]: TResults[K];
};

interface ParsedTask {
	dependencies: string[];
	run: (results: unknown, token: CancellableToken) => Promise<unknown>;
}

/**
 * Executes a dependency graph of async tasks.
 *
 * Each task can be:
 * - A function `(results, token) => Promise<value>`
 * - A tuple `[dependencies, taskFn]` where `results` is strongly typed by dependencies
 *
 * @param tasks - Task map where keys are task names.
 * @param options - Configuration options, including cancellation, concurrency, and errorMode.
 *   - `errorMode: "reject"` (default): rejects with an AutoExecutionError carrying partialResults.
 *   - `errorMode: "resolve"`: resolves with `{ results, error }` containing partial results and the error.
 * @returns A cancellable handle resolving to task results by key (reject mode),
 *   or `{ results, error }` (resolve mode).
 *
 * @example
 * ```ts
 * const handle = auto(
 *   {
 *     config: [[], async () => ({ baseUrl: "/api" })],
 *     user: [["config"], async (results, token) => {
 *       await token.sleep(5);
 *       return { id: 1, url: `${results.config.baseUrl}/users/1` };
 *     }],
 *     posts: [["user"], async (results) => {
 *       return [`post-of-${results.user.id}`];
 *     }],
 *   },
 *   { concurrency: 2, errorMode: "reject" },
 * );
 *
 * const result = await handle;
 * // { config: { baseUrl: "/api" }, user: { ... }, posts: ["post-of-1"] }
 * ```
 */
export function auto<TResults extends Record<string, unknown>>(
	tasks: AutoTasks<TResults>,
	options: AutoResolveOptions<TResults>,
): CancellableHandle<AutoResolveResult<TResults>>;
export function auto<TResults extends Record<string, unknown>>(
	tasks: AutoTasks<TResults>,
	options?: AutoRejectOptions<TResults>,
): CancellableHandle<AutoResult<TResults>>;
export function auto<TResults extends Record<string, unknown>>(
	tasks: AutoTasks<TResults>,
	options?: AutoRejectOptions<TResults> | AutoResolveOptions<TResults>,
):
	| CancellableHandle<AutoResult<TResults>>
	| CancellableHandle<AutoResolveResult<TResults>> {
	const { concurrency = Infinity, errorMode = "reject" } = options ?? {};
	const executeGraph = async (token: CancellableToken) => {
		const autoName = token.name ?? "auto";
		const parsed = parseTasks(tasks);
		validateDependencies(parsed);

		const taskNames = Object.keys(parsed);
		const pending = new Set(taskNames);
		const active = new Map<string, Promise<void>>();
		const results: Partial<AutoResult<TResults>> = {};
		const limit = isFinite(concurrency)
			? Math.max(1, Math.floor(concurrency))
			: Infinity;
		let firstError:
			| {
					taskName: string;
					cause: unknown;
			  }
			| undefined;

		const scheduleTask = (name: string) => {
			const parsedTask = parsed[name] as ParsedTask;
			const taskName = `${autoName}.${name}`;
			const run = async () => {
				try {
					const value = await parsedTask.run(results, token);
					(results as Record<string, unknown>)[name] = value;
				} catch (error) {
					if (firstError === undefined) {
						firstError = {
							taskName,
							cause: error,
						};
					}
				} finally {
					active.delete(name);
				}
			};
			active.set(name, run());
		};

		while ((pending.size > 0 || active.size > 0) && firstError === undefined) {
			token.throwIfCancelled();

			let scheduled = false;
			while (active.size < limit) {
				const readyTask = findReadyTask(pending, parsed, results);
				if (!readyTask) {
					break;
				}
				pending.delete(readyTask);
				scheduled = true;
				scheduleTask(readyTask);
			}

			if (firstError !== undefined) {
				break;
			}

			if (active.size === 0) {
				if (pending.size > 0) {
					throw createCycleError(pending, parsed, results);
				}
				break;
			}

			if (!scheduled || active.size >= limit) {
				await Promise.race(active.values());
			}
		}

		if (firstError !== undefined) {
			await Promise.allSettled(active.values());
			return {
				results,
				error: createAutoExecutionError(firstError, results),
			};
		}

		return { results };
	};

	if (errorMode === "resolve") {
		const resolveOptions = options as AutoResolveOptions<TResults> | undefined;
		const resolvedOptions: AutoBaseOptions<AutoResolveResult<TResults>> = {
			...resolveOptions,
			name: resolveOptions?.name ?? "auto",
		};
		return cancellable(async (token): Promise<AutoResolveResult<TResults>> => {
			const execution = await executeGraph(token);
			if (execution.error) {
				return {
					results: { ...execution.results },
					error: execution.error,
				};
			}
			return {
				results: execution.results,
			};
		}, resolvedOptions);
	}

	const rejectOptions = options as AutoRejectOptions<TResults> | undefined;
	const resolvedOptions: AutoBaseOptions<AutoResult<TResults>> = {
		...rejectOptions,
		name: rejectOptions?.name ?? "auto",
	};
	return cancellable(async (token) => {
		const execution = await executeGraph(token);
		if (execution.error) {
			throw execution.error;
		}
		return execution.results as AutoResult<TResults>;
	}, resolvedOptions);
}

function createAutoExecutionError<TResults extends Record<string, unknown>>(
	failure: { taskName: string; cause: unknown },
	results: Partial<AutoResult<TResults>>,
) {
	if (failure.cause instanceof AutoExecutionError) {
		return failure.cause;
	}
	if (failure.cause instanceof CancelError) {
		throw failure.cause;
	}
	return new AutoExecutionError<AutoResult<TResults>>(
		failure.taskName,
		failure.cause,
		results,
	);
}

function parseTasks<TResults extends Record<string, unknown>>(
	tasks: AutoTasks<TResults>,
): Record<string, ParsedTask> {
	const parsed: Record<string, ParsedTask> = {};
	for (const key of Object.keys(tasks)) {
		const value = tasks[key as keyof AutoTasks<TResults>];
		if (!value) {
			throw new Error(`auto task "${key}" is not defined`);
		}
		if (typeof value === "function") {
			parsed[key] = {
				dependencies: [],
				run: value as (
					results: unknown,
					token: CancellableToken,
				) => Promise<unknown>,
			};
			continue;
		}

		const [dependencies, run] = value;
		parsed[key] = {
			dependencies: [...dependencies],
			run: run as (
				results: unknown,
				token: CancellableToken,
			) => Promise<unknown>,
		};
	}
	return parsed;
}

function validateDependencies(tasks: Record<string, ParsedTask>) {
	const names = new Set(Object.keys(tasks));
	for (const [name, task] of Object.entries(tasks)) {
		for (const dependency of task.dependencies) {
			if (!names.has(dependency)) {
				throw new Error(
					`auto task "${name}" depends on unknown task "${dependency}"`,
				);
			}
		}
	}
}

function findReadyTask(
	pending: Set<string>,
	tasks: Record<string, ParsedTask>,
	results: Partial<Record<string, unknown>>,
) {
	for (const name of pending) {
		const dependencies = tasks[name]?.dependencies ?? [];
		const ready = dependencies.every((dep) => Object.hasOwn(results, dep));
		if (ready) {
			return name;
		}
	}
	return undefined;
}

function createCycleError(
	pending: Set<string>,
	tasks: Record<string, ParsedTask>,
	results: Partial<Record<string, unknown>>,
) {
	const unresolved = Array.from(pending).map((name) => {
		const missing = (tasks[name]?.dependencies ?? []).filter(
			(dep) => !Object.hasOwn(results, dep),
		);
		return `${name}[${missing.join(", ")}]`;
	});
	return new Error(
		`auto cannot resolve dependencies (possible cycle): ${unresolved.join("; ")}`,
	);
}
