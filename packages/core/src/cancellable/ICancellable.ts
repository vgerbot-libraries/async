export interface ICancellable {
	cancel(reason?: string | Error): void;

	isCancelled(): boolean;
}
