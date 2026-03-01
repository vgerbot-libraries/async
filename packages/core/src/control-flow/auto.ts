import {
	CancellableHandle,
	CancellableOptions,
	CancellableToken,
	cancellable,
} from "../cancellable";

export interface AutoOptions extends CancellableOptions {
	concurrency?: number;
}

export type AutoTaskFn<TResult> = (
	results: Readonly<Record<string, unknown>>,
	token: CancellableToken,
) => Promise<TResult>;

export type AutoTask<TResult> =
	| AutoTaskFn<TResult>
	| readonly [dependencies: readonly string[], task: AutoTaskFn<TResult>];

export type AutoTasks = Record<string, AutoTask<unknown>>;

type TaskResult<TTask> =
	TTask extends AutoTaskFn<infer TResult>
		? TResult
		: TTask extends readonly [readonly string[], AutoTaskFn<infer TResult>]
			? TResult
			: never;

export type AutoResult<TTasks extends AutoTasks> = {
	[K in keyof TTasks]: TaskResult<TTasks[K]>;
};

interface ParsedTask {
	dependencies: string[];
	run: AutoTaskFn<unknown>;
}

/**
 * Executes a dependency graph of async tasks.
 *
 * Each task can be:
 * - A function `(results, token) => Promise<value>`
 * - A tuple `[dependencies, taskFn]`
 *
 * @param tasks - Task map where keys are task names.
 * @param options - Configuration options, including cancellation and concurrency.
 * @returns A cancellable handle resolving to task results by key.
 *
 * @example
 * ```ts
 * const handle = auto(
 *   {
 *     config: async () => ({ baseUrl: "/api" }),
 *     user: [["config"], async (results, token) => {
 *       await token.sleep(5);
 *       return { id: 1, url: `${(results.config as { baseUrl: string }).baseUrl}/users/1` };
 *     }],
 *     posts: [["user"], async (results) => {
 *       const user = results.user as { id: number };
 *       return [`post-of-${user.id}`];
 *     }],
 *   },
 *   { concurrency: 2 },
 * );
 *
 * const result = await handle;
 * // { config: { baseUrl: "/api" }, user: { ... }, posts: ["post-of-1"] }
 * ```
 */
export function auto<TTasks extends AutoTasks>(
	tasks: TTasks,
	options?: AutoOptions,
): CancellableHandle<AutoResult<TTasks>> {
	const { concurrency = Infinity } = options ?? {};
	return cancellable(async (token) => {
		const parsed = parseTasks(tasks);
		validateDependencies(parsed);

		const taskNames = Object.keys(parsed);
		const pending = new Set(taskNames);
		const active = new Map<string, Promise<void>>();
		const results: Record<string, unknown> = {};
		const limit = isFinite(concurrency)
			? Math.max(1, Math.floor(concurrency))
			: Infinity;
		let firstError: unknown;

		const scheduleTask = (name: string) => {
			const parsedTask = parsed[name] as ParsedTask;
			const run = async () => {
				try {
					const value = await parsedTask.run(results, token);
					results[name] = value;
				} catch (error) {
					if (firstError === undefined) {
						firstError = error;
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
			throw firstError;
		}

		return results as AutoResult<TTasks>;
	}, options);
}

function parseTasks(tasks: AutoTasks): Record<string, ParsedTask> {
	const parsed: Record<string, ParsedTask> = {};
	for (const key of Object.keys(tasks)) {
		const value = tasks[key];
		if (!value) {
			throw new Error(`auto task "${key}" is not defined`);
		}
		if (typeof value === "function") {
			parsed[key] = {
				dependencies: [],
				run: value,
			};
			continue;
		}

		const [dependencies, run] = value;
		parsed[key] = {
			dependencies: [...dependencies],
			run,
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
	results: Record<string, unknown>,
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
	results: Record<string, unknown>,
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
