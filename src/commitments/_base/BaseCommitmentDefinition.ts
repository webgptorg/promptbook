import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createCommitmentRegex, createCommitmentTypeRegex } from '../../book-2.0/agent-source/createCommitmentRegex';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { string_javascript_name } from '../../types/string_person_fullname';
import type { BookCommitment } from './BookCommitment';
import type { CommitmentDefinition } from './CommitmentDefinition';

/**
 * Base implementation of CommitmentDefinition that provides common functionality
 * Most commitments can extend this class and only override the applyToAgentModelRequirements method
 *
 * @private
 */
export abstract class BaseCommitmentDefinition<TBookCommitment extends string> implements CommitmentDefinition {
    public readonly type: TBookCommitment;
    public readonly aliases: string[];

    public constructor(type: TBookCommitment, aliases: string[] = []) {
        this.type = type;
        this.aliases = aliases;
    }

    /**
     * Short one-line markdown description; concise, may use inline **markdown**.
     * Must be implemented by each concrete commitment.
     */
    public abstract get description(): string;

    /**
     * Whether this commitment requires content.
     * If true, regex will match only if there is content after the commitment keyword.
     * If false, regex will match even if there is no content.
     */
    public get requiresContent(): boolean {
        return true;
    }

    /**
     * Icon for this commitment.
     * It should be a single emoji.
     */
    public abstract get icon(): string;

    /**
     * Whether this commitment should be prioritized in menus, documentation, and intellisense.
     */
    public get isImportant(): boolean {
        return false;
    }

    /**
     * Whether this commitment is unfinished and not ready to use.
     */
    public get isUnfinished(): boolean {
        return false;
    }

    /**
     * Whether this commitment is low-level and should be surfaced with caution.
     */
    public get isLowLevel(): boolean {
        return false;
    }

    /**
     * Human-readable markdown documentation for this commitment, available at runtime.
     * Must be implemented by each concrete commitment.
     */
    public abstract get documentation(): string;

    /**
     * Optional UI/docs-only deprecation metadata.
     */
    public get deprecation(): CommitmentDefinition['deprecation'] {
        return undefined;
    }

    /**
     * Creates a regex pattern to match this commitment in agent source
     * Uses the existing createCommitmentRegex function as internal helper
     */
    public createRegex(): RegExp {
        return createCommitmentRegex(
            this.type as BookCommitment,
            this.aliases as BookCommitment[],
            this.requiresContent,
        );
    }

    /**
     * Creates a regex pattern to match just the commitment type
     * Uses the existing createCommitmentTypeRegex function as internal helper
     */
    public createTypeRegex(): RegExp {
        return createCommitmentTypeRegex(this.type as BookCommitment, this.aliases as BookCommitment[]);
    }

    /**
     * Applies this commitment's logic to the agent model requirements
     * This method must be implemented by each specific commitment
     */
    public abstract applyToAgentModelRequirements(
        requirements: AgentModelRequirements,
        content: string,
    ): AgentModelRequirements;

    /**
     * Helper method to create a new requirements object with updated system message
     * This is commonly used by many commitments
     */
    protected updateSystemMessage(
        requirements: AgentModelRequirements,
        messageUpdate: string | ((currentMessage: string) => string),
    ): AgentModelRequirements {
        const newMessage =
            typeof messageUpdate === 'string' ? messageUpdate : messageUpdate(requirements.systemMessage);

        return {
            ...requirements,
            systemMessage: newMessage,
        };
    }

    /**
     * Helper method to append content to the system message
     */
    protected appendToSystemMessage(
        requirements: AgentModelRequirements,
        content: string,
        separator: string = '\n\n',
    ): AgentModelRequirements {
        return this.updateSystemMessage(requirements, (currentMessage) => {
            if (!currentMessage.trim()) {
                return content;
            }
            return currentMessage + separator + content;
        });
    }

