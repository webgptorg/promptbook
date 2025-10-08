import { type IDestroyable } from 'destroyable';
import { DEFAULT_IS_VERBOSE } from '../../config';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { string_name } from '../../types/typeAliases';
import { $getGlobalScope } from '../environment/$getGlobalScope';
import { normalizeTo_snake_case } from '../normalization/normalizeTo_snake_case';
import type { TODO_string } from '../organization/TODO_string';

/**
 * Represents an entity in a global registry.
 * Contains identifying information about the package and class.
 */
export type Registered = {
    /**
     * The name of the package where the registered entity is defined.
     */
    readonly packageName: TODO_string;

    /**
     * The name of the class being registered.
     */
    readonly className: TODO_string;
};

/**
 * Represents a registration record, including destroyable interface and registry name.
 */
export type Registration = Registered &
    IDestroyable & {
        /**
         * The name of the register this entity is registered in.
         */
        readonly registerName: string_name;
    };

/**
 * Global registry for storing and managing registered entities of a given type.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it accesses and adds variables in global scope.
 *
 * @private internal utility, exported are only singleton instances of this class
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

    public list(): ReadonlyArray<TRegistered> {
        // <- TODO: ReadonlyDeep<ReadonlyArray<TRegistered>>
        return this.storage;
    }

    public register(registered: TRegistered): Registration {
        const { packageName, className } = registered;

        const existingRegistrationIndex = this.storage.findIndex(
            (item) => item.packageName === packageName && item.className === className,
        );
        const existingRegistration = this.storage[existingRegistrationIndex];

        if (!existingRegistration) {
            if (DEFAULT_IS_VERBOSE) {
                console.info(`[📦] Registering \`${packageName}.${className}\` to \`${this.registerName}\``);
            }
            this.storage.push(registered);
        } else {
            if (DEFAULT_IS_VERBOSE) {
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
