import { getGroupedCommitmentDefinitions } from '@promptbook-local/core';
import { NextRequest, NextResponse } from 'next/server';
import spaceTrim from 'spacetrim';
import { keepUnused } from '../../../../../../../src/utils/organization/keepUnused';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
    keepUnused(request);

    const groupedCommitments = getGroupedCommitmentDefinitions();

    const content = spaceTrim(
        (block) => `
            # Promptbook Documentation

            Promptbook is a language for defining AI agents. It is based on Markdown and uses a set of commitments to define the behavior of the agent.

            ## Commitments

            The following commands (commitments) are available in Promptbook:

            ${block(
                groupedCommitments
                    .map(({ primary, aliases }) => {
                        const title = primary.type;
                        const description = primary.description;
                        const documentation = primary.documentation;
                        const aliasList = aliases.length > 0 ? `**Aliases:** ${aliases.join(', ')}` : '';

                        return spaceTrim(
                            (block) => `
                                ### ${title}

                                ${description}

                                ${aliasList}

                                #### Usage

                                ${block(getSafeCodeBlock(documentation))}
                            `,
                        );
                    })
                    .join('\n\n'),
            )}
        `,
    );

    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
        },
    });
}

function getSafeCodeBlock(content: string, lang = 'markdown'): string {
    const maxBackticks = Math.max(0, ...(content.match(/`+/g) || []).map((match) => match.length));
    const fence = '`'.repeat(Math.max(3, maxBackticks + 1));
    return `${fence}${lang}\n${content}\n${fence}`;
}
