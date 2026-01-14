import type { BookCommitment } from './_base/BookCommitment';
import type { CommitmentDefinition } from './_base/CommitmentDefinition';

// Import all commitment definition classes
import { ToolFunction } from '../scripting/javascript/JavascriptExecutionToolsOptions';
import { string_javascript_name } from '../types/typeAliases';
import { $deepFreeze } from '../utils/serialization/$deepFreeze';
import { ActionCommitmentDefinition } from './ACTION/ACTION';
import { ClosedCommitmentDefinition } from './CLOSED/CLOSED';
import { ComponentCommitmentDefinition } from './COMPONENT/COMPONENT';
import { DeleteCommitmentDefinition } from './DELETE/DELETE';
import { DictionaryCommitmentDefinition } from './DICTIONARY/DICTIONARY';
import { FormatCommitmentDefinition } from './FORMAT/FORMAT';
import { FromCommitmentDefinition } from './FROM/FROM';
import { GoalCommitmentDefinition } from './GOAL/GOAL';
import { ImportCommitmentDefinition } from './IMPORT/IMPORT';
import { KnowledgeCommitmentDefinition } from './KNOWLEDGE/KNOWLEDGE';
import { LanguageCommitmentDefinition } from './LANGUAGE/LANGUAGE';
import { MemoryCommitmentDefinition } from './MEMORY/MEMORY';
import { AgentMessageCommitmentDefinition } from './MESSAGE/AgentMessageCommitmentDefinition';
import { InitialMessageCommitmentDefinition } from './MESSAGE/InitialMessageCommitmentDefinition';
import { MessageCommitmentDefinition } from './MESSAGE/MESSAGE';
import { UserMessageCommitmentDefinition } from './MESSAGE/UserMessageCommitmentDefinition';
import { MetaCommitmentDefinition } from './META/META';
import { MetaColorCommitmentDefinition } from './META_COLOR/META_COLOR';
import { MetaFontCommitmentDefinition } from './META_FONT/META_FONT';
import { MetaImageCommitmentDefinition } from './META_IMAGE/META_IMAGE';
import { MetaLinkCommitmentDefinition } from './META_LINK/META_LINK';
import { ModelCommitmentDefinition } from './MODEL/MODEL';
import { NoteCommitmentDefinition } from './NOTE/NOTE';
import { OpenCommitmentDefinition } from './OPEN/OPEN';
import { PersonaCommitmentDefinition } from './PERSONA/PERSONA';
import { RuleCommitmentDefinition } from './RULE/RULE';
import { SampleCommitmentDefinition } from './SAMPLE/SAMPLE';
import { ScenarioCommitmentDefinition } from './SCENARIO/SCENARIO';
import { StyleCommitmentDefinition } from './STYLE/STYLE';
import { TeamCommitmentDefinition } from './TEAM/TEAM';
import { UseCommitmentDefinition } from './USE/USE';
import { UseBrowserCommitmentDefinition } from './USE_BROWSER/USE_BROWSER';
import { UseImageGeneratorCommitmentDefinition } from './USE_IMAGE_GENERATOR/USE_IMAGE_GENERATOR';
import { UseMcpCommitmentDefinition } from './USE_MCP/USE_MCP';
import { UseSearchEngineCommitmentDefinition } from './USE_SEARCH_ENGINE/USE_SEARCH_ENGINE';
import { UseTimeCommitmentDefinition } from './USE_TIME/USE_TIME';
import { NotYetImplementedCommitmentDefinition } from './_base/NotYetImplementedCommitmentDefinition';

/**
 * Registry of all available commitment definitions
 * This array contains instances of all commitment definitions
 * This is the single source of truth for all commitments in the system
 *
 * @private Use functions to access commitments instead of this array directly
 */
