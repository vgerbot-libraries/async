import { AsyncTask } from "../cancellable/AsyncTask";
import { ITaskExecutor, TaskCancelOptions, TaskOptions } from "./ITaskExecutor";
import { PoolTaskExecutor } from "./PoolTaskExecutor";

/**
 * A task executor that runs tasks in series (sequentially), one after another.
 * Tasks are queued and executed in the exact order they were submitted.
 * Implemented as a PoolTaskExecutor with concurrency of 1.
 */
export class SeriesTaskExecutor implements ITaskExecutor {
	private readonly pool = new PoolTaskExecutor(1);

	exec<T>(task: AsyncTask<T>, options?: TaskOptions): Promise<T> {
		return this.pool.exec(task, options);
	}

	cancel(reason?: unknown): void;
	cancel(options: TaskCancelOptions): void;
	cancel(reason: unknown, options: TaskCancelOptions): void;
	cancel(
		reasonOrOptions?: unknown | TaskCancelOptions,
		maybeOptions?: TaskCancelOptions,
	): void {
		this.pool.cancel(reasonOrOptions as unknown, maybeOptions);
	}

	isCancelled() {
		return this.pool.isCancelled();
	}
}
