import { CancellableHandle } from "../cancellable/CancellableHandle";

/**
 * Handle returned by task executors.
 * Extends cancellable capabilities with the same Promise-like behavior.
 */
export class TaskHandle<T> extends CancellableHandle<T> {}
