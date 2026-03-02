import { CancelError } from "./CancelError";
import { CancellableHandle } from "./CancellableHandle";
import { RETRY_ATTEMPT } from "./internal";

/**
 * Token provided to cancellable tasks for managing cancellation state and utilities.
 * Provides methods to check cancellation status, wrap promises, sleep, and run intervals.
 */
export class CancellableToken {
	[RETRY_ATTEMPT]: number = 0;
	public readonly name?: string;

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

	private cancelError: CancelError | null = null;

	/**
	 * Creates a new CancellableTaskToken instance.
	 * @param signal - The AbortSignal to monitor for cancellation
	 */
	constructor(
		public readonly signal: AbortSignal,
		name?: string,
	) {
		this.name = name;

		if (signal.aborted) {
			this.syncCancelError(signal.reason);
			return;
		}

		signal.addEventListener("abort", () => {
			this.syncCancelError(signal.reason);
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
			const listener = () => {
				p.cancel(this.currentCancelError());
			};
			this.signal.addEventListener("abort", listener);
			return p.promise.finally(() => {
				this.signal.removeEventListener("abort", listener);
			});
		}
		return new Promise<T>((resolve, reject) => {
			if (this.isCancelled()) {
				reject(this.rejectionError());
				return;
			}
			const listener = () => {
				reject(this.rejectionError());
			};
			this.signal.addEventListener("abort", listener);
			p.then(
				(value) => {
					this.signal.removeEventListener("abort", listener);
					if (this.isCancelled()) {
						reject(this.rejectionError());
					} else {
						resolve(value);
					}
				},
				(err) => {
					this.signal.removeEventListener("abort", listener);
					reject(err);
				},
			);
		});
	}

	/**
	 * Creates a cancellable sleep/delay.
	 * The handle will be rejected if the token is cancelled during the sleep period.
	 *
	 * @param ms - The number of milliseconds to sleep
	 * @returns A CancellableHandle that resolves after the specified delay, or can be cancelled independently of the parent token
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
	 * Creates a cancellable animation frame.
	 * Uses requestAnimationFrame if available, otherwise falls back to setTimeout.
	 * The handle will be rejected if the token is cancelled before the frame callback.
	 *
	 * @returns A CancellableHandle that resolves on the next animation frame, or can be cancelled independently of the parent token
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
	 * Creates a cancellable delay using a custom scheduling function.
	 * The scheduling function receives a callback to invoke when the delay completes,
	 * and must return a cleanup function to cancel the scheduled operation.
	 *
	 * The delay will stop when:
	 * - The parent token is cancelled
	 * - The returned handle is cancelled
	 *
	 * @param schedule - Function that schedules the delay and returns a cleanup function
	 * @returns A CancellableHandle that resolves when the delay completes, or can be cancelled independently of the parent token
	 *
	 * @example
	 * ```typescript
	 * // Custom delay using setTimeout
	 * await token.delay((done) => {
	 *   const timer = setTimeout(done, 1000);
	 *   return () => clearTimeout(timer);
	 * });
	 *
	 * // Cancel independently
	 * const handle = token.delay((done) => {
	 *   const timer = setTimeout(done, 5000);
	 *   return () => clearTimeout(timer);
	 * });
	 * handle.cancel();
	 * ```
	 */
	delay(schedule: (done: () => void) => () => void) {
		const abortController = new AbortController();
		const handle = new CancellableHandle<void>(
			abortController,
			this.name ? `${this.name}>delay.handle` : "delay.handle",
		);

		if (this.isCancelled()) {
			handle.reject(this.rejectionError());
			return handle;
		}

		const onParentAbort = () => {
			handle.cancel(this.currentCancelError());
		};

		const onHandleAbort = () => {
			cancelScheduled();
			this.signal.removeEventListener("abort", onParentAbort);
			if (!handle.isSettled) {
				const reason = handle.signal.reason;
				handle.reject(
					reason instanceof CancelError
						? reason.withRejectionSite()
						: CancelError.fromReason(
								"delay cancelled",
								reason,
							).withRejectionSite(),
				);
			}
		};

		const cancelScheduled = schedule(() => {
			this.signal.removeEventListener("abort", onParentAbort);
			handle.signal.removeEventListener("abort", onHandleAbort);
			if (handle.isSettled) {
				return;
			}
			if (this.isCancelled()) {
				handle.reject(this.rejectionError());
			} else {
				handle.resolve();
			}
		});

		this.signal.addEventListener("abort", onParentAbort);
		handle.signal.addEventListener("abort", onHandleAbort);

		return handle;
	}

	/**
	 * Executes a function repeatedly at a specified interval until cancelled.
	 * The function can be synchronous or asynchronous. Each execution waits for the
	 * previous one to complete before scheduling the next interval delay.
	 *
	 * The interval will stop when:
	 * - The parent token is cancelled
	 * - The returned handle is cancelled
	 * - The function throws an error (non-CancelError errors are wrapped)
	 *
	 * @param fn - The function to execute at each interval. Can return a Promise for async operations.
	 * @param interval - The interval in milliseconds to wait between executions (after each execution completes)
	 * @returns A CancellableHandle that can be used to cancel the interval independently of the parent token
	 *
	 * @example
	 * ```typescript
	 * // Poll an API every 5 seconds
	 * const handle = token.interval(async () => {
	 *   const data = await fetchData();
	 *   processData(data);
	 * }, 5000);
	 *
	 * // Cancel the interval independently
	 * handle.cancel();
	 * ```
	 */
	interval(fn: () => void | Promise<void>, interval: number) {
		const abortController = new AbortController();
		const handle = new CancellableHandle<void>(
			abortController,
			this.name ? `${this.name}>interval.handle` : "interval.handle",
		);

		(async () => {
			try {
				while (!this.isCancelled() && !handle.isCancelled()) {
					await fn();
					if (this.isCancelled() || handle.isCancelled()) {
						break;
					}
					await this.sleep(interval);
				}
				if (!handle.isSettled) {
					const error =
						this.cancelError ??
						CancelError.fromReason("interval stopped", undefined);
					handle.cancel(error);
					handle.reject(error.withRejectionSite());
				}
			} catch (error) {
				if (!handle.isSettled) {
					const cancelError =
						error instanceof CancelError
							? error
							: CancelError.fromReason("interval error", error);
					handle.cancel(cancelError);
					handle.reject(cancelError.withRejectionSite());
				}
			}
		})();

		return handle;
	}

	/**
	 * Throws a CancelError if the token has been cancelled.
	 * Useful for checking cancellation status at specific points in async operations.
	 *
	 * @throws {CancelError} If the token has been cancelled
	 */
	throwIfCancelled() {
		if (this.isCancelled()) {
			throw this.rejectionError();
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
	onCancel(callback: (error: CancelError) => void) {
		const listener = () => {
			callback(this.currentCancelError());
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

	private syncCancelError(reason: unknown) {
		this.cancelError = CancelError.fromReason(
			formatCancelMessage(this.name, reason),
			reason,
		);
	}

	private currentCancelError(): CancelError {
		if (!this.cancelError) {
			this.syncCancelError(this.signal.reason);
		}
		return this.cancelError as CancelError;
	}

	private rejectionError() {
		return this.currentCancelError().withRejectionSite();
	}
}

function formatCancelMessage(name: string | undefined, reason: unknown) {
	const label = name?.trim() ? `[${name}]` : "[cancellable]";
	if (typeof reason === "string" && reason.trim()) {
		return `${label} cancelled: ${reason}`;
	}
	if (reason instanceof Error && reason.message.trim()) {
		return `${label} cancelled: ${reason.message}`;
	}
	return `${label} cancelled`;
}
