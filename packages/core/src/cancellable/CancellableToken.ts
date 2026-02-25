import { CancelError } from "./CancelError";
import { CancellableHandle } from "./CancellableHandle";
import { RETRY_ATTEMPT } from "./internal";

/**
 * Token provided to cancellable tasks for managing cancellation state and utilities.
 * Provides methods to check cancellation status, wrap promises, sleep, and run intervals.
 */
export class CancellableToken {
	[RETRY_ATTEMPT]: number = 0;

	/**
	 * Gets the current retry attempt number.
	 * Returns 0 for the initial attempt, 1 for the first retry, and so on.
	 * This is useful for tracking retry progress when retry options are configured.
	 *
	 * @returns The current retry attempt number (0-indexed)
	 */
	get retryAttempt() {
		return this[RETRY_ATTEMPT];
	}

	private cancelReason: CancelError | null = null;

	/**
	 * Creates a new CancellableTaskToken instance.
	 * @param signal - The AbortSignal to monitor for cancellation
	 */
	constructor(public readonly signal: AbortSignal) {
		signal.addEventListener("abort", () => {
			this.cancelReason = new CancelError("Task canceled", signal.reason);
		});
	}

	/**
	 * Wraps a promise or CancellableHandle to respect the cancellation token.
	 * If the token is cancelled, the wrapped promise will be rejected with a CancelError.
	 *
	 * @template T - The type of the promise result
	 * @param p - The promise or CancellableHandle to wrap
	 * @returns A promise that respects the cancellation token
	 */
	wrap<T>(p: CancellableHandle<T> | Promise<T>): Promise<T> {
		if (p instanceof CancellableHandle) {
			this.signal.addEventListener("abort", () => {
				p.cancel(this.cancelReason);
			});
			return p;
		}
		return new Promise<T>((resolve, reject) => {
			if (this.isCancelled()) {
				reject(this.cancelReason);
			}
			p.then((value) => {
				if (this.isCancelled()) {
					reject(this.cancelReason);
				} else {
					resolve(value);
				}
			}, reject);
		});
	}

	/**
	 * Creates a cancellable sleep/delay promise.
	 * The promise will be rejected if the token is cancelled during the sleep period.
	 *
	 * @param ms - The number of milliseconds to sleep
	 * @returns A promise that resolves after the specified delay or rejects if cancelled
	 */
	sleep(ms: number) {
		return this.delay((callback) => {
			const timer = setTimeout(callback, ms);
			return () => {
				clearTimeout(timer);
			};
		});
	}

	/**
	 * Creates a cancellable animation frame promise.
	 * Uses requestAnimationFrame if available, otherwise falls back to setTimeout.
	 * The promise will be rejected if the token is cancelled before the frame callback.
	 *
	 * @returns A promise that resolves on the next animation frame or rejects if cancelled
	 */
	frame() {
		return this.delay((callback) => {
			if (typeof requestAnimationFrame === "function") {
				const handle = requestAnimationFrame(callback);
				return () => {
					cancelAnimationFrame(handle);
				};
			} else {
				const handle = setTimeout(callback, 1000 / 60);
				return () => {
					clearTimeout(handle);
				};
			}
		});
	}

	/**
	 * Creates a cancellable delay promise using a custom scheduling function.
	 * The scheduling function receives a callback to invoke when the delay completes,
	 * and must return a cleanup function to cancel the scheduled operation.
	 *
	 * @param schedule - Function that schedules the delay and returns a cleanup function
	 * @returns A promise that resolves when the delay completes or rejects if cancelled
	 *
	 * @example
	 * ```typescript
	 * // Custom delay using setTimeout
	 * await token.delay((done) => {
	 *   const timer = setTimeout(done, 1000);
	 *   return () => clearTimeout(timer);
	 * });
	 * ```
	 */
	delay(schedule: (done: () => void) => () => void) {
		return new Promise<void>((resolve, reject) => {
			if (this.isCancelled()) {
				reject(this.cancelReason);
				return;
			}

			const cleanup = schedule(() => {
				if (this.isCancelled()) {
					reject(this.cancelReason);
				} else {
					resolve();
				}
			});

			this.signal.addEventListener("abort", () => {
				cleanup();
				reject(this.cancelReason);
			});
		});
	}

	/**
	 * Executes a function repeatedly at a specified interval until the token is cancelled.
	 * The function can be synchronous or asynchronous.
	 *
	 * @param fn - The function to execute at each interval
	 * @param interval - The interval in milliseconds between executions
	 * @returns A promise that resolves when the token is cancelled
	 */
	async interval(fn: () => void | Promise<void>, interval: number) {
		while (!this.isCancelled()) {
			await fn();
			await this.sleep(interval);
		}
	}

	/**
	 * Throws a CancelError if the token has been cancelled.
	 * Useful for checking cancellation status at specific points in async operations.
	 *
	 * @throws {CancelError} If the token has been cancelled
	 */
	throwIfCancelled() {
		if (this.isCancelled()) {
			throw this.cancelReason;
		}
	}

	/**
	 * Checks if the token has been cancelled.
	 *
	 * @returns True if the token has been cancelled, false otherwise
	 */
	isCancelled() {
		return this.signal.aborted;
	}

	/**
	 * Registers a callback to be invoked when the token is cancelled.
	 * If the token is already cancelled, the callback is invoked immediately.
	 *
	 * @param callback - Function to call when cancellation occurs, receives the CancelError
	 * @returns A cleanup function to remove the callback listener
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = token.onCancel((error) => {
	 *   console.log('Task cancelled:', error?.message);
	 * });
	 * // Later, to remove the listener:
	 * unsubscribe();
	 * ```
	 */
	onCancel(callback: (error: CancelError | null) => void) {
		const listener = () => {
			callback(this.cancelReason);
		};
		if (this.isCancelled()) {
			listener();
			return () => {
				// PASS
			};
		} else {
			this.signal.addEventListener("abort", listener);
			return () => {
				this.signal.removeEventListener("abort", listener);
			};
		}
	}
}
