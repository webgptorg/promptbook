// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/types`

import type { PipelineCollection } from '../collection/PipelineCollection';
import type { Command } from '../commands/_common/types/Command';
import type {
    CommandParser,
    CommandParserInput,
    PipelineBothCommandParser,
    PipelineHeadCommandParser,
    PipelineTemplateCommandParser,
} from '../commands/_common/types/CommandParser';
import type { CommandUsagePlace } from '../commands/_common/types/CommandUsagePlaces';
import type { ExpectCommand } from '../commands/EXPECT/ExpectCommand';
import type { ForeachJson } from '../commands/FOREACH/ForeachJson';
import type { FormatCommand } from '../commands/FORMAT/FormatCommand';
import type { TemplateType } from '../commands/TEMPLATE/TemplateTypes';
import type { PrettifyOptions } from '../conversion/prettify/PrettifyOptions';
import type { renderPipelineMermaidOptions } from '../conversion/prettify/renderPipelineMermaidOptions';
import type { CallbackInterfaceToolsOptions } from '../dialogs/callback/CallbackInterfaceToolsOptions';
import type { ErrorJson } from '../errors/utils/ErrorJson';
import type { AvailableModel } from '../execution/AvailableModel';
import type { CommonToolsOptions } from '../execution/CommonToolsOptions';
import type { CreatePipelineExecutorOptions } from '../execution/createPipelineExecutor/00-CreatePipelineExecutorOptions';
import type { CreatePipelineExecutorSettings } from '../execution/createPipelineExecutor/00-CreatePipelineExecutorSettings';
import type { EmbeddingVector } from '../execution/EmbeddingVector';
import type { ExecutionTools } from '../execution/ExecutionTools';
import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../execution/LlmExecutionToolsConstructor';
import type { PipelineExecutor } from '../execution/PipelineExecutor';
import type { PipelineExecutorResult } from '../execution/PipelineExecutorResult';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    PromptResult,
} from '../execution/PromptResult';
import type { PromptResultUsage, PromptResultUsageCounts } from '../execution/PromptResultUsage';
import type { ScriptExecutionTools, ScriptExecutionToolsExecuteOptions } from '../execution/ScriptExecutionTools';
import type { UncertainNumber } from '../execution/UncertainNumber';
import type { UserInterfaceTools, UserInterfaceToolsPromptDialogOptions } from '../execution/UserInterfaceTools';
import type { FormatSubvalueDefinition } from '../formats/_common/FormatSubvalueDefinition';
import type { CsvSettings } from '../formats/csv/CsvSettings';
import type { LlmToolsConfiguration } from '../llm-providers/_common/LlmToolsConfiguration';
import type { LlmToolsMetadata } from '../llm-providers/_common/LlmToolsMetadata';
import type { LlmToolsOptions } from '../llm-providers/_common/LlmToolsOptions';
import type { CacheItem } from '../llm-providers/_common/utils/cache/CacheItem';
import type { CacheLlmToolsOptions } from '../llm-providers/_common/utils/cache/CacheLlmToolsOptions';
import type { LlmExecutionToolsWithTotalUsage } from '../llm-providers/_common/utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
import type {
    AnthropicClaudeExecutionToolsDirectOptions,
    AnthropicClaudeExecutionToolsOptions,
    AnthropicClaudeExecutionToolsProxiedOptions,
} from '../llm-providers/anthropic-claude/AnthropicClaudeExecutionToolsOptions';
import type { AzureOpenAiExecutionToolsOptions } from '../llm-providers/azure-openai/AzureOpenAiExecutionToolsOptions';
import type { LangtailExecutionToolsOptions } from '../llm-providers/langtail/LangtailExecutionToolsOptions';
import type { MultipleLlmExecutionTools } from '../llm-providers/multiple/MultipleLlmExecutionTools';
import type { OpenAiExecutionToolsOptions } from '../llm-providers/openai/OpenAiExecutionToolsOptions';
import type { PromptbookServer_Error } from '../llm-providers/remote/interfaces/PromptbookServer_Error';
import type {
    PromptbookServer_ListModels_AnonymousRequest,
    PromptbookServer_ListModels_CollectionRequest,
    PromptbookServer_ListModels_Request,
} from '../llm-providers/remote/interfaces/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from '../llm-providers/remote/interfaces/PromptbookServer_ListModels_Response';
import type { PromptbookServer_Prompt_Progress } from '../llm-providers/remote/interfaces/PromptbookServer_Prompt_Progress';
import type {
    PromptbookServer_Prompt_AnonymousRequest,
    PromptbookServer_Prompt_CollectionRequest,
    PromptbookServer_Prompt_Request,
} from '../llm-providers/remote/interfaces/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from '../llm-providers/remote/interfaces/PromptbookServer_Prompt_Response';
import type { RemoteLlmExecutionToolsOptions } from '../llm-providers/remote/interfaces/RemoteLlmExecutionToolsOptions';
import type {
    AnonymousRemoteServerOptions,
    CollectionRemoteServerOptions,
    RemoteServerOptions,
} from '../llm-providers/remote/interfaces/RemoteServerOptions';
import type { PrepareAndScrapeOptions } from '../prepare/PrepareAndScrapeOptions';
import type { Converter } from '../scrapers/_common/Converter';
import type { Scraper, ScraperSourceHandler } from '../scrapers/_common/Scraper';
import type { ScraperIntermediateSource } from '../scrapers/_common/ScraperIntermediateSource';
import type {
    JavascriptExecutionToolsOptions,
    PostprocessingFunction,
} from '../scripting/javascript/JavascriptExecutionToolsOptions';
import type { PromptbookStorage } from '../storage/_common/PromptbookStorage';
import type { FileCacheStorageOptions } from '../storage/file-cache-storage/FileCacheStorageOptions';
import type { ExecutionPromptReportJson } from '../types/execution-report/ExecutionPromptReportJson';
import type { ExecutionReportJson } from '../types/execution-report/ExecutionReportJson';
import type { ExecutionReportString } from '../types/execution-report/ExecutionReportString';
import type { ExecutionReportStringOptions } from '../types/execution-report/ExecutionReportStringOptions';
import type {
    ChatModelRequirements,
    CompletionModelRequirements,
    EmbeddingModelRequirements,
    ModelRequirements,
} from '../types/ModelRequirements';
import type { ModelVariant } from '../types/ModelVariant';
import type { DialogTemplateJson } from '../types/PipelineJson/DialogTemplateJson';
import type { ExpectationAmount, Expectations, ExpectationUnit } from '../types/PipelineJson/Expectations';
import type { KnowledgePiecePreparedJson } from '../types/PipelineJson/KnowledgePieceJson';
import type { KnowledgeSourceJson, KnowledgeSourcePreparedJson } from '../types/PipelineJson/KnowledgeSourceJson';
import type { ParameterJson } from '../types/PipelineJson/ParameterJson';
import type { PersonaJson, PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PreparationJson } from '../types/PipelineJson/PreparationJson';
import type { PromptTemplateJson } from '../types/PipelineJson/PromptTemplateJson';
import type { ScriptTemplateJson } from '../types/PipelineJson/ScriptTemplateJson';
import type { SimpleTemplateJson } from '../types/PipelineJson/SimpleTemplateJson';
import type { TemplateJson } from '../types/PipelineJson/TemplateJson';
import type { TemplateJsonCommon } from '../types/PipelineJson/TemplateJsonCommon';
import type { PipelineString } from '../types/PipelineString';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, Prompt } from '../types/Prompt';
import type { ScriptLanguage } from '../types/ScriptLanguage';
import type { TaskProgress } from '../types/TaskProgress';
import type { string_char_emoji } from '../types/typeAliasEmoji';
import type {
    number_bytes,
    number_days,
    number_gigabytes,
    number_hours,
    number_id,
    number_integer,
    number_kilobytes,
    number_likeness,
    number_linecol_number,
    number_megabytes,
    number_miliseconds,
    number_minutes,
    number_model_temperature,
    number_months,
    number_negative,
    number_percent,
    number_positive,
    number_seconds,
    number_seed,
    number_terabytes,
    number_tokens,
    number_usd,
    number_weeks,
    number_years,
    Parameters,
    ReservedParameters,
    string_absolute_dirname,
    string_absolute_filename,
    string_attribute,
    string_attribute_value_scope,
    string_base64,
    string_base_url,
    string_business_category_name,
    string_char,
    string_chat_prompt,
    string_color,
    string_completion_prompt,
    string_css,
    string_css_class,
    string_css_property,
    string_css_selector,
    string_css_value,
    string_data_url,
    string_date_iso8601,
    string_dirname,
    string_domain,
    string_email,
    string_emails,
    string_file_extension,
    string_filename,
    string_host,
    string_hostname,
    string_href,
    string_html,
    string_javascript,
    string_javascript_name,
    string_json,
    string_knowledge_source_content,
    string_knowledge_source_link,
    string_license,
    string_license_token,
    string_markdown,
    string_markdown_section,
    string_markdown_section_content,
    string_markdown_text,
    string_mime_type,
    string_mime_type_with_wildcard,
    string_model_name,
    string_name,
    string_page,
    string_parameter_name,
    string_parameter_value,
    string_password,
    string_person_fullname,
    string_person_profile,
    string_persona_description,
    string_pgp_key,
    string_pipeline_url,
    string_pipeline_url_with_hashtemplate,
    string_postprocessing_function_name,
    string_prompt,
    string_promptbook_documentation_url,
    string_protocol,
    string_relative_dirname,
    string_relative_filename,
    string_reserved_parameter_name,
    string_script,
    string_semantic_version,
    string_sha256,
    string_ssh_key,
    string_svg,
    string_system_message,
    string_tdl,
    string_template,
    string_text_prompt,
    string_title,
    string_token,
    string_translate_language,
    string_translate_name,
    string_translate_name_not_normalized,
    string_uri,
    string_uri_part,
    string_uriid,
    string_url,
    string_url_image,
    string_user_id,
    string_uuid,
    string_version_dependency,
    string_xml,
} from '../types/typeAliases';
import type { Registered } from '../utils/$Register';
import type { IExecCommandOptions, IExecCommandOptionsAdvanced } from '../utils/execCommand/IExecCommandOptions';
import type { FromtoItems } from '../utils/FromtoItems';
import type { CodeBlock } from '../utils/markdown/extractAllBlocksFromMarkdown';
import type { MarkdownSection } from '../utils/markdown/parseMarkdownSection';
import type { IKeywords, string_keyword } from '../utils/normalization/IKeywords';
import type { string_kebab_case } from '../utils/normalization/normalize-to-kebab-case';
import type { string_camelCase } from '../utils/normalization/normalizeTo_camelCase';
import type { string_PascalCase } from '../utils/normalization/normalizeTo_PascalCase';
import type { string_SCREAMING_CASE } from '../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { string_snake_case } from '../utils/normalization/normalizeTo_snake_case';
import type { empty_object } from '../utils/organization/empty_object';
import type { really_any } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { string_promptbook_version } from '../version';

