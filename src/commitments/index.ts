import type { CommitmentDefinition } from './_base/CommitmentDefinition';

// Import all commitment definition classes
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
import { MessageSuffixCommitmentDefinition } from './MESSAGE_SUFFIX/MESSAGE_SUFFIX';
import { MetaCommitmentDefinition } from './META/META';
import { MetaColorCommitmentDefinition } from './META_COLOR/META_COLOR';
import { MetaDomainCommitmentDefinition } from './META_DOMAIN/META_DOMAIN';
import { MetaDisclaimerCommitmentDefinition } from './META_DISCLAIMER/META_DISCLAIMER';
import { MetaFontCommitmentDefinition } from './META_FONT/META_FONT';
import { MetaImageCommitmentDefinition } from './META_IMAGE/META_IMAGE';
import { MetaLinkCommitmentDefinition } from './META_LINK/META_LINK';
import { MetaVoiceCommitmentDefinition } from './META_VOICE/META_VOICE';
import { ModelCommitmentDefinition } from './MODEL/MODEL';
import { NoteCommitmentDefinition } from './NOTE/NOTE';
import { OpenCommitmentDefinition } from './OPEN/OPEN';
import { PersonaCommitmentDefinition } from './PERSONA/PERSONA';
import { RuleCommitmentDefinition } from './RULE/RULE';
import { SampleCommitmentDefinition } from './SAMPLE/SAMPLE';
import { ScenarioCommitmentDefinition } from './SCENARIO/SCENARIO';
import { StyleCommitmentDefinition } from './STYLE/STYLE';
import { TeamCommitmentDefinition } from './TEAM/TEAM';
import { TemplateCommitmentDefinition } from './TEMPLATE/TEMPLATE';
import { UseCommitmentDefinition } from './USE/USE';
import { UseBrowserCommitmentDefinition } from './USE_BROWSER/USE_BROWSER';
import { UseEmailCommitmentDefinition } from './USE_EMAIL/USE_EMAIL';
import { UseImageGeneratorCommitmentDefinition } from './USE_IMAGE_GENERATOR/USE_IMAGE_GENERATOR';
import { UseMcpCommitmentDefinition } from './USE_MCP/USE_MCP';
import { UseSearchEngineCommitmentDefinition } from './USE_SEARCH_ENGINE/USE_SEARCH_ENGINE';
import { UseTimeCommitmentDefinition } from './USE_TIME/USE_TIME';
import { UseUserLocationCommitmentDefinition } from './USE_USER_LOCATION/USE_USER_LOCATION';
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
    new TemplateCommitmentDefinition('TEMPLATE'),
    new TemplateCommitmentDefinition('TEMPLATES'),
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
    new MetaDomainCommitmentDefinition(),
    new MetaDisclaimerCommitmentDefinition(),
    new MetaCommitmentDefinition(),
    new MetaVoiceCommitmentDefinition(),
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
    new MessageSuffixCommitmentDefinition(),
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
    new UseUserLocationCommitmentDefinition(),
    new UseEmailCommitmentDefinition(),
    new UseImageGeneratorCommitmentDefinition('USE IMAGE GENERATOR'),
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
 * TODO: [🧠] Maybe create through standardized $register
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
