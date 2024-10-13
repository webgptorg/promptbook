import { type IDestroyable } from 'destroyable';
import { IS_VERBOSE } from '../config';
import { NotYetImplementedError } from '../errors/NotYetImplementedError';
import { UnexpectedError } from '../errors/UnexpectedError';
import type { string_name } from '../types/typeAliases';
import { $getGlobalScope } from './environment/$getGlobalScope';
import { normalizeTo_snake_case } from './normalization/normalizeTo_snake_case';
import type { TODO_string } from './organization/TODO_string';

/**
 * @@@
 */
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
 * @@@
 */
export type Registration = Registered &
    IDestroyable & {
        /**
         * @@@
         */
        registerName: string_name;
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

    constructor(private readonly registerName: string_name) {
        const storageName = `_promptbook_${normalizeTo_snake_case(registerName)}`;

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

    public register(registered: TRegistered): Registration {
        const { packageName, className } = registered;

        const existingRegistrationIndex = this.storage.findIndex(
            (item) => item.packageName === packageName && item.className === className,
        );
        const existingRegistration = this.storage[existingRegistrationIndex];

        if (!existingRegistration) {
            if (IS_VERBOSE) {
                console.warn(`[📦] Registering \`${packageName}.${className}\` to \`${this.registerName}\``);
            }
            this.storage.push(registered);
        } else {
            if (IS_VERBOSE) {
                console.warn(`[📦] Re-registering \`${packageName}.${className}\` to \`${this.registerName}\``);
            }
            this.storage[existingRegistrationIndex] = registered;
        }

        return {
            registerName: this.registerName,
            packageName,
            className,
            get isDestroyed() {
                return false;
            },
            destroy() {
                throw new NotYetImplementedError(
                    `Registration to ${this.registerName} is permanent in this version of Promptbook`,
                );
            },
        };
    }
}
