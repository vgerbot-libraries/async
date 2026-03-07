import { CancelError } from "../cancellable/CancelError";
import { ITaskExecutor } from "./ITaskExecutor";

/**
 * Base class for task executors that provides permanent cancellation semantics.
 *
 * Once cancelled, the executor is permanently disabled and cannot execute new tasks.
 * This aligns with the cancellable pattern where cancellation is terminal and irreversible.
 *
 * Subclasses should:
 * 1. Call `checkCancelled()` at the start of `exec()` to enforce permanent cancellation
 * 2. Override `onCancel(reason)` to perform executor-specific cleanup (abort current tasks, drain queues, etc.)
 * 3. Optionally store abort reason for context
 */
export abstract class BaseTaskExecutor implements ITaskExecutor {
	private cancelled = false;
	private cancelReason: unknown;

	abstract exec<T>(...args: unknown[]): PromiseLike<T>;

	/**
	 * Permanently cancels this executor.
	 * After cancellation, all future `exec()` calls will throw CancelError.
	 *
	 * @param reason - Optional reason for cancellation
	 */
	cancel(reason?: unknown): void {
		if (this.cancelled) {
			return;
		}
		this.cancelled = true;
		this.cancelReason = reason;
		this.onCancel(reason);
	}

	/**
	 * Returns true if this executor has been permanently cancelled.
	 */
	isCancelled(): boolean {
		return this.cancelled;
	}

	/**
	 * Checks if the executor is cancelled and throws CancelError if so.
	 * Subclasses should call this at the start of `exec()`.
	 *
	 * @param message - Optional custom error message
	 * @throws {CancelError} if the executor is cancelled
	 */
	protected checkCancelled(message = "Executor permanently cancelled"): void {
		if (this.cancelled) {
			throw CancelError.fromReason(message, this.cancelReason);
		}
	}

	/**
	 * Hook for subclasses to perform cleanup when cancelled.
	 * Called once when `cancel()` is first invoked.
	 *
	 * Typical cleanup actions:
	 * - Abort currently executing tasks
	 * - Reject all pending/queued tasks
	 * - Cancel worker handles
	 * - Clear timers
	 *
	 * @param reason - The cancellation reason
	 */
	protected abstract onCancel(reason?: unknown): void;
}