export const COMMITMENT_REGISTRY = [
    // Fully implemented commitments
    new PersonaCommitmentDefinition('PERSONA'),
    new PersonaCommitmentDefinition('PERSONAE'),
    new KnowledgeCommitmentDefinition(),
    new MemoryCommitmentDefinition('MEMORY'),
    new MemoryCommitmentDefinition('MEMORIES'),
    new StyleCommitmentDefinition('STYLE'),
    new StyleCommitmentDefinition('STYLES'),
    new RuleCommitmentDefinition('RULES'),
    new RuleCommitmentDefinition('RULE'),
    new LanguageCommitmentDefinition('LANGUAGES'),
    new LanguageCommitmentDefinition('LANGUAGE'),
    new SampleCommitmentDefinition('SAMPLE'),
    new SampleCommitmentDefinition('EXAMPLE'),
    new FormatCommitmentDefinition('FORMAT'),
    new FormatCommitmentDefinition('FORMATS'),
    new FromCommitmentDefinition('FROM'),
    new ImportCommitmentDefinition('IMPORT'),
    new ImportCommitmentDefinition('IMPORTS'),
    new ModelCommitmentDefinition('MODEL'),
    new ModelCommitmentDefinition('MODELS'),
    new ActionCommitmentDefinition('ACTION'),
    new ActionCommitmentDefinition('ACTIONS'),
    new ComponentCommitmentDefinition(),
    new MetaImageCommitmentDefinition(),
    new MetaColorCommitmentDefinition(),
    new MetaFontCommitmentDefinition(),
    new MetaLinkCommitmentDefinition(),
    new MetaCommitmentDefinition(),
    new NoteCommitmentDefinition('NOTE'),
    new NoteCommitmentDefinition('NOTES'),
    new NoteCommitmentDefinition('COMMENT'),
    new NoteCommitmentDefinition('NONCE'),
    new NoteCommitmentDefinition('TODO'),
    new GoalCommitmentDefinition('GOAL'),
    new GoalCommitmentDefinition('GOALS'),
    new InitialMessageCommitmentDefinition(),
    new UserMessageCommitmentDefinition(),
    new AgentMessageCommitmentDefinition(),
    new MessageCommitmentDefinition('MESSAGE'),
    new MessageCommitmentDefinition('MESSAGES'),
    new ScenarioCommitmentDefinition('SCENARIO'),
    new ScenarioCommitmentDefinition('SCENARIOS'),
    new DeleteCommitmentDefinition('DELETE'),
    new DeleteCommitmentDefinition('CANCEL'),
    new DeleteCommitmentDefinition('DISCARD'),
    new DeleteCommitmentDefinition('REMOVE'),
    new DictionaryCommitmentDefinition(),
    new OpenCommitmentDefinition(),
    new ClosedCommitmentDefinition(),
    new TeamCommitmentDefinition(),
    new UseBrowserCommitmentDefinition(),
    new UseSearchEngineCommitmentDefinition(),
    new UseTimeCommitmentDefinition(),
    new UseImageGeneratorCommitmentDefinition('USE IMAGE GENERATOR'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new UseImageGeneratorCommitmentDefinition('USE IMAGE GENERATION' as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new UseImageGeneratorCommitmentDefinition('IMAGE GENERATOR' as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new UseImageGeneratorCommitmentDefinition('IMAGE GENERATION' as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new UseImageGeneratorCommitmentDefinition('USE IMAGE' as any),
    new UseMcpCommitmentDefinition(),
    new UseCommitmentDefinition(),

    // Not yet implemented commitments (using placeholder)
    new NotYetImplementedCommitmentDefinition('EXPECT'),
    new NotYetImplementedCommitmentDefinition('BEHAVIOUR'),
    new NotYetImplementedCommitmentDefinition('BEHAVIOURS'),
    new NotYetImplementedCommitmentDefinition('AVOID'),
    new NotYetImplementedCommitmentDefinition('AVOIDANCE'),
    new NotYetImplementedCommitmentDefinition('CONTEXT'),

    // <- TODO: Prompt: Leverage aliases instead of duplicating commitment definitions
] as const satisfies ReadonlyArray<CommitmentDefinition>;

/**
 * Gets a commitment definition by its type
 * @param type The commitment type to look up
 * @returns The commitment definition or null if not found
 *
 * @public exported from `@promptbook/core`
 */
export function getCommitmentDefinition(type: BookCommitment): CommitmentDefinition | null {
    return COMMITMENT_REGISTRY.find((commitmentDefinition) => commitmentDefinition.type === type) || null;
}

/**
 * Gets all available commitment definitions
 * @returns Array of all commitment definitions
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentDefinitions(): ReadonlyArray<CommitmentDefinition> {
    return $deepFreeze([...COMMITMENT_REGISTRY]);
}

/**
 * Gets all available commitment types
 * @returns Array of all commitment types
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentTypes(): ReadonlyArray<BookCommitment> {
    return $deepFreeze(COMMITMENT_REGISTRY.map((commitmentDefinition) => commitmentDefinition.type));
}

/**
 * Checks if a commitment type is supported
 * @param type The commitment type to check
 * @returns True if the commitment type is supported
 *
 * @public exported from `@promptbook/core`
 */
export function isCommitmentSupported(type: BookCommitment): boolean {
    return COMMITMENT_REGISTRY.some((commitmentDefinition) => commitmentDefinition.type === type);
}

/**
 * Grouped commitment definition
 *
 * @public exported from `@promptbook/core`
 */
export type GroupedCommitmentDefinition = {
    primary: CommitmentDefinition;
    aliases: string[];
};

/**
 * Gets all commitment definitions grouped by their aliases
 *
 * @returns Array of grouped commitment definitions
 *
 * @public exported from `@promptbook/core`
 */
export function getGroupedCommitmentDefinitions(): ReadonlyArray<GroupedCommitmentDefinition> {
    const groupedCommitments: GroupedCommitmentDefinition[] = [];

    for (const commitment of COMMITMENT_REGISTRY) {
        const lastGroup = groupedCommitments[groupedCommitments.length - 1];

        // Check if we should group with the previous item
        let shouldGroup = false;

        if (lastGroup) {
            const lastPrimary = lastGroup.primary;

            // Case 1: Same class constructor (except NotYetImplemented)
            if (
                !(commitment instanceof NotYetImplementedCommitmentDefinition) &&
                commitment.constructor === lastPrimary.constructor
            ) {
                shouldGroup = true;
            }
            // Case 2: NotYetImplemented with prefix matching (e.g. BEHAVIOUR -> BEHAVIOURS)
            else if (
                commitment instanceof NotYetImplementedCommitmentDefinition &&
                lastPrimary instanceof NotYetImplementedCommitmentDefinition &&
                commitment.type.startsWith(lastPrimary.type)
            ) {
                shouldGroup = true;
            }
        }

        if (shouldGroup && lastGroup) {
            lastGroup.aliases.push(commitment.type);
        } else {
            groupedCommitments.push({
                primary: commitment,
                aliases: [],
            });
        }
    }

    return $deepFreeze(groupedCommitments);
}

/**
 * Gets all function implementations provided by all commitments
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentsToolFunctions(): Record<string_javascript_name, ToolFunction> {
    const allToolFunctions: Record<string_javascript_name, ToolFunction> = {};
    for (const commitmentDefinition of getAllCommitmentDefinitions()) {
        const toolFunctions = commitmentDefinition.getToolFunctions();
        for (const [funcName, funcImpl] of Object.entries(toolFunctions)) {
            allToolFunctions[funcName as string_javascript_name] = funcImpl;
        }
    }
    return allToolFunctions;
}

/**
 * Gets all tool titles provided by all commitments
 *
 * @public exported from `@promptbook/core`
 */
export function getAllCommitmentsToolTitles(): Record<string_javascript_name, string> {
    const allToolTitles: Record<string_javascript_name, string> = {};
    for (const commitmentDefinition of getAllCommitmentDefinitions()) {
        const toolTitles = commitmentDefinition.getToolTitles();
        for (const [funcName, title] of Object.entries(toolTitles)) {
            allToolTitles[funcName as string_javascript_name] = title;
        }
    }
    return allToolTitles;
}

/**
 * TODO: [🧠] Maybe create through standardized $register
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
