import type { TODO_string } from './organization/TODO_string';

export type Registered = {
    /**
     * @@@
     */
    packageName: TODO_string;

    /**
     * @@@
     */
    className: TODO_string;
};

/**
 * Register is @@@
 *
 * @private internal utility, exported are only signleton instances of this class
 */
export class Register<TRegistered extends Registered> {
    constructor(private readonly storage: Array<TRegistered>) {}

    public list(): Array<TRegistered> {
        // <- TODO: ReadonlyDeep<Array<TRegistered>>
        return this.storage;
    }

    public register(registered: TRegistered): void {
        // !!!!!!                             <- TODO: What to return here
        // TODO: !!!!!! Compare if same is not already registered
        this.storage.push(registered);
    }
}
