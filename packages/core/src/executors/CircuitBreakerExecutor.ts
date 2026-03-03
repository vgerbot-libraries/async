import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { ITaskExecutor } from "./ITaskExecutor";

/**
 * Circuit breaker states.
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Configuration options for CircuitBreakerExecutor.
 */
export interface CircuitBreakerOptions {
	/** Number of consecutive failures before opening the circuit */
	failureThreshold: number;
	/** Time in milliseconds to wait before attempting recovery (OPEN -> HALF_OPEN) */
	resetTimeout: number;
	/** Number of successful requests needed in HALF_OPEN to close circuit. Default: 1 */
	halfOpenRequests?: number;
}

/**
 * A task executor implementing the circuit breaker pattern.
 * Prevents cascading failures by failing fast when a service is unavailable.
 *
 * States:
 * - CLOSED: Normal operation
 * - OPEN: Service unavailable, fail immediately
 * - HALF_OPEN: Testing recovery, allow limited requests
 *
 * @example
 * ```ts
 * const executor = new CircuitBreakerExecutor({
 *   failureThreshold: 3,
 *   resetTimeout: 5000,
 *   halfOpenRequests: 2,
 * });
 *
 * try {
 *   await executor.exec(async () => {
 *     return await fetch('/api/data');
 *   });
 * } catch (error) {
 *   if (executor.getState() === 'OPEN') {
 *     console.log('Circuit is open, service unavailable');
 *   }
 * }
 * ```
 */
export class CircuitBreakerExecutor implements ITaskExecutor {
	private state: CircuitState = "CLOSED";
	private failureCount = 0;
	private successCount = 0;
	private nextAttempt = 0;
	private abortController: AbortController | undefined;

	private readonly failureThreshold: number;
	private readonly resetTimeout: number;
	private readonly halfOpenRequests: number;

	constructor(options: CircuitBreakerOptions) {
		this.failureThreshold = options.failureThreshold;
		this.resetTimeout = options.resetTimeout;
		this.halfOpenRequests = options.halfOpenRequests ?? 1;
	}

	async exec<T>(task: AsyncTask<T>): Promise<T> {
		if (this.isCancelled()) {
			throw CancelError.fromReason(
				"Circuit breaker cancelled",
				this.abortController?.signal.reason,
			);
		}

		// Check if we should transition from OPEN to HALF_OPEN
		if (this.state === "OPEN" && Date.now() >= this.nextAttempt) {
			this.state = "HALF_OPEN";
			this.successCount = 0;
		}

		// Fail fast if circuit is open
		if (this.state === "OPEN") {
			throw new Error(
				`Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttempt).toISOString()}`,
			);
		}

		this.abortController = new AbortController();
		const token = new CancellableToken(this.abortController.signal);

		try {
			const result = await task(token);
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	cancel(reason?: unknown) {
		if (!this.abortController) {
			this.abortController = new AbortController();
		}
		this.abortController.abort(reason);
	}

	isCancelled(): boolean {
		return this.abortController?.signal.aborted ?? false;
	}

	/**
	 * Returns the current state of the circuit breaker.
	 */
	getState(): CircuitState {
		return this.state;
	}

	/**
	 * Manually reset the circuit breaker to CLOSED state.
	 */
	reset(): void {
		this.state = "CLOSED";
		this.failureCount = 0;
		this.successCount = 0;
		this.nextAttempt = 0;
	}

	private onSuccess(): void {
		this.failureCount = 0;

		if (this.state === "HALF_OPEN") {
			this.successCount++;
			if (this.successCount >= this.halfOpenRequests) {
				this.state = "CLOSED";
				this.successCount = 0;
			}
		}
	}

	private onFailure(): void {
		this.failureCount++;

		if (this.state === "HALF_OPEN") {
			// Failure in HALF_OPEN immediately reopens circuit
			this.state = "OPEN";
			this.nextAttempt = Date.now() + this.resetTimeout;
			this.successCount = 0;
		} else if (this.failureCount >= this.failureThreshold) {
			// Too many failures in CLOSED state
			this.state = "OPEN";
			this.nextAttempt = Date.now() + this.resetTimeout;
		}
	}
}
