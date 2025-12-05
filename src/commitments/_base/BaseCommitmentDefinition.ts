import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createCommitmentRegex, createCommitmentTypeRegex } from '../../book-2.0/agent-source/createCommitmentRegex';
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

    constructor(type: TBookCommitment, aliases: string[] = []) {
        this.type = type;
        this.aliases = aliases;
    }

    /**
     * Short one-line markdown description; concise, may use inline **markdown**.
     * Must be implemented by each concrete commitment.
     */
    abstract get description(): string;

    /**
     * Icon for this commitment.
     * It should be a single emoji.
     */
    abstract get icon(): string;

    /**
     * Human-readable markdown documentation for this commitment, available at runtime.
     * Must be implemented by each concrete commitment.
     */
    abstract get documentation(): string;

    /**
     * Creates a regex pattern to match this commitment in agent source
     * Uses the existing createCommitmentRegex function as internal helper
     */
    createRegex(): RegExp {
        return createCommitmentRegex(this.type as BookCommitment, this.aliases as BookCommitment[]);
    }

    /**
     * Creates a regex pattern to match just the commitment type
     * Uses the existing createCommitmentTypeRegex function as internal helper
     */
    createTypeRegex(): RegExp {
        return createCommitmentTypeRegex(this.type as BookCommitment, this.aliases as BookCommitment[]);
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
}
