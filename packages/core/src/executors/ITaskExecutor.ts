import { AsyncTask } from "../cancellable/AsyncTask";

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const sanitizeString = (value: unknown): string | undefined => {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Configuration metadata associated with a submitted task.
 * `kind` enables grouping for selective cancellation, while `name`
 * provides a human-readable label for debugging and observability.
 */
export interface TaskOptions {
	readonly kind?: string;
	readonly name?: string;
	readonly metadata?: Record<string, unknown>;
}

/**
 * Normalised view of task options used internally by executor implementations.
 */
export interface ResolvedTaskOptions {
	readonly kind?: string;
	readonly name?: string;
	readonly label?: string;
	readonly metadata?: Record<string, unknown>;
}

/**
 * Options for selectively cancelling tasks.
 * Providing `kind` cancels pending/running tasks associated with that kind
 * without permanently disabling the executor.
 */
export interface TaskCancelOptions {
	readonly kind?: string | string[];
	readonly reason?: unknown;
}

/**
 * Normalised cancellation request shared by executor implementations.
 */
export interface NormalizedTaskCancelRequest {
	readonly kinds: string[];
	readonly reason?: unknown;
}

/**
 * Normalised cancellation params derived from the various overloads.
 */
export interface NormalizedCancelParams {
	readonly filter?: NormalizedTaskCancelRequest;
	readonly reason?: unknown;
}

export const isTaskCancelOptions = (
	value: unknown,
): value is TaskCancelOptions =>
	isObject(value) && ("kind" in value || "reason" in value);

const normalizeKinds = (input: string | string[] | undefined): string[] => {
	if (input === undefined) return [];
	const source = Array.isArray(input) ? input : [input];
	const kinds = source
		.map(sanitizeString)
		.filter((value): value is string => value !== undefined);
	return Array.from(new Set(kinds));
};

/**
 * Normalises public task options into an internal representation with
 * consistently trimmed strings and a computed label.
 */
export const resolveTaskOptions = (
	options?: TaskOptions,
): ResolvedTaskOptions => {
	const kind = sanitizeString(options?.kind);
	const name = sanitizeString(options?.name);
	return {
		kind,
		name,
		label: name ?? kind,
		metadata: options?.metadata,
	};
};

/**
 * Derives cancellation intent and reason from the supported overloads.
 */
export const normalizeCancelParams = (
	reasonOrOptions?: unknown | TaskCancelOptions,
	maybeOptions?: TaskCancelOptions,
): NormalizedCancelParams => {
	let reason: unknown | undefined;
	let options: TaskCancelOptions | undefined;

	if (isTaskCancelOptions(reasonOrOptions)) {
		options = reasonOrOptions;
	} else {
		reason = reasonOrOptions;
		options = maybeOptions;
	}

	if (options?.reason !== undefined) {
		reason = options.reason;
	}

	const kinds = normalizeKinds(options?.kind);

	return {
		reason,
		filter: kinds.length
			? {
					kinds,
					reason,
				}
			: undefined,
	};
};

/**
 * Checks whether the provided task metadata matches a cancellation request.
 */
export const matchesCancelRequest = (
	options: ResolvedTaskOptions | undefined,
	request: NormalizedTaskCancelRequest,
): boolean => {
	if (!options?.kind) return false;
	return request.kinds.includes(options.kind);
};

/**
 * Common interface for all task executors.
 * Provides a consistent API for submitting, cancelling, and querying tasks.
 */
export interface ITaskExecutor {
	cancel(reason?: unknown): void;
	cancel(options: TaskCancelOptions): void;
	cancel(reason: unknown, options: TaskCancelOptions): void;
	isCancelled(): boolean;
	exec<T>(task: AsyncTask<T>, options?: TaskOptions): PromiseLike<T>;
}
