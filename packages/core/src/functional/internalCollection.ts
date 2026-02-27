export type CollectionRecord<T> = Record<string, T>;
export type CollectionInput<T> = T[] | CollectionRecord<T>;

export interface NormalizedCollectionEntry<T> {
	key: number | string;
	value: T;
}

export interface NormalizedCollection<T> {
	entries: NormalizedCollectionEntry<T>[];
	isArray: boolean;
}

export function normalizeCollection<T>(
	collection: CollectionInput<T>,
): NormalizedCollection<T> {
	if (Array.isArray(collection)) {
		return {
			entries: collection.map((value, index) => ({ key: index, value })),
			isArray: true,
		};
	}
	return {
		entries: Object.keys(collection).map((key) => ({
			key,
			value: collection[key] as T,
		})),
		isArray: false,
	};
}
