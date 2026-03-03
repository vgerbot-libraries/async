import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { Defer } from "../utils/Defer";
import { ITaskExecutor } from "./ITaskExecutor";

/**
 * Configuration options for RateLimitExecutor.
 */
export interface RateLimitOptions {
	/** Maximum number of requests allowed per time window */
	maxRequests: number;
	/** Time window in milliseconds */
	windowMs: number;
}

/**
 * A task executor that limits the rate of task execution.
 * Enforces a maximum number of requests per time window using a sliding window algorithm.
 *
 * @example
 * ```ts
 * // Allow max 10 requests per second
 * const executor = new RateLimitExecutor(10, 1000);
 *
 * for (let i = 0; i < 20; i++) {
 *   executor.exec(async (token) => {
 *     console.log(`Request ${i}`);
 *     return i;
 *   });
 * }
 * // First 10 execute immediately, next 10 wait for the window to reset
 * ```
 */
export class RateLimitExecutor implements ITaskExecutor {
	private readonly requestTimestamps: number[] = [];
	private readonly maxRequests: number;
	private readonly windowMs: number;
	private abortController: AbortController | undefined;

	constructor(maxRequests: number, windowMs: number) {
		this.maxRequests = maxRequests;
		this.windowMs = windowMs;
	}

	async exec<T>(task: AsyncTask<T>): Promise<T> {
		await this.waitForSlot();

		if (this.isCancelled()) {
			throw CancelError.fromReason(
				"Rate limit executor cancelled",
				this.abortController?.signal.reason,
			);
		}

		this.abortController = new AbortController();
		const token = new CancellableToken(this.abortController.signal);

		try {
			const result = await task(token);
			this.recordRequest();
			return result;
		} catch (error) {
			this.recordRequest();
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

	private async waitForSlot(): Promise<void> {
		while (true) {
			this.cleanOldTimestamps();

			if (this.requestTimestamps.length < this.maxRequests) {
				return;
			}

			// Calculate wait time until oldest request expires
			const oldestTimestamp = this.requestTimestamps[0]!;
			const waitTime = this.windowMs - (Date.now() - oldestTimestamp);

			if (waitTime > 0) {
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		}
	}

	private cleanOldTimestamps(): void {
		const now = Date.now();
		const cutoff = now - this.windowMs;
		while (
			this.requestTimestamps.length > 0 &&
			this.requestTimestamps[0]! < cutoff
		) {
			this.requestTimestamps.shift();
		}
	}

	private recordRequest(): void {
		this.requestTimestamps.push(Date.now());
	}
}
