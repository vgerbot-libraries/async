export class ExecutorShutdownError extends Error {
	public readonly reason: unknown;

	constructor(
		message: string,
		options?: { cause?: unknown; reason?: unknown },
	) {
		super(
			message,
			options?.cause !== undefined ? { cause: options.cause } : undefined,
		);
		this.name = "ExecutorShutdownError";
		this.reason = options?.reason;
	}

	get rawReason(): unknown {
		return this.reason;
	}

	static fromReason(
		message: string,
		rawReason: unknown,
	): ExecutorShutdownError {
		if (rawReason instanceof ExecutorShutdownError) {
			return rawReason;
		}
		return new ExecutorShutdownError(message, {
			cause: rawReason,
			reason: rawReason,
		});
	}
}
