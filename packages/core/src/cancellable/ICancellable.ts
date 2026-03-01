export interface ICancellable {
	cancel(reason?: unknown): void;

	isCancelled(): boolean;
}
