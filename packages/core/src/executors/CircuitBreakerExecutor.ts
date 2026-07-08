import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { BaseTaskExecutor } from "./BaseTaskExecutor";
import {
	matchesCancelRequest,
	NormalizedTaskCancelRequest,
	ResolvedTaskOptions,
	resolveTaskOptions,
	TaskOptions,
} from "./ITaskExecutor";
import { TaskHandle } from "./TaskHandle";

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
export class CircuitBreakerExecutor extends BaseTaskExecutor {
	private state: CircuitState = "CLOSED";
	private failureCount = 0;
	private successCount = 0;
	private nextAttempt = 0;
	private readonly running = new Map<
		TaskHandle<unknown>,
		{ options?: ResolvedTaskOptions }
	>();

	private readonly failureThreshold: number;
	private readonly resetTimeout: number;
	private readonly halfOpenRequests: number;

	constructor(options: CircuitBreakerOptions) {
		super();
		this.failureThreshold = options.failureThreshold;
		this.resetTimeout = options.resetTimeout;
		this.halfOpenRequests = options.halfOpenRequests ?? 1;
	}

	exec<T>(task: AsyncTask<T>, options?: TaskOptions): TaskHandle<T> {
		this.checkShutdown("Circuit breaker executor permanently shut down");

		const resolvedOptions = resolveTaskOptions(options);
		const handle = new TaskHandle<T>(
			new AbortController(),
			resolvedOptions.name ?? resolvedOptions.kind,
		);
		handle.signal.addEventListener(
			"abort",
			() => {
				handle.reject(
					CancelError.fromReason("Task cancelled", handle.signal.reason),
				);
			},
			{ once: true },
		);

		// Check if we should transition from OPEN to HALF_OPEN
		if (this.state === "OPEN" && Date.now() >= this.nextAttempt) {
			this.state = "HALF_OPEN";
			this.successCount = 0;
		}

		// Fail fast if circuit is open
		if (this.state === "OPEN") {
			handle.reject(
				new Error(
					`Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttempt).toISOString()}`,
				),
			);
			return handle;
		}

		void this.runTask(
			task as AsyncTask<unknown>,
			handle as TaskHandle<unknown>,
			resolvedOptions,
		);

		return handle;
	}

	/**
	 * Hook called when executor tasks are cancelled.
	 * Aborts the currently executing task if any.
	 */
	protected onCancelAll(reason?: unknown): void {
		const error = CancelError.fromReason(
			"Circuit breaker executor cancelled",
			reason,
		);
		for (const [handle] of this.running) {
			handle.cancel(error);
			handle.reject(error);
		}
	}

	protected cancelFiltered(request: NormalizedTaskCancelRequest): void {
		let cancelled = 0;

		for (const [handle, running] of this.running) {
			if (matchesCancelRequest(running.options, request)) {
				cancelled++;
				handle.cancel(request.reason);
				handle.reject(CancelError.fromReason("Task cancelled", request.reason));
			}
		}

		if (cancelled > 0) {
			return;
		}

		super.cancelFiltered(request);
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

	private async runTask(
		task: AsyncTask<unknown>,
		handle: TaskHandle<unknown>,
		options: ResolvedTaskOptions,
	): Promise<void> {
		const token = new CancellableToken(
			handle.signal,
			options.name ?? options.kind,
		);
		this.running.set(handle, { options });

		try {
			const result = await task(token);
			this.onSuccess();
			handle.resolve(result);
		} catch (error) {
			this.onFailure();
			handle.reject(error);
		} finally {
			this.running.delete(handle);
		}
	}
}
