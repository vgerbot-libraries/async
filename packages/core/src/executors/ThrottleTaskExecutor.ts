import { AsyncTask } from "../cancellable/AsyncTask";
import { Defer } from "../common/Defer";
import { DebounceTaskExecutor } from "./DebounceTaskExecutor";

export interface ThrottleOptions {
	leading?: boolean;
	trailing?: boolean;
}

/**
 * A task executor that guarantees a task is only executed at most once per every `wait` milliseconds.
 * Useful for rate-limiting execution of tasks to a steady frequency.
 *
 * @param wait - Minimum milliseconds between invocations.
 * @param options - Additional configuration options.
 * @param options.leading - Invoke on the leading edge. Default `true`.
 * @param options.trailing - Invoke on the trailing edge. Default `true`.
 */
export class ThrottleTaskExecutor {
	private readonly executor: DebounceTaskExecutor;

	constructor(wait: number, options?: ThrottleOptions) {
		this.executor = new DebounceTaskExecutor(wait, {
			leading: options?.leading ?? true,
			trailing: options?.trailing ?? true,
			maxWait: wait,
		});
	}

	exec<T>(task: AsyncTask<T>): Defer<T> {
		return this.executor.exec(task);
	}

	cancel() {
		this.executor.cancel();
	}

	flush() {
		this.executor.flush();
	}

	get pending(): boolean {
		return this.executor.pending;
	}
}
