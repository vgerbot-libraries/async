import { AsyncTask } from "../cancellable/AsyncTask";
import { ITaskExecutor } from "./ITaskExecutor";
import { PoolTaskExecutor } from "./PoolTaskExecutor";

/**
 * A task executor that runs tasks in series (sequentially), one after another.
 * Tasks are queued and executed in the exact order they were submitted.
 * Implemented as a PoolTaskExecutor with concurrency of 1.
 */
export class SeriesTaskExecutor implements ITaskExecutor {
	private readonly pool = new PoolTaskExecutor(1);

	exec<T>(task: AsyncTask<T>): Promise<T> {
		return this.pool.exec(task);
	}

	cancel() {
		this.pool.cancel();
	}

	isCancelled() {
		return this.pool.isCancelled();
	}
}