// Note: Entities of the `@promptbook/types`
export type {
    AnonymousRemoteServerOptions,
    AnthropicClaudeExecutionToolsDirectOptions,
    AnthropicClaudeExecutionToolsOptions,
    AnthropicClaudeExecutionToolsProxiedOptions,
    AvailableModel,
    AzureOpenAiExecutionToolsOptions,
    CacheItem,
    CacheLlmToolsOptions,
    CallbackInterfaceToolsOptions,
    ChatModelRequirements,
    ChatPrompt,
    ChatPromptResult,
    CodeBlock,
    CollectionRemoteServerOptions,
    Command,
    CommandParser,
    CommandParserInput,
    CommandUsagePlace,
    CommonToolsOptions as CommonExecutionToolsOptions,
    CompletionModelRequirements,
    CompletionPrompt,
    CompletionPromptResult,
    Converter,
    CreatePipelineExecutorOptions,
    CreatePipelineExecutorSettings,
    CsvSettings,
    DialogTemplateJson,
    EmbeddingModelRequirements,
    EmbeddingPrompt,
    EmbeddingPromptResult,
    EmbeddingVector,
    empty_object,
    ErrorJson,
    ExecutionPromptReportJson,
    ExecutionReportJson,
    ExecutionReportString,
    ExecutionReportStringOptions,
    ExecutionTools,
    ExpectationAmount,
    Expectations,
    ExpectationUnit,
    ExpectCommand,
    FileCacheStorageOptions,
    ForeachJson,
    FormatCommand,
    FormatSubvalueDefinition,
    FromtoItems,
    IExecCommandOptions,
    IExecCommandOptionsAdvanced,
    IKeywords,
    JavascriptExecutionToolsOptions,
    KnowledgePiecePreparedJson,
    KnowledgeSourceJson,
    KnowledgeSourcePreparedJson,
    LangtailExecutionToolsOptions,
    LlmExecutionTools,
    LlmExecutionToolsConstructor,
    LlmExecutionToolsWithTotalUsage,
    LlmToolsConfiguration,
    LlmToolsMetadata,
    LlmToolsOptions,
    MarkdownSection,
    ModelRequirements,
    ModelVariant,
    MultipleLlmExecutionTools,
    number_bytes,
    number_days,
    number_gigabytes,
    number_hours,
    number_id,
    number_integer,
    number_kilobytes,
    number_likeness,
    number_linecol_number,
    number_megabytes,
    number_miliseconds,
    number_minutes,
    number_model_temperature,
    number_months,
    number_negative,
    number_percent,
    number_positive,
    number_seconds,
    number_seed,
    number_terabytes,
    number_tokens,
    number_usd,
    number_weeks,
    number_years,
    OpenAiExecutionToolsOptions,
    ParameterJson,
    Parameters,
    PersonaJson,
    PersonaPreparedJson,
    PipelineBothCommandParser,
    PipelineCollection,
    PipelineExecutor,
    PipelineExecutorResult,
    PipelineHeadCommandParser,
    PipelineJson,
    PipelineString,
    PipelineTemplateCommandParser,
    PostprocessingFunction,
    PreparationJson,
    PrepareAndScrapeOptions,
    PrettifyOptions,
    Prompt,
    PromptbookServer_Error,
    PromptbookServer_ListModels_AnonymousRequest,
    PromptbookServer_ListModels_CollectionRequest,
    PromptbookServer_ListModels_Request,
    PromptbookServer_ListModels_Response,
    PromptbookServer_Prompt_AnonymousRequest,
    PromptbookServer_Prompt_CollectionRequest,
    PromptbookServer_Prompt_Progress,
    PromptbookServer_Prompt_Request,
    PromptbookServer_Prompt_Response,
    PromptbookStorage,
    PromptResult,
    PromptResultUsage,
    PromptResultUsageCounts,
    PromptTemplateJson,
    really_any,
    Registered,
    RemoteLlmExecutionToolsOptions,
    RemoteServerOptions,
    renderPipelineMermaidOptions,
    ReservedParameters,
    Scraper,
    ScraperIntermediateSource,
    ScraperSourceHandler,
    ScriptExecutionTools,
    ScriptExecutionToolsExecuteOptions,
    ScriptLanguage,
    ScriptTemplateJson,
    SimpleTemplateJson,
    string_absolute_dirname,
    string_absolute_filename,
    string_attribute,
    string_attribute_value_scope,
    string_base64,
    string_base_url,
    string_business_category_name,
    string_camelCase,
    string_char,
    string_char_emoji,
    string_chat_prompt,
    string_color,
    string_completion_prompt,
    string_css,
    string_css_class,
    string_css_property,
    string_css_selector,
    string_css_value,
    string_data_url,
    string_date_iso8601,
    string_dirname,
    string_domain,
    string_email,
    string_emails,
    string_file_extension,
    string_filename,
    string_host,
    string_hostname,
    string_href,
    string_html,
    string_javascript,
    string_javascript_name,
    string_json,
    string_kebab_case,
    string_keyword,
    string_knowledge_source_content,
    string_knowledge_source_link,
    string_license,
    string_license_token,
    string_markdown,
    string_markdown_section,
    string_markdown_section_content,
    string_markdown_text,
    string_mime_type,
    string_mime_type_with_wildcard,
    string_model_name,
    string_name,
    string_page,
    string_parameter_name,
    string_parameter_value,
    string_PascalCase,
    string_password,
    string_person_fullname,
    string_person_profile,
    string_persona_description,
    string_pgp_key,
    string_pipeline_url,
    string_pipeline_url_with_hashtemplate,
    string_postprocessing_function_name,
    string_prompt,
    string_promptbook_documentation_url,
    string_promptbook_version,
    string_protocol,
    string_relative_dirname,
    string_relative_filename,
    string_reserved_parameter_name,
    string_SCREAMING_CASE,
    string_script,
    string_semantic_version,
    string_sha256,
    string_snake_case,
    string_ssh_key,
    string_svg,
    string_system_message,
    string_tdl,
    string_template,
    string_text_prompt,
    string_title,
    string_token,
    string_translate_language,
    string_translate_name,
    string_translate_name_not_normalized,
    string_uri,
    string_uri_part,
    string_uriid,
    string_url,
    string_url_image,
    string_user_id,
    string_uuid,
    string_version_dependency,
    string_xml,
    TaskProgress,
    TemplateJson,
    TemplateJsonCommon,
    TemplateType,
    TODO_any,
    UncertainNumber,
    UserInterfaceTools,
    UserInterfaceToolsPromptDialogOptions,
};
