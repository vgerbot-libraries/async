import { Defer } from "../utils/Defer";
import { CancelError } from "./CancelError";
import { ICancellable } from "./ICancellable";
import { CANCEL_REASON } from "./internal";

/**
 * Handle for a cancellable task that extends Defer with cancellation capabilities.
 * Provides methods to cancel the task and check its cancellation status.
 *
 * @template T - The type of the task result
 */
export class CancellableHandle<T> extends Defer<T> implements ICancellable {
	[CANCEL_REASON]: CancelError | null = null;

	/**
	 * Gets the cancellation error if the task has been cancelled.
	 * Returns null if the task has not been cancelled.
	 *
	 * @returns The CancelError that caused the cancellation, or null if not cancelled
	 */
	public get cancelReason(): CancelError | null {
		return this[CANCEL_REASON];
	}
	/**
	 * Creates a new CancellableHandle instance.
	 * @param abortController - The AbortController used to manage cancellation
	 */
	constructor(private readonly abortController: AbortController) {
		super();
	}

	/**
	 * Gets the AbortSignal associated with this handle.
	 * @returns The AbortSignal for monitoring cancellation
	 */
	get signal() {
		return this.abortController.signal;
	}

	/**
	 * Checks if the task has been cancelled.
	 * @returns True if the task has been cancelled, false otherwise
	 */
	isCancelled() {
		return this.signal.aborted;
	}

	/**
	 * Cancels the task with an optional reason.
	 * @param reason - Optional reason for cancellation
	 */
	cancel(reason?: unknown) {
		this.abortController.abort(reason);
	}
}
