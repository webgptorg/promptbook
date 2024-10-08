/**
 * This error indicates that the promptbook can not retrieve knowledge from external sources
 *
 * @public exported from `@promptbook/core`
 */
export class KnowledgeScrapeError extends Error {
    public readonly name = 'KnowledgeScrapeError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, KnowledgeScrapeError.prototype);
    }
}
