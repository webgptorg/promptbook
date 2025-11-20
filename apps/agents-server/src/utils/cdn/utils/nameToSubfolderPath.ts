import type { string_name } from '../../../../../../src/types/typeAliases';

export function nameToSubfolderPath(name: string_name): Array<string> {
    return [name.substr(0, 2).toLowerCase(), name.substr(2, 5).toLowerCase()];
}

/**
 * TODO: !!! Use `nameToSubfolderPath` from src
 */
