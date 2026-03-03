/**
 * Error thrown when a cancellable task is cancelled.
 *
 */
export class CancelError extends Error {
	public readonly reason: unknown;

	constructor(
		message: string,
		options?: { cause?: unknown; reason?: unknown },
	) {
		super(
			message,
			options?.cause !== undefined ? { cause: options.cause } : undefined,
		);
		this.name = "CancelError";
		this.reason = options?.reason;
	}

	get rawReason(): unknown {
		return this.reason;
	}

	static fromReason(message: string, rawReason: unknown): CancelError {
		if (rawReason instanceof CancelError) {
			return rawReason;
		}
		return new CancelError(message, { cause: rawReason, reason: rawReason });
	}

	withRejectionSite(): CancelError {
		return new CancelError(this.message, {
			cause: this,
			reason: this.reason,
		});
	}
}
