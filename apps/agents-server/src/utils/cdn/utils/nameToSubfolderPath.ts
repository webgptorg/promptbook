import type { string_name } from '../../../../../../src/types/typeAliases';

export function nameToSubfolderPath(name: string_name): Array<string> {
    return [name.substr(0, 1).toLowerCase(), name.substr(1, 1).toLowerCase()];
}


/**
 * TODO: !!! Use `nameToSubfolderPath` from src
 */