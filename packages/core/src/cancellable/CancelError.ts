/**
 * Error thrown when a cancellable task is cancelled.
 * Extends the standard Error class with an additional reason property.
 */
export class CancelError extends Error {
	/**
	 * Creates a new CancelError instance.
	 * @param message - The error message
	 * @param reason - The reason for cancellation
	 */
	constructor(
		message: string,
		public readonly reason: unknown,
	) {
		super(message);
		this.name = "CancelError";
	}
}
