import type { Promisable } from 'type-fest';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';

/**
 * Optional host-provided resolver for citation display labels.
 *
 * @public exported from `@promptbook/components`
 */
export type CitationLabelResolver = (citation: ParsedCitation) => Promisable<string | null | undefined>;
