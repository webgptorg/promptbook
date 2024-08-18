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
        //                                    <- TODO: What to return here

        const { packageName, className } = registered;

        const existingRegistrationIndex = this.storage.findIndex(
            (item) => item.packageName === packageName && item.className === className,
        );
        const existingRegistration = this.storage[existingRegistrationIndex];

        if (!existingRegistration) {
            console.warn(`[📦] Registering ${packageName}.${className} again`);
            this.storage.push(registered);
        } else {
            console.warn(`[📦] Re-registering ${packageName}.${className} again`);
            this.storage[existingRegistrationIndex] = registered;
        }
    }
}
