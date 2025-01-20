import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import type { string_knowledge_source_content, string_name } from '../../../types/typeAliases';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';

/**
 * Creates unique name for the source
 *
 * @public exported from `@promptbook/editable`
 */
export function knowledgeSourceContentToName(sourceContent: string_knowledge_source_content): string_name {
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
