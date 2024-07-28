import type { string_name } from '../../types/typeAliases';
import { just } from '../../utils/organization/just';

export async function isDomainNameFree(name: string_name): Promise<boolean> {
    just(name);
    return false;
}

/**
 * TODO: [🍓][🧠] Test and implement `isDomainNameFree`
 * TODO: Export via some (and probably new) NPM package
 */
