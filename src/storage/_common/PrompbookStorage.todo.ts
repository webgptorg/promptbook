TODO: Maybe add few methods:

-----

export type PrompbookStorage<T> = {

    /**
     * Returns the number of key/value pairs currently present in the list associated with the object.
     */
    readonly length: Promisable<number>;


    /**
     * Empties the list associated with the object of all key/value pairs, if there are any.
     */
    clear(): Promisable<void>;

    /**
     * Returns the name of the nth key in the list, or null if n is greater than or equal to the number of key/value pairs in the object.
     */
    key(index: number): Promisable<string | null>;


};
