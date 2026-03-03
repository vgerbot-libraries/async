import { AsyncTask } from "../cancellable/AsyncTask";

/**
 * Common interface for all task executors.
 * Provides a consistent API for submitting, cancelling, and querying tasks.
 */
export interface ITaskExecutor {
	cancel(reason?: unknown): void;
	isCancelled(): boolean;
	exec<T>(task: AsyncTask<T>): PromiseLike<T>;
}