    /**
     * Helper method to format one system-message section with an H2 heading.
     *
     * @param title - Section title without markdown prefix.
     * @param content - Section body content.
     * @returns Formatted section text using `##` heading.
     */
    protected createSystemMessageSection(title: string, content: string): string {
        const normalizedTitle = title.trim().replace(/^#+\s*/, '');
        const normalizedContent = content.trim();
        return normalizedContent ? `## ${normalizedTitle}\n${normalizedContent}` : `## ${normalizedTitle}`;
    }

    /**
     * Helper method to create a new requirements object with updated prompt suffix
     */
    protected updatePromptSuffix(
        requirements: AgentModelRequirements,
        contentUpdate: string | ((currentSuffix: string) => string),
    ): AgentModelRequirements {
        const newSuffix = typeof contentUpdate === 'string' ? contentUpdate : contentUpdate(requirements.promptSuffix);

        return {
            ...requirements,
            promptSuffix: newSuffix,
        };
    }

    /**
     * Helper method to append content to the prompt suffix
     * Default separator is a single newline for bullet lists.
     */
    protected appendToPromptSuffix(
        requirements: AgentModelRequirements,
        content: string,
        separator: string = '\n',
    ): AgentModelRequirements {
        return this.updatePromptSuffix(requirements, (currentSuffix) => {
            if (!currentSuffix.trim()) {
                return content;
            }
            return `${currentSuffix}${separator}${content}`;
        });
    }

    /**
     * Helper method to add a comment section to the system message
     * Comments are lines starting with # that will be removed from the final system message
     * but can be useful for organizing and structuring the message during processing
     */
    protected addCommentSection(
        requirements: AgentModelRequirements,
        commentTitle: string,
        content: string,
        position: 'beginning' | 'end' = 'end',
    ): AgentModelRequirements {
        const commentSection = `# ${commentTitle.toUpperCase()}\n${content}`;

        if (position === 'beginning') {
            return this.updateSystemMessage(requirements, (currentMessage) => {
                if (!currentMessage.trim()) {
                    return commentSection;
                }
                return commentSection + '\n\n' + currentMessage;
            });
        } else {
            return this.appendToSystemMessage(requirements, commentSection);
        }
    }

    /**
     * Helper method to append a bullet point to an existing `## SectionTitle` section in the system
     * message, or to create a new section when it does not yet exist.
     *
     * Handles the case where the same commitment type appears multiple times in the book source and
     * all entries should be grouped under one shared heading rather than emitting a duplicate block.
     *
     * @param requirements - Current model requirements.
     * @param sectionTitle - Section title without the `##` prefix.
     * @param bulletContent - Bullet content without the leading `-   ` prefix.
     * @returns Requirements with the bullet appended to the section.
     */
    protected appendBulletPointToSection(
        requirements: AgentModelRequirements,
        sectionTitle: string,
        bulletContent: string,
    ): AgentModelRequirements {
        const sectionHeader = `## ${sectionTitle}`;
        const bullet = `-   ${bulletContent}`;

        if (requirements.systemMessage.includes(sectionHeader)) {
            // Append bullet to end of existing section, before the next h2 heading or end of message
            const newSystemMessage = requirements.systemMessage.replace(
                new RegExp(
                    `(## ${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\n)([\\s\\S]*?)(?=\\n\\n##|$)`,
                ),
                `$1$2\n${bullet}`,
            );
            return { ...requirements, systemMessage: newSystemMessage };
        }

        return this.appendToSystemMessage(requirements, `${sectionHeader}\n\n${bullet}`, '\n\n');
    }

    /**
     * Helper method to replace an existing `## SectionTitle` section in the system message, or to
     * append a new one when the section does not yet exist.
     *
     * Use this when a commitment type can appear multiple times and each subsequent occurrence should
     * update the single shared section rather than appending a duplicate block.
     *
     * @param requirements - Current model requirements.
     * @param sectionTitle - Section title without the `##` prefix.
     * @param sectionContent - Full section content including the `## Title` header line.
     * @returns Requirements with the section replaced or appended.
     */
    protected replaceOrCreateSection(
        requirements: AgentModelRequirements,
        sectionTitle: string,
        sectionContent: string,
    ): AgentModelRequirements {
        const sectionHeader = `## ${sectionTitle}`;

        if (requirements.systemMessage.includes(sectionHeader)) {
            // Replace all text from the heading until the next h2 heading or end of message
            const newSystemMessage = requirements.systemMessage.replace(
                new RegExp(`## ${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=\\n\\n##|$)`),
                sectionContent,
            );
            return { ...requirements, systemMessage: newSystemMessage };
        }

        return this.appendToSystemMessage(requirements, sectionContent, '\n\n');
    }

    /**
     * Gets tool function implementations provided by this commitment
     *
     * When the `applyToAgentModelRequirements` adds tools to the requirements, this method should return the corresponding function definitions.
     */
    public getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {};
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment
     *
     * This is used in the UI to show a user-friendly name instead of the technical function name.
     */
    public getToolTitles(): Record<string_javascript_name, string> {
        return {};
    }
}
