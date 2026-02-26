import { CancellableToken } from "./CancellableToken";

export type AsyncTask<T> = (token: CancellableToken) => Promise<T>;
