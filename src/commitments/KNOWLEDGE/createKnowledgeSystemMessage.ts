import { spaceTrim } from 'spacetrim';
import { KnowledgeToolNames } from './KnowledgeToolNames';

/**
 * Builds the KNOWLEDGE instruction block appended to the system message.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
export function createKnowledgeSystemMessage(knowledgeInfoEntries: ReadonlyArray<string>): string {
    return spaceTrim(
        (block) => `
            ## Knowledge

            -   You can search the configured knowledge base with \`${KnowledgeToolNames.search}\`.
            -   Use the tool whenever the answer may depend on attached documents, uploaded files, or configured URLs.
            -   Base your answer only on the retrieved knowledge snippets and do not invent missing facts.
            -   When relevant, mention which sources you used.
            ${block(
                knowledgeInfoEntries.length === 0
                    ? ''
                    : `-   Available knowledge sources:\n${knowledgeInfoEntries.map((entry) => `    -   ${entry}`).join('\n')}`,
            )}
        `,
    );
}
