import type { Promisable } from 'type-fest';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import type { SearchEngine } from '../SearchEngine';
import type { SearchResult } from '../SearchResult';

/**
 * @@@
 *
 * @private <- TODO: !!!! Export via some package, maybe `@promptbook/search-engines` or `@promptbook/fake-llm`
 */
export class DummySearchEngine implements SearchEngine {
    public get title(): string_title & string_markdown_text {
        return 'Dummy Search Engine';
    }

    public get description(): string_markdown {
        return 'A dummy search engine that returns fixed results';
    }

    public checkConfiguration(): Promisable<void> {
        return;
    }

    public async search(query: string): Promise<SearchResult[]> {
        return [
            {
                title: 'Dummy Result 1 for ' + query,
                url: 'https://example.com/1',
                snippet: 'This is a dummy result 1.',
            },
            {
                title: 'Dummy Result 2 for ' + query,
                url: 'https://example.com/2',
                snippet: 'This is a dummy result 2.',
            },
        ];
    }
}
