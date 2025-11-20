// Note: This is a simplified version of the IStorage interface based on the usage in the project.
export type IStorage<T> = {
    readonly length: Promise<number>;
    clear(): Promise<void>;
    getItem(key: string): Promise<T | null>;
    key(index: number): Promise<string | null>;
    removeItem(key: string): Promise<void>;
    setItem(key: string, value: T): Promise<void>;
};


/**
 * TODO: [☹️] Unite with `PromptbookStorage` and move to `/src/...`
 */