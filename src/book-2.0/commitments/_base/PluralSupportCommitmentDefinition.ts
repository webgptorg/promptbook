import type { AgentModelRequirements } from '../../agent-source/AgentModelRequirements';
import { createCommitmentRegex, createCommitmentTypeRegex } from '../../agent-source/createCommitmentRegex';
import type { BookCommitment } from './BookCommitment';
import type { CommitmentDefinition } from './CommitmentDefinition';

/**
 * Base implementation that provides automatic plural support for commitments
 *
 * This class allows commitments to automatically work with both singular and plural forms
 * without duplicating logic. Each commitment can specify its plural form(s) and the system
 * will handle the rest automatically.
 *
 * @private
 */
export abstract class PluralSupportCommitmentDefinition<TBookCommitment extends string> implements CommitmentDefinition {
    public readonly type: TBookCommitment;
    private readonly _primaryType: string;
    private readonly _pluralForms: readonly string[];

    constructor(type: TBookCommitment, primaryType: string, pluralForms: readonly string[] = []) {
        this.type = type;
        this._primaryType = primaryType;
        this._pluralForms = pluralForms;
    }

    /**
     * Short one-line markdown description; concise, may use inline **markdown**.
     * Must be implemented by each concrete commitment.
     */
    abstract get description(): string;

    /**
     * Human-readable markdown documentation for this commitment, available at runtime.
     * Must be implemented by each concrete commitment.
     */
    abstract get documentation(): string;

    /**
     * Creates a regex pattern to match this commitment in agent source
     */
    createRegex(): RegExp {
        return createCommitmentRegex(this.type as BookCommitment);
    }

    /**
     * Creates a regex pattern to match just the commitment type
     */
    createTypeRegex(): RegExp {
        return createCommitmentTypeRegex(this.type as BookCommitment);
    }

    /**
     * Applies this commitment's logic to the agent model requirements
     * This method must be implemented by each specific commitment
     */
    abstract applyToAgentModelRequirements(
        requirements: AgentModelRequirements,
        content: string,
    ): AgentModelRequirements;

    /**
     * Gets the primary type name for this commitment
     * Used in documentation and display purposes
     */
    get primaryType(): string {
        return this._primaryType;
    }

    /**
     * Gets all plural forms for this commitment
     */
    get pluralForms(): readonly string[] {
        return this._pluralForms;
    }

    /**
     * Checks if this commitment is a plural form of another
     */
    get isPlural(): boolean {
        return this.type !== this._primaryType;
    }

    /**
     * Helper method to create a new requirements object with updated system message
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
     * Helper method to add a comment section to the system message
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
}

/**
 * Creates all variants (singular and plural) of a commitment definition
 *
 * @param CommitmentClass The commitment class constructor
 * @param primaryType The primary (usually singular) type name
 * @param pluralForms Array of plural forms for this commitment
 * @returns Array of commitment instances for all forms
 */
export function createCommitmentVariants<T extends PluralSupportCommitmentDefinition<string>>(
    CommitmentClass: new (type: string, primaryType: string, pluralForms: readonly string[]) => T,
    primaryType: string,
    pluralForms: readonly string[] = []
): T[] {
    const allTypes = [primaryType, ...pluralForms];
    return allTypes.map(type => new CommitmentClass(type, primaryType, pluralForms));
}
