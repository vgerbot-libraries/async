import { AsyncTask } from "../cancellable/AsyncTask";
import { ICancellable } from "../cancellable/ICancellable";

/**
 * Common interface for all task executors.
 * Provides a consistent API for submitting, cancelling, and querying tasks.
 */
export interface ITaskExecutor extends ICancellable {
	exec<T>(task: AsyncTask<T>): PromiseLike<T>;
}
