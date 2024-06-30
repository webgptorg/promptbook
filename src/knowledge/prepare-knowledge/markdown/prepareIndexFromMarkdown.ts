import type { ExecutionTools } from '../../../execution/ExecutionTools';
import type { string_href } from '../../../types/typeAliases';
import { just } from '../../../utils/just';

export async function prepareIndexFromMarkdown(options: { tools: ExecutionTools }): Promise<{
    indexes: Array<{
        title: string;
        content: string;
        href: string_href;
    }>;
}> {
    const { tools } = options;

    just(tools);

    return {
        indexes: [],
    };
}
