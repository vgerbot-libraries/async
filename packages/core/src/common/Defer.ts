/**
 * A modern Deferred Promise implementation that exposes resolve/reject methods.
 * Provides external control over Promise resolution while maintaining Promise semantics.
 */
export class Defer<T> {
	/**
	 * Creates a pre-resolved Defer instance
	 * @param value - The value to resolve with
	 * @returns A resolved Defer instance
	 */
	static resolve<T>(value: T): Defer<T> {
		const defer = new Defer<T>();
		defer.resolve(value);
		return defer;
	}

	/**
	 * Creates a pre-rejected Defer instance
	 * @param reason - The rejection reason
	 * @returns A rejected Defer instance
	 */
	static reject<T>(reason: unknown): Defer<T> {
		const defer = new Defer<T>();
		defer.reject(reason);
		return defer;
	}

	readonly promise: Promise<T>;
	readonly resolve: (value: T | PromiseLike<T>) => void;
	readonly reject: (reason?: unknown) => void;

	#resolveValue?: T;
	#rejectReason?: unknown;
	#isSettled = false;

	/**
	 * Gets the resolved value if the promise was resolved
	 */
	get resolveValue(): T | undefined {
		return this.#resolveValue;
	}

	/**
	 * Gets the rejection reason if the promise was rejected
	 */
	get rejectReason(): unknown {
		return this.#rejectReason;
	}

	/**
	 * Indicates whether the promise has been settled (resolved or rejected)
	 */
	get isSettled(): boolean {
		return this.#isSettled;
	}

	constructor() {
		let resolveFunc!: (value: T | PromiseLike<T>) => void;
		let rejectFunc!: (reason?: unknown) => void;

		this.promise = new Promise<T>((resolve, reject) => {
			resolveFunc = resolve;
			rejectFunc = reject;
		});

		this.resolve = (value: T | PromiseLike<T>): void => {
			if (this.#isSettled) return;
			this.#isSettled = true;
			this.#resolveValue = value as T;
			resolveFunc(value);
		};

		this.reject = (reason?: unknown): void => {
			if (this.#isSettled) return;
			this.#isSettled = true;
			this.#rejectReason = reason;
			rejectFunc(reason);
		};
	}

	/**
	 * Attaches callbacks for the resolution and/or rejection of the Promise
	 * @returns A new Defer instance
	 */
	then<TResult1 = T, TResult2 = never>(
		onfulfilled?:
			| ((value: T) => TResult1 | PromiseLike<TResult1>)
			| undefined
			| null,
		onrejected?:
			| ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
			| undefined
			| null,
	): Defer<TResult1 | TResult2> {
		const defer = new Defer<TResult1 | TResult2>();
		this.promise.then(onfulfilled, onrejected).then(
			(value) => defer.resolve(value),
			(reason) => defer.reject(reason),
		);
		return defer;
	}

	/**
	 * Attaches a callback for only the rejection of the Promise
	 * @returns A new Defer instance
	 */
	catch<TResult = never>(
		onrejected?:
			| ((reason: unknown) => TResult | PromiseLike<TResult>)
			| undefined
			| null,
	): Defer<T | TResult> {
		const defer = new Defer<T | TResult>();
		this.promise.catch(onrejected).then(
			(value) => defer.resolve(value),
			(reason) => defer.reject(reason),
		);
		return defer;
	}

	/**
	 * Attaches a callback that is invoked when the Promise is settled
	 * @returns A new Defer instance
	 */
	finally(onfinally?: (() => void) | undefined | null): Defer<T> {
		const defer = new Defer<T>();
		this.promise.finally(onfinally).then(
			(value) => defer.resolve(value),
			(reason) => defer.reject(reason),
		);
		return defer;
	}
	get [Symbol.toStringTag]() {
		return this.promise[Symbol.toStringTag];
	}
}
