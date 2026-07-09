import { ExecutorShutdownError } from "./ExecutorShutdownError";
import {
	ITaskExecutor,
	NormalizedCancelParams,
	NormalizedTaskCancelRequest,
	normalizeCancelParams,
	TaskCancelOptions,
} from "./ITaskExecutor";
import { TaskHandle } from "./TaskHandle";

/**
 * Base class for task executors with two lifecycle controls:
 * - `cancel(...)` for task cancellation (executor remains usable)
 * - `shutdown(...)` for permanent executor shutdown
 *
 * Subclasses should:
 * 1. Call `checkShutdown()` at the start of `exec()`
 * 2. Implement `onCancelAll(reason)` to cancel queued/running tasks
 * 3. Optionally extend `onShutdown(reason)` for permanent cleanup
 */
export abstract class BaseTaskExecutor implements ITaskExecutor {
	private isShutdownState = false;
	private shutdownReason: unknown;

	abstract exec<T>(...args: unknown[]): TaskHandle<T>;

	shutdown(reason?: unknown): void {
		if (this.isShutdownState) {
			return;
		}
		this.isShutdownState = true;
		this.shutdownReason = reason;
		this.onShutdown(reason);
	}

	/**
	 * Cancels tasks on this executor.
	 *
	 * This does not permanently disable the executor. Use `shutdown()` for that.
	 *
	 * @param reason - Optional reason for cancellation
	 */
	cancel(reason?: unknown): void;
	cancel(options: TaskCancelOptions): void;
	cancel(reason: unknown, options: TaskCancelOptions): void;
	cancel(
		reasonOrOptions?: unknown | TaskCancelOptions,
		maybeOptions?: TaskCancelOptions,
	): void;
	cancel(
		reasonOrOptions?: unknown | TaskCancelOptions,
		maybeOptions?: TaskCancelOptions,
	): void {
		const { filter, reason } = this.normalizeCancelArgs(
			reasonOrOptions,
			maybeOptions,
		);

		if (filter) {
			this.cancelFiltered(filter);
			return;
		}

		this.cancelAll(reason);
	}

	/**
	 * Returns true if this executor has been permanently shut down.
	 * Kept for backward compatibility.
	 */
	isCancelled(): boolean {
		return this.isShutdownState;
	}

	/**
	 * Checks if the executor is shut down and throws ExecutorShutdownError if so.
	 * Subclasses should call this at the start of `exec()`.
	 *
	 * @param message - Optional custom error message
	 * @throws {ExecutorShutdownError} if the executor is shut down
	 */
	protected checkShutdown(message = "Executor permanently shut down"): void {
		if (this.isShutdownState) {
			throw ExecutorShutdownError.fromReason(message, this.shutdownReason);
		}
	}

	/**
	 * Hook for subclasses to cancel current and queued tasks.
	 * Called whenever `cancel()` without filters is invoked.
	 */
	protected abstract onCancelAll(reason?: unknown): void;

	/**
	 * Hook for subclasses to perform permanent shutdown cleanup.
	 * Default behavior first cancels all tasks.
	 * Subclasses can extend this to stop internal workers/timers.
	 *
	 * @param reason - The shutdown reason
	 */
	protected onShutdown(reason?: unknown): void {
		this.onCancelAll(reason);
	}

	/**
	 * Handles selective cancellation requests (e.g., by task kind).
	 * Default behaviour upgrades to a full cancellation.
	 */
	protected cancelFiltered(request: NormalizedTaskCancelRequest): void {
		this.cancelAll(request.reason);
	}

	protected cancelAll(reason?: unknown): void {
		if (this.isShutdownState) {
			return;
		}
		this.onCancelAll(reason);
	}

	protected getShutdownReason(): unknown {
		return this.shutdownReason;
	}

	protected isShutdown(): boolean {
		return this.isShutdownState;
	}

	private normalizeCancelArgs(
		reasonOrOptions?: unknown | TaskCancelOptions,
		maybeOptions?: TaskCancelOptions,
	): NormalizedCancelParams {
		return normalizeCancelParams(reasonOrOptions, maybeOptions);
	}
}
