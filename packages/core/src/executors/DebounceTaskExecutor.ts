import { AsyncTask } from "../cancellable/AsyncTask";
import { CancelError } from "../cancellable/CancelError";
import { CancellableToken } from "../cancellable/CancellableToken";
import { noop } from "../utils/noop";
import { BaseTaskExecutor } from "./BaseTaskExecutor";
import {
	matchesCancelRequest,
	NormalizedTaskCancelRequest,
	ResolvedTaskOptions,
	resolveTaskOptions,
	TaskOptions,
} from "./ITaskExecutor";
import { TaskHandle } from "./TaskHandle";

export interface DebounceOptions {
	leading?: boolean;
	trailing?: boolean;
	maxWait?: number;
}

/**
 * A task executor that delays invoking a task until after `wait` milliseconds have elapsed
 * since the last time a task was submitted. Useful for rate-limiting execution of tasks.
 *
 * @param wait - Milliseconds to delay invocation after the last `exec()` call.
 * @param options - Additional configuration options.
 * @param options.leading - Invoke on the leading edge (first call). Default `false`.
 * @param options.trailing - Invoke on the trailing edge (after silence). Default `true`.
 * @param options.maxWait - Maximum time a task can be delayed before forced invocation.
 */
export class DebounceTaskExecutor extends BaseTaskExecutor {
	private readonly leading: boolean;
	private readonly trailing: boolean;
	private readonly maxWait: number | undefined;
	private readonly maxing: boolean;

	private timerId: ReturnType<typeof setTimeout> | undefined;
	private lastCallTime: number | undefined;
	private lastInvokeTime = 0;

	private pendingTask: AsyncTask<unknown> | undefined;
	private pendingHandle: TaskHandle<unknown> | undefined;
	private pendingOptions: ResolvedTaskOptions | undefined;
	private currentOptions: ResolvedTaskOptions | undefined;
	private currentHandle: TaskHandle<unknown> | undefined;

	constructor(
		private readonly wait: number,
		options?: DebounceOptions,
	) {
		super();
		this.leading = options?.leading ?? false;
		this.trailing = options?.trailing ?? true;
		this.maxWait =
			options?.maxWait !== undefined
				? Math.max(options.maxWait, wait)
				: undefined;
		this.maxing = this.maxWait !== undefined;
	}

	exec<T>(task: AsyncTask<T>, options?: TaskOptions): TaskHandle<T> {
		this.checkShutdown("Debounce executor permanently shut down");

		const time = Date.now();
		const isInvoking = this.shouldInvoke(time);

		this.supersedePending();

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
		handle.catch(noop);

		this.pendingTask = task as AsyncTask<unknown>;
		this.pendingHandle = handle as TaskHandle<unknown>;
		this.pendingOptions = resolvedOptions;
		this.lastCallTime = time;

		if (isInvoking) {
			if (this.timerId === undefined) {
				this.leadingEdge(time);
				return handle;
			}
			if (this.maxing) {
				this.clearTimer();
				this.startTimer();
				this.invoke(time);
				return handle;
			}
		}

		if (this.timerId === undefined) {
			this.startTimer();
		}

		return handle;
	}

	protected onCancelAll(reason?: unknown): void {
		this.clearTimer();
		this.supersedePending();
		if (this.currentHandle) {
			this.currentHandle.cancel(CancelError.fromReason("Cancelled", reason));
			this.currentHandle.reject(CancelError.fromReason("Cancelled", reason));
			this.currentHandle = undefined;
		}
		this.lastInvokeTime = 0;
		this.lastCallTime = undefined;
		this.currentOptions = undefined;
	}

	protected cancelFiltered(request: NormalizedTaskCancelRequest): void {
		let matched = false;
		const cancelError = CancelError.fromReason(
			"Task cancelled",
			request.reason,
		);

		if (
			this.pendingTask &&
			matchesCancelRequest(this.pendingOptions, request)
		) {
			matched = true;
			this.rejectPending(cancelError);
		}

		if (
			this.currentHandle &&
			matchesCancelRequest(this.currentOptions, request)
		) {
			matched = true;
			this.currentHandle.cancel(cancelError);
			this.currentHandle.reject(cancelError);
			this.currentHandle = undefined;
			this.currentOptions = undefined;
		}

		if (!matched) {
			super.cancelFiltered(request);
		}
	}

	flush() {
		if (this.timerId !== undefined) {
			this.trailingEdge(Date.now());
		}
	}

	get pending(): boolean {
		return this.pendingTask !== undefined;
	}

	// --------------- internal ---------------

	private shouldInvoke(time: number): boolean {
		const timeSinceLastCall =
			this.lastCallTime !== undefined ? time - this.lastCallTime : undefined;
		const timeSinceLastInvoke = time - this.lastInvokeTime;

		return (
			this.lastCallTime === undefined ||
			timeSinceLastCall! >= this.wait ||
			timeSinceLastCall! < 0 ||
			(this.maxing && timeSinceLastInvoke >= this.maxWait!)
		);
	}

	private leadingEdge(time: number) {
		this.lastInvokeTime = time;
		this.startTimer();

		if (this.leading) {
			this.invoke(time);
		}
	}

	private trailingEdge(time: number) {
		this.clearTimer();

		if (this.trailing && this.pendingTask) {
			this.invoke(time);
		} else {
			this.supersedePending();
		}
	}

	private timerExpired() {
		const time = Date.now();
		if (this.shouldInvoke(time)) {
			this.trailingEdge(time);
			return;
		}
		this.timerId = setTimeout(
			() => this.timerExpired(),
			this.remainingWait(time),
		);
	}

	private remainingWait(time: number): number {
		const timeSinceLastCall =
			this.lastCallTime !== undefined ? time - this.lastCallTime : 0;
		const timeSinceLastInvoke = time - this.lastInvokeTime;
		const timeWaiting = this.wait - timeSinceLastCall;

		return this.maxing
			? Math.min(timeWaiting, this.maxWait! - timeSinceLastInvoke)
			: timeWaiting;
	}

	private startTimer() {
		this.timerId = setTimeout(() => this.timerExpired(), this.wait);
	}

	private clearTimer() {
		if (this.timerId !== undefined) {
			clearTimeout(this.timerId);
			this.timerId = undefined;
		}
	}

	private invoke(time: number) {
		this.lastInvokeTime = time;
		const task = this.pendingTask;
		const handle = this.pendingHandle;
		const options = this.pendingOptions;
		this.pendingTask = undefined;
		this.pendingHandle = undefined;
		this.pendingOptions = undefined;

		if (!task || !handle || handle.isSettled) return;

		const token = new CancellableToken(
			handle.signal,
			options?.name ?? options?.kind,
		);
		this.currentHandle = handle;
		this.currentOptions = options;

		task(token)
			.then(
				(result) => handle.resolve(result),
				(error) => handle.reject(error),
			)
			.finally(() => {
				if (this.currentHandle === handle) {
					this.currentHandle = undefined;
				}
				this.currentOptions = undefined;
			});
	}

	private supersedePending() {
		if (this.pendingTask) {
			this.rejectPending(CancelError.fromReason("Task superseded", undefined));
		}
	}

	private rejectPending(error: CancelError) {
		if (this.pendingHandle && !this.pendingHandle.isSettled) {
			this.pendingHandle.reject(error);
		}
		this.pendingTask = undefined;
		this.pendingHandle = undefined;
		this.pendingOptions = undefined;
	}
}
