import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';
import type { string_knowledge_source_content } from '../../../types/typeAliases';
import type { string_name } from '../../../types/typeAliases';

/**
 * Creates unique name for the source
 *
 * @private within the repository
 */
export function sourceContentToName(sourceContent: string_knowledge_source_content): string_name {
    const hash = sha256(hexEncoder.parse(JSON.stringify(sourceContent)))
        //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
        .toString(/* hex */)
        .substring(0, 20);
    //    <- TODO: [🥬] Make some system for hashes and ids of promptbook
    const semanticName = normalizeToKebabCase(sourceContent.substring(0, 20));

    const pieces = ['source', semanticName, hash].filter((piece) => piece !== '');

    const name = pieces.join('-').split('--').join('-');
    // <- TODO: Use MAX_FILENAME_LENGTH

    return name;
}

/**
 * TODO: [🐱‍🐉][🧠] Make some smart crop NOT source-i-m-pavol-a-develop-... BUT source-i-m-pavol-a-developer-...
 */
