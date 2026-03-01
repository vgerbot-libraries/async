/**
 * Error thrown when a cancellable task is cancelled.
 * Extends the standard Error class with an additional reason property.
 */
export class CancelError extends Error {
	public readonly rawReason: unknown;
	public readonly rejectionStack?: string;

	constructor(message: string, rawReason: unknown, rejectionStack?: string) {
		super(message);
		this.name = "CancelError";
		this.rawReason = rawReason;
		this.rejectionStack = rejectionStack;
		if (rawReason instanceof Error) {
			(this as Error & { cause?: unknown }).cause = rawReason;
		}
		this.stack = this.buildStack();
	}

	get reason() {
		return this.rawReason;
	}

	get reasonStack(): string | undefined {
		return this.rawReason instanceof Error ? this.rawReason.stack : undefined;
	}

	static fromReason(message: string, rawReason: unknown): CancelError {
		return rawReason instanceof CancelError
			? rawReason
			: new CancelError(message, rawReason);
	}

	withRejectionSite(stack?: string): CancelError {
		return new CancelError(
			this.message,
			this.rawReason,
			stack ?? new Error("Cancel rejection boundary").stack ?? "",
		);
	}

	private buildStack() {
		let result = this.stack ?? "";
		if (this.rejectionStack) {
			result += `\n\n--- Cancellation rejection site ---\n${this.rejectionStack}`;
		}
		if (this.reasonStack) {
			result += `\n\n--- Cancellation raw reason stack ---\n${this.reasonStack}`;
		} else if (this.rawReason !== undefined) {
			result += `\n\n--- Cancellation raw reason ---\n${stringifyReason(this.rawReason)}`;
		}
		return result;
	}
}

function stringifyReason(reason: unknown): string {
	if (typeof reason === "string") return reason;
	try {
		return JSON.stringify(reason);
	} catch {
		return String(reason);
	}
}
