import { UnexpectedError } from '../errors/UnexpectedError';
import { string_javascript_name } from '../types/typeAliases';
import { $getGlobalScope } from './environment/$getGlobalScope';
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
 * Note: `$` is used to indicate that this function is not a pure function - it accesses and adds variables in global scope.
 *
 * @private internal utility, exported are only signleton instances of this class
 */
export class $Register<TRegistered extends Registered> {
    private readonly storage: Array<TRegistered>;

    constructor(private readonly storageName: string_javascript_name) {
        storageName = `_promptbook_${storageName}`;

        const globalScope = $getGlobalScope();

        if (globalScope[storageName] === undefined) {
            globalScope[storageName] = [];
        } else if (!Array.isArray(globalScope[storageName])) {
            throw new UnexpectedError(
                `Expected (global) ${storageName} to be an array, but got ${typeof globalScope[storageName]}`,
            );
        }

        this.storage = globalScope[storageName];
    }

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
            console.warn(`[📦] Registering \`${packageName}.${className}\` to \`${this.storageName}\``);
            this.storage.push(registered);
        } else {
            console.warn(`[📦] Re-registering \`${packageName}.${className}\` to \`${this.storageName}\``);
            this.storage[existingRegistrationIndex] = registered;
        }
    }
}
