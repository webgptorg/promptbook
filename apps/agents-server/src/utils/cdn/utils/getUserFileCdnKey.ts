import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import type { string_uri } from '../../../../../../src/types/typeAliases';
import { titleToName } from '../../../../../../src/utils/normalization/titleToName';

/**
 * Generates a content-addressed path for user-uploaded files.
 *
 * The returned key uses the SHA-256 hash of the file buffer so the URL is
 * unguessable and does not expose internal storage structure (bucket, prefix,
 * or upload directory). The first two hex characters are used as single-level
 * shard directories, matching the same convention as the public URL served by
 * the hash-based file route.
 */
export function getUserFileCdnKey(file: Buffer, originalFilename: string): string_uri {
    const hash = sha256(hexEncoder.parse(file.toString('hex'))).toString(/* hex */);
    //    <- TODO: [🥬] Encapsulate sha256 to some private utility function

    const originalFilenameParts = originalFilename.split('.');
    const extension = originalFilenameParts.pop();
    const name = titleToName(originalFilenameParts.join('.'));

    const filename = name + '.' + extension;
    // <- Note: [⛳️] Preserving original file name

    // [✨🏣] Hash-based key: {hash[0]}/{hash[1]}/{fullHash}/{filename}
    // The single-char shard dirs and full hash hide the internal S3 structure.
    return `${hash[0]}/${hash[1]}/${hash}/${filename}`;
}

// TODO: [🌍] Unite this logic in one place
// TODO: Way to garbage unused uploaded files
// TODO: Probably separate util countBufferHash
