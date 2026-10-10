[x] ~$0.2879 12 minutes by OpenAI Codex `gpt-5.4`

[✨🍈] Fix stucked Generating packages script

-   The script is stuck only sometimes. It is not clear why.
-   It is stucked only on my local PC, not on the CI/CD on GitHub Actions.
-   Try to fix it, and if you cannot fix it, try at least to log more information for future repair.
-   Do a proper analysis of the current Generating packages script before you start implementing.
-   You are working with the [📦 Generating packages script](scripts/generate-packages/generate-packages.ts)

```bash
📦  Generating packages
0️⃣  Prepare the needed information about the packages
Promptbook version 0.111.0
1️⃣  Generate entry file for each package
Generated index file ./src/_packages/anthropic-claude.index.ts
Generated index file ./src/_packages/azure-openai.index.ts
Generated index file ./src/_packages/browser.index.ts
Generated index file ./src/_packages/cli.index.ts
Generated index file ./src/_packages/color.index.ts
Generated index file ./src/_packages/components.index.ts
Generated index file ./src/_packages/core.index.ts
Generated index file ./src/_packages/deepseek.index.ts
Generated index file ./src/_packages/documents.index.ts
Generated index file ./src/_packages/editable.index.ts
Generated index file ./src/_packages/fake-llm.index.ts
Generated index file ./src/_packages/google.index.ts
Generated index file ./src/_packages/javascript.index.ts
Generated index file ./src/_packages/legacy-documents.index.ts
Generated index file ./src/_packages/markdown-utils.index.ts
Generated index file ./src/_packages/markitdown.index.ts
Generated index file ./src/_packages/node.index.ts
Generated index file ./src/_packages/ollama.index.ts
Generated index file ./src/_packages/openai.index.ts
Generated index file ./src/_packages/pdf.index.ts
Generated index file ./src/_packages/remote-client.index.ts
Generated index file ./src/_packages/remote-server.index.ts
Generated index file ./src/_packages/templates.index.ts
Generated index file ./src/_packages/types.index.ts
Generated index file ./src/_packages/utils.index.ts
Generated index file ./src/_packages/vercel.index.ts
Generated index file ./src/_packages/website-crawler.index.ts
Generated index file ./src/_packages/wizard.index.ts
2️⃣  Generate package.json, README and other crucial files for each package
3️⃣  Cleanup build directories for each package
4️⃣  Generate bundle for each package
--- @promptbook/anthropic-claude ---
📦 Building package 1/28: @promptbook/anthropic-claude
C:\Users\me\work\ai\promptbook node --max-old-space-size=32000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js
Building @promptbook/anthropic-claude v0.111.0


./src/_packages/anthropic-claude.index.ts → ./packages/anthropic-claude/esm/index.es.js, ./packages/anthropic-claude/umd/index.umd.js...

::group::Node Used resources
🕑 Building 1 minutes
🧠 Memory: rss=316.5MB heapUsed=260.1MB heapTotal=267.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
(!) Unresolved dependencies

https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
@anthropic-ai/sdk (imported by src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts)
bottleneck (imported by src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts)
colors (imported by src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts)
spacetrim (imported by src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts, src/errors/UnexpectedError.ts, src/utils/serialization/checkSerializableAsJson.ts, src/errors/utils/getErrorReportUrl.ts, src/errors/utils/deserializeError.ts, src/remote-server/createRemoteClient.ts, src/utils/organization/spaceTrim.ts, src/errors/NotYetImplementedError.ts, src/errors/WrappedError.ts, src/errors/MissingToolsError.ts)
crypto (imported by src/utils/random/$randomToken.ts)
socket.io-client (imported by src/remote-server/createRemoteClient.ts)
(!) Missing global variable names
Use output.globals to specify browser global variable names corresponding to external modules
spacetrim (guessing 'spaceTrim$1')
@anthropic-ai/sdk (guessing 'Anthropic')
bottleneck (guessing 'Bottleneck')
colors (guessing 'colors')
crypto (guessing 'crypto')
socket.io-client (guessing 'socket_ioClient')
(!) Circular dependency
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
created ./packages/anthropic-claude/esm/index.es.js, ./packages/anthropic-claude/umd/index.umd.js in 1m 9.2s
✅ Package @promptbook/anthropic-claude built successfully
--- @promptbook/azure-openai ---
📦 Building package 2/28: @promptbook/azure-openai
C:\Users\me\work\ai\promptbook node --max-old-space-size=32000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js
Building @promptbook/azure-openai v0.111.0


./src/_packages/azure-openai.index.ts → ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js...

::group::Node Used resources
🕑 Building 2 minutes
🧠 Memory: rss=316.5MB heapUsed=260.4MB heapTotal=267.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
(!) Unresolved dependencies

https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
@azure/openai (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
bottleneck (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
colors (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)

./src/_packages/azure-openai.index.ts → ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js...

::group::Node Used resources
🕑 Building 2 minutes
🧠 Memory: rss=316.5MB heapUsed=260.4MB heapTotal=267.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
(!) Unresolved dependencies

https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
@azure/openai (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
bottleneck (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
colors (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
⌛ Event loop lag: 10ms
::endgroup::
(!) Unresolved dependencies

https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
@azure/openai (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
bottleneck (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
colors (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
@azure/openai (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
bottleneck (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
colors (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
bottleneck (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
colors (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
colors (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
spacetrim (imported by src/errors/UnexpectedError.ts, src/errors/utils/getErrorReportUrl.ts, src/utils/serialization/checkSerializableAsJson.ts, src/utils/organization/spaceTrim.ts, src/errors/NotYetImplementedError.ts, src/errors/WrappedError.ts)
crypto (imported by src/utils/random/$randomToken.ts)
(!) Missing global variable names
Use output.globals to specify browser global variable names corresponding to external modules
@azure/openai (guessing 'openai')
bottleneck (guessing 'Bottleneck')
colors (guessing 'colors')
spacetrim (guessing 'spaceTrim$1')
crypto (guessing 'crypto')
(!) Circular dependency
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
created ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js in 1m 7.2s

ization/checkSerializableAsJson.ts, src/utils/organization/spaceTrim.ts, src/errors/NotYetImplementedError.ts, src/errors/WrappedError.ts)
crypto (imported by src/utils/random/$randomToken.ts)
(!) Missing global variable names
Use output.globals to specify browser global variable names corresponding to external modules
@azure/openai (guessing 'openai')
bottleneck (guessing 'Bottleneck')
colors (guessing 'colors')
spacetrim (guessing 'spaceTrim$1')
crypto (guessing 'crypto')
(!) Circular dependency
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
created ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js in 1m 7.2s

Use output.globals to specify browser global variable names corresponding to external modules
@azure/openai (guessing 'openai')
bottleneck (guessing 'Bottleneck')
colors (guessing 'colors')
spacetrim (guessing 'spaceTrim$1')
crypto (guessing 'crypto')
(!) Circular dependency
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
created ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js in 1m 7.2s

spacetrim (guessing 'spaceTrim$1')
crypto (guessing 'crypto')
(!) Circular dependency
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
created ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js in 1m 7.2s

src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
created ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js in 1m 7.2s


✅ Package @promptbook/azure-openai built successfully
--- @promptbook/browser ---
📦 Building package 3/28: @promptbook/browser
C:\Users\me\work\ai\promptbook node --max-old-space-size=32000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js
Building @promptbook/browser v0.111.0


./src/_packages/browser.index.ts → ./packages/browser/esm/index.es.js, ./packages/browser/umd/index.umd.js...

::group::Node Used resources
🕑 Building 3 minutes
🧠 Memory: rss=316.5MB heapUsed=260.6MB heapTotal=267.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
(!) Missing shims for Node.js built-ins

Creating a browser bundle that depends on "path". You might need to include https://github.com/FredKSchott/rollup-plugin-polyfill-node

(!) Unresolved dependencies

https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
spacetrim (imported by src/dialogs/simple-prompt/SimplePromptInterfaceTools.ts, src/book-2.0/agent-source/parseAgentSource.ts, src/errors/UnexpectedError.ts, src/formats/json/utils/jsonParse.ts, src/utils/editable/utils/stringifyPipelineJson.ts, src/commitments/USE_PROJECT/projectReference.ts, src/book-2.0/agent-source/normalizeAgentName.ts, src/book-2.0/agent-source/parseAgentSourceWithCommitments.ts, src/errors/utils/getErrorReportUrl.ts, src/errors/NotYetImplementedError.ts, src/utils/serialization/checkSerializableAsJson.ts, src/utils/misc/computeHash.ts, src/commitments/ACTION/ACTION.ts, src/commitments/CLOSED/CLOSED.ts, src/commitments/COMPONENT/COMPONENT.ts, src/commitments/DELETE/DELETE.ts, src/commitments/DICTIONARY/DICTIONARY.ts, src/commitments/FORMAT/FORMAT.ts, src/commitments/FROM/FROM.ts, src/commitments/GOAL/GOAL.ts, src/commitments/IMPORT/IMPORT.ts, src/commitments/KNOWLEDGE/KNOWLEDGE.ts, src/commitments/LANGUAGE/LANGUAGE.ts, src/commitments/MESSAGE/AgentMessageCommitmentDefinition.ts, src/commitments/MESSAGE/InitialMessageCommitmentDefinition.ts, src/commitments/MESSAGE/InternalMessageCommitmentDefinition.ts, src/commitments/MESSAGE/MESSAGE.ts, src/commitments/MESSAGE/UserMessageCommitmentDefinition.ts, src/commitments/MESSAGE_SUFFIX/MESSAGE_SUFFIX.ts, src/commitments/META/META.ts, src/commitments/META_COLOR/META_COLOR.ts, src/commitments/META_DOMAIN/META_DOMAIN.ts, src/commitments/META_DISCLAIMER/META_DISCLAIMER.ts, src/commitments/META_FONT/META_FONT.ts, src/commitments/META_IMAGE/META_IMAGE.ts, src/commitments/META_INPUT_PLACEHOLDER/META_INPUT_PLACEHOLDER.ts, src/commitments/META_LINK/META_LINK.ts, src/commitments/META_VOICE/META_VOICE.ts, src/commitments/MODEL/MODEL.ts, src/commitments/NOTE/NOTE.ts, src/commitments/OPEN/OPEN.ts, src/commitments/PERSONA/PERSONA.ts, src/commitments/RULE/RULE.ts, src/commitments/SAMPLE/SAMPLE.ts, src/commitments/SCENARIO/SCENARIO.ts, src/commitments/STYLE/STYLE.ts, src/commitments/TEAM/TEAM.ts, src/commitments/TEMPLATE/TEMPLATE.ts, src/commitments/USE/USE.ts, src/commitments/USE_BROWSER/USE_BROWSER.ts, src/commitments/USE_EMAIL/USE_EMAIL.ts, src/commitments/USE_IMAGE_GENERATOR/USE_IMAGE_GENERATOR.ts, src/commitments/USE_MCP/USE_MCP.ts, src/commitments/USE_POPUP/USE_POPUP.ts, src/commitments/USE_PRIVACY/USE_PRIVACY.ts, src/commitments/USE_PROJECT/USE_PROJECT.ts, src/commitments/USE_SEARCH_ENGINE/USE_SEARCH_ENGINE.ts, src/commitments/USE_SPAWN/USE_SPAWN.ts, src/commitments/USE_TIMEOUT/USE_TIMEOUT.ts, src/commitments/USE_TIME/USE_TIME.ts, src/commitments/USE_USER_LOCATION/USE_USER_LOCATION.ts, src/commitments/_base/NotYetImplementedCommitmentDefinition.ts, src/conversion/prettify/renderPipelineMermaidOptions.ts, src/errors/utils/deserializeError.ts, src/errors/utils/serializeError.ts, src/pipeline/prompt-notation.ts, src/utils/clientVersion.ts, src/utils/normalization/normalizeMessageText.ts, src/utils/normalization/unwrapResult.ts, src/utils/organization/spaceTrim.ts, src/utils/serialization/serializeToPromptbookJavascript.ts, src/commitments/_base/formatOptionalInstructionBlock.ts, src/commitments/MEMORY/createMemorySystemMessage.ts, src/commitments/MEMORY/createMemoryTools.ts, src/commitments/MEMORY/getMemoryCommitmentDocumentation.ts, src/llm-providers/agent/RemoteAgent.ts, src/commitments/USE_EMAIL/parseUseEmailCommitmentContent.ts, src/commitments/USE_TIMEOUT/createTimeoutSystemMessage.ts, src/pipeline/prompt-notation/helpers/ParameterSection.ts, src/errors/WrappedError.ts, src/pipeline/book-notation.ts, src/commitments/USE_PROJECT/callGitHubApi.ts, src/commitments/USE_TIMEOUT/parseTimeoutToolArgs.ts, src/errors/MissingToolsError.ts, src/book-2.0/agent-source/string_book.ts, src/llm-providers/agent/self-learning/SelfLearningManager.ts, src/llm-providers/_multiple/joinLlmExecutionTools.ts, src/llm-providers/openai/OpenAiAgentKitExecutionTools.ts, src/llm-providers/openai/OpenAiAssistantExecutionTools.ts, src/book-2.0/agent-source/extractOpenTeacherInstructions.ts, src/llm-providers/_multiple/MultipleLlmExecutionTools.ts, src/execution/createPipelineExecutor/00-createPipelineExecutor.ts, src/scrapers/_common/utils/promptbookFetch.ts, src/collection/pipeline-collection/SimplePipelineCollection.ts, src/conversion/validation/validatePipeline.ts, src/execution/createPipelineExecutor/10-executePipeline.ts, src/import-plugins/AgentFileImportPlugin.ts, src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts, src/conversion/pipelineJsonToString.ts, src/execution/assertsTaskSuccessful.ts, src/execution/createPipelineExecutor/20-executeTask.ts, src/execution/createPipelineExecutor/filterJustOutputParameters.ts, src/scrapers/_common/prepareKnowledgePieces.ts, src/prepare/prepareTasks.ts, src/execution/createPipelineExecutor/30-executeFormatSubvalues.ts, src/execution/createPipelineExecutor/getReservedParametersForTask.ts, src/scrapers/_common/register/$registeredScrapersMessage.ts, src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts, src/scripting/javascript/utils/extractVariablesFromJavascript.ts, src/utils/parameters/mapAvailableToExpectedParameters.ts, src/execution/createPipelineExecutor/40-executeAttempts.ts, src/formats/csv/CsvFormatParser.ts, src/execution/utils/validatePromptResult.ts)
destroyable (imported by src/utils/files/ObjectUrl.ts)
path (imported by src/utils/normalization/titleToName.ts, src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts)
crypto (imported by src/utils/random/$randomToken.ts)
crypto-js (imported by src/utils/misc/computeHash.ts, src/llm-providers/agent/AgentLlmExecutionTools.ts, src/commands/KNOWLEDGE/utils/knowledgeSourceContentToName.ts)
crypto-js/enc-hex (imported by src/utils/misc/computeHash.ts, src/llm-providers/agent/AgentLlmExecutionTools.ts, src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts, src/commands/KNOWLEDGE/utils/knowledgeSourceContentToName.ts)
moment (imported by src/commitments/USE_TIME/USE_TIME.ts)
rxjs (imported by src/llm-providers/agent/RemoteAgent.ts, src/types/Updatable.ts, src/execution/ExecutionTask.ts, src/llm-providers/_common/utils/count-total-usage/countUsage.ts)
mime-types (imported by src/utils/files/extensionToMimeType.ts, src/utils/files/mimeTypeToExtension.ts)
colors (imported by src/llm-providers/agent/self-learning/SelfLearningManager.ts, src/llm-providers/openai/OpenAiAssistantExecutionTools.ts, src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts)
waitasecond (imported by src/llm-providers/agent/self-learning/SelfLearningManager.ts, src/execution/createPipelineExecutor/10-executePipeline.ts)
@openai/agents (imported by src/llm-providers/openai/OpenAiAgentKitExecutionTools.ts)
bottleneck (imported by src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts)
openai (imported by src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts)
crypto-js/sha256 (imported by src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts)
papaparse (imported by src/formats/csv/CsvFormatParser.ts, src/formats/csv/utils/csvParse.ts)
(!) Missing global variable names
Use output.globals to specify browser global variable names corresponding to external modules
spacetrim (guessing 'spaceTrim$1')
destroyable (guessing 'destroyable')
rxjs (guessing 'rxjs')
crypto (guessing 'crypto')
crypto-js (guessing 'cryptoJs')
crypto-js/enc-hex (guessing 'hexEncoder')
path (guessing 'path')
mime-types (guessing 'mimeTypes')
moment (guessing 'moment')
waitasecond (guessing 'waitasecond')
crypto-js/sha256 (guessing 'sha256')
papaparse (guessing 'papaparse')
@openai/agents (guessing 'agents')
bottleneck (guessing 'Bottleneck')
colors (guessing 'colors')
openai (guessing 'OpenAI')
(!) Circular dependencies
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
src/execution/createPipelineExecutor/00-createPipelineExecutor.ts -> src/execution/createPipelineExecutor/10-executePipeline.ts -> src/prepare/preparePipeline.ts -> src/execution/createPipelineExecutor/00-createPipelineExecutor.ts
src/personas/preparePersona.ts -> src/execution/createPipelineExecutor/00-createPipelineExecutor.ts -> src/execution/createPipelineExecutor/10-executePipeline.ts -> src/prepare/preparePipeline.ts -> src/personas/preparePersona.ts
src/book-2.0/agent-source/createAgentModelRequirements.ts -> src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.ts -> src/book-2.0/agent-source/createAgentModelRequirements.ts
(!) Use of eval is strongly discouraged
https://rollupjs.org/guide/en/#avoiding-eval
src/scripting/javascript/utils/extractVariablesFromJavascript.ts
18:         for (let i = 0; i < LOOP_LIMIT; i++)
19:             try {
20:                 eval(script); // <- TODO: Use `JavascriptExecutionTools.execute` here
                    ^
21:             }
22:             catch (error) {
created ./packages/browser/esm/index.es.js, ./packages/browser/umd/index.umd.js in 1m 17.9s

✅ Package @promptbook/browser built successfully
--- @promptbook/cli ---
📦 Building package 4/28: @promptbook/cli
C:\Users\me\work\ai\promptbook node --max-old-space-size=32000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js
Building @promptbook/cli v0.111.0


./src/_packages/cli.index.ts → ./packages/cli/esm/index.es.js, ./packages/cli/umd/index.umd.js...

::group::Node Used resources
🕑 Building 4 minutes
🧠 Memory: rss=286.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 5 minutes
🧠 Memory: rss=287.8MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 22620491ms
::endgroup::
(!) Missing shims for Node.js built-ins
Creating a browser bundle that depends on "path", "os" and "http". You might need to include https://github.com/FredKSchott/rollup-plugin-polyfill-node

::group::Node Used resources
🕑 Building 6 minutes
🧠 Memory: rss=288.3MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
(!) Unresolved dependencies

https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
colors (imported by src/cli/promptbookCli.ts, src/cli/cli-commands/about.ts, src/cli/cli-commands/coder.ts, src/cli/cli-commands/hello.ts, src/cli/cli-commands/list-models.ts, src/cli/cli-commands/make.ts, src/cli/cli-commands/prettify.ts, src/cli/cli-commands/run.ts, src/cli/cli-commands/start-agents-server.ts, src/cli/cli-commands/start-pipelines-server.ts, src/cli/cli-commands/test-command.ts, src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts, src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts, src/llm-providers/vercel/createExecutionToolsFromVercelProvider.ts, src/llm-providers/openai/OpenAiAssistantExecutionTools.ts, src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts, src/cli/cli-commands/common/handleActionErrors.ts, src/cli/cli-commands/coder/find-fresh-emoji-tag.ts, src/cli/cli-commands/coder/find-refactor-candidates.ts, src/cli/cli-commands/coder/generate-boilerplates.ts, src/cli/cli-commands/coder/run.ts, src/cli/cli-commands/coder/verify.ts, src/llm-providers/_common/register/$registeredLlmToolsMessage.ts, src/cli/common/$provideLlmToolsForCli.ts, src/collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory.ts, src/cli/cli-commands/runInteractiveChatbot.ts, src/remote-server/startRemoteServer.ts, src/utils/execCommand/$execCommand.ts, scripts/find-fresh-emoji-tag/find-fresh-emoji-tag.ts, scripts/find-refactor-candidates/find-refactor-candidates.ts, scripts/run-codex-prompts/main/runCodexPrompts.ts, scripts/verify-prompts/verify-prompts.ts, scripts/run-codex-prompts/cli/parseRunOptions.ts, scripts/run-codex-prompts/common/cliProgressDisplay.ts, scripts/run-codex-prompts/common/printCommitMessage.ts, scripts/run-codex-prompts/common/waitForPause.ts, scripts/run-codex-prompts/migrations/runAutoMigrateTestingServers.ts, scripts/run-codex-prompts/prompts/printStats.ts, scripts/run-codex-prompts/prompts/printUpcomingTasks.ts, scripts/run-codex-prompts/prompts/waitForPromptStart.ts, scripts/run-codex-prompts/runners/openai-codex/OpenAiCodexRunner.ts, scripts/run-codex-prompts/common/formatCommitMessageForDisplay.ts, scripts/run-codex-prompts/prompts/printPromptStartSummary.ts, scripts/run-codex-prompts/runners/claude-code/parseClaudeCodeJsonOutput.ts, scripts/run-codex-prompts/runners/gemini/parseGeminiUsageFromOutput.ts, scripts/run-codex-prompts/runners/opencode/parseOpencodeJsonOutput.ts, src/llm-providers/agent/self-learning/SelfLearningManager.ts)
commander (imported by src/cli/promptbookCli.ts)
spacetrim (imported by src/cli/promptbookCli.ts, src/transpilers/openai-sdk/OpenAiSdkTranspiler.ts, src/cli/cli-commands/about.ts, src/cli/cli-commands/coder.ts, src/cli/cli-commands/hello.ts, src/cli/cli-commands/list-models.ts, src/cli/cli-commands/list-scrapers.ts, src/cli/cli-commands/login.ts, src/cli/cli-commands/make.ts, src/cli/cli-commands/prettify.ts, src/cli/cli-commands/run.ts, src/cli/cli-commands/start-agents-server.ts, src/cli/cli-commands/start-pipelines-server.ts, src/cli/cli-commands/test-command.ts, src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts, src/llm-providers/vercel/createExecutionToolsFromVercelProvider.ts, src/llm-providers/openai/OpenAiAssistantExecutionTools.ts, src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts, src/errors/NotYetImplementedError.ts, src/scrapers/_boilerplate/BoilerplateScraper.ts, src/scrapers/document-legacy/LegacyDocumentScraper.ts, src/scrapers/document/DocumentScraper.ts, src/scrapers/markdown/MarkdownScraper.ts, src/book-2.0/agent-source/parseAgentSource.ts, src/book-2.0/agent-source/parseAgentSourceWithCommitments.ts, src/cli/cli-commands/coder/find-fresh-emoji-tag.ts, src/cli/cli-commands/coder/find-refactor-candidates.ts, src/cli/cli-commands/coder/generate-boilerplates.ts, src/cli/cli-commands/coder/run.ts, src/cli/cli-commands/coder/verify.ts, src/llm-providers/_common/register/$registeredLlmToolsMessage.ts, src/cli/common/$provideLlmToolsForCli.ts, src/scrapers/_common/register/$registeredScrapersMessage.ts, src/collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory.ts, src/conversion/validation/validatePipeline.ts, src/errors/UnexpectedError.ts, src/execution/utils/usageToHuman.ts, src/utils/editable/utils/stringifyPipelineJson.ts, src/conversion/prettify/prettifyPipelineString.ts, src/execution/createPipelineExecutor/00-createPipelineExecutor.ts, src/execution/execution-report/executionReportJsonToString.ts, src/formats/json/utils/jsonParse.ts, src/scrapers/_common/utils/promptbookFetch.ts, src/wizard/$getCompiledBook.ts,
src/cli/cli-commands/runInteractiveChatbot.ts, src/remote-server/startRemoteServer.ts, src/utils/organization/spaceTrim.ts, src/utils/serialization/checkSerializableAsJson.ts, src/errors/utils/deserializeError.ts, src/remote-server/createRemoteClient.ts, src/errors/MissingToolsError.ts, src/utils/execCommand/$execCommand.ts,
src/commitments/USE_PROJECT/projectReference.ts, src/book-2.0/agent-source/normalizeAgentName.ts, scripts/find-refactor-candidates/find-refactor-candidates.ts, scripts/run-codex-prompts/main/runCodexPrompts.ts, src/conversion/pipelineJsonToString.ts, src/errors/utils/getErrorReportUrl.ts, src/utils/markdown/addAutoGeneratedSection.ts, src/conversion/prettify/renderPipelineMermaidOptions.ts, src/errors/WrappedError.ts, src/commitments/USE_BROWSER/fetchUrlContent.ts, src/commitments/USE_BROWSER/resolveRunBrowserToolForNode.ts, src/commitments/USE_EMAIL/resolveSendEmailToolForNode.ts, src/commitments/USE_SPAWN/resolveSpawnAgentToolForNode.ts, src/errors/utils/serializeError.ts, src/execution/createPipelineExecutor/10-executePipeline.ts, src/scripting/javascript/JavascriptEvalExecutionTools.ts, src/llm-providers/_common/register/createLlmToolsFromConfiguration.ts, src/conversion/parsePipeline.ts, src/pipeline/prompt-notation.ts, src/utils/clientVersion.ts, src/utils/misc/computeHash.ts, src/utils/normalization/normalizeMessageText.ts, src/utils/normalization/unwrapResult.ts, src/utils/serialization/serializeToPromptbookJavascript.ts, src/collection/pipeline-collection/SimplePipelineCollection.ts, src/llm-providers/_multiple/joinLlmExecutionTools.ts, src/commitments/ACTION/ACTION.ts, src/commitments/CLOSED/CLOSED.ts, src/commitments/COMPONENT/COMPONENT.ts, src/commitments/DELETE/DELETE.ts, src/commitments/DICTIONARY/DICTIONARY.ts, src/commitments/FORMAT/FORMAT.ts, src/commitments/FROM/FROM.ts, src/commitments/GOAL/GOAL.ts, src/commitments/IMPORT/IMPORT.ts, src/commitments/KNOWLEDGE/KNOWLEDGE.ts, src/commitments/LANGUAGE/LANGUAGE.ts, src/commitments/MESSAGE/AgentMessageCommitmentDefinition.ts, src/commitments/MESSAGE/InitialMessageCommitmentDefinition.ts, src/commitments/MESSAGE/InternalMessageCommitmentDefinition.ts, src/commitments/MESSAGE/MESSAGE.ts, src/commitments/MESSAGE/UserMessageCommitmentDefinition.ts, src/commitments/MESSAGE_SUFFIX/MESSAGE_SUFFIX.ts, src/commitments/META/META.ts, src/commitments/META_COLOR/META_COLOR.ts, src/commitments/META_DOMAIN/META_DOMAIN.ts, src/commitments/META_DISCLAIMER/META_DISCLAIMER.ts, src/commitments/META_FONT/META_FONT.ts, src/commitments/META_IMAGE/META_IMAGE.ts, src/commitments/META_INPUT_PLACEHOLDER/META_INPUT_PLACEHOLDER.ts, src/commitments/META_LINK/META_LINK.ts, src/commitments/META_VOICE/META_VOICE.ts, src/commitments/MODEL/MODEL.ts, src/commitments/NOTE/NOTE.ts, src/commitments/OPEN/OPEN.ts, src/commitments/PERSONA/PERSONA.ts, src/commitments/RULE/RULE.ts, src/commitments/SAMPLE/SAMPLE.ts, src/commitments/SCENARIO/SCENARIO.ts, src/commitments/STYLE/STYLE.ts, src/commitments/TEAM/TEAM.ts, src/commitments/TEMPLATE/TEMPLATE.ts, src/commitments/USE/USE.ts, src/commitments/USE_BROWSER/USE_BROWSER.ts, src/commitments/USE_EMAIL/USE_EMAIL.ts, src/commitments/USE_IMAGE_GENERATOR/USE_IMAGE_GENERATOR.ts, src/commitments/USE_MCP/USE_MCP.ts, src/commitments/USE_POPUP/USE_POPUP.ts, src/commitments/USE_PRIVACY/USE_PRIVACY.ts, src/commitments/USE_PROJECT/USE_PROJECT.ts, src/commitments/USE_SEARCH_ENGINE/USE_SEARCH_ENGINE.ts, src/commitments/USE_SPAWN/USE_SPAWN.ts, src/commitments/USE_TIMEOUT/USE_TIMEOUT.ts, src/commitments/USE_TIME/USE_TIME.ts, src/commitments/USE_USER_LOCATION/USE_USER_LOCATION.ts, src/commitments/_base/NotYetImplementedCommitmentDefinition.ts, scripts/run-codex-prompts/git/commitChanges.ts, scripts/run-codex-prompts/git/ensureWorkingTreeClean.ts, scripts/run-codex-prompts/migrations/runAutoMigrateTestingServers.ts, src/storage/env-storage/$EnvStorage.ts, src/llm-providers/_common/utils/cache/cacheLlmTools.ts, src/llm-providers/_common/register/$provideLlmToolsFromEnv.ts, src/utils/markdown/removeMarkdownComments.ts, src/execution/assertsTaskSuccessful.ts, src/execution/createPipelineExecutor/20-executeTask.ts, src/execution/createPipelineExecutor/filterJustOutputParameters.ts, src/utils/markdown/trimCodeBlock.ts, src/utils/markdown/trimEndOfCodeBlock.ts, src/scrapers/_common/prepareKnowledgePieces.ts, src/prepare/prepareTasks.ts, src/commands/SECTION/sectionCommandParser.ts, src/commands/_common/getParserForCommand.ts, src/commands/_common/parseCommand.ts, src/utils/editable/edit-pipeline-string/deflatePipeline.ts, src/utils/markdown/extractOneBlockFromMarkdown.ts, src/utils/markdown/flattenMarkdown.ts, src/utils/markdown/parseMarkdownSection.ts, src/utils/markdown/splitMarkdownIntoSections.ts, src/pipeline/prompt-notation/helpers/ParameterSection.ts, src/llm-providers/_multiple/MultipleLlmExecutionTools.ts, src/import-plugins/AgentFileImportPlugin.ts, src/commitments/_base/formatOptionalInstructionBlock.ts, src/commitments/MEMORY/createMemorySystemMessage.ts, src/commitments/MEMORY/createMemoryTools.ts, src/commitments/MEMORY/getMemoryCommitmentDocumentation.ts, src/commitments/USE_EMAIL/parseUseEmailCommitmentContent.ts, src/llm-providers/agent/RemoteAgent.ts, src/commitments/USE_TIMEOUT/createTimeoutSystemMessage.ts, apps/agents-server/src/database/runDatabaseMigrations.ts, apps/agents-server/src/database/selectPrefixesForMigration.ts, src/execution/utils/validatePromptResult.ts, apps/agents-server/src/tools/runBrowserResultFormatting.ts, apps/agents-server/src/tools/runBrowserWorkflow.ts, src/execution/createPipelineExecutor/30-executeFormatSubvalues.ts, src/execution/createPipelineExecutor/getReservedParametersForTask.ts, src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts, src/commands/KNOWLEDGE/knowledgeCommandParser.ts, src/utils/editable/utils/isFlatPipeline.ts, src/scripting/javascript/utils/extractVariablesFromJavascript.ts, src/pipeline/book-notation.ts, src/commitments/USE_PROJECT/callGitHubApi.ts, src/commitments/USE_TIMEOUT/parseTimeoutToolArgs.ts, apps/agents-server/src/database/listRegisteredServersFromDatabase.ts, apps/agents-server/src/utils/serverRegistry.ts, src/utils/parameters/mapAvailableToExpectedParameters.ts, src/execution/createPipelineExecutor/40-executeAttempts.ts, src/commands/EXPECT/expectCommandParser.ts, src/commands/FOREACH/foreachCommandParser.ts, src/commands/FORMAT/formatCommandParser.ts, src/commands/FORMFACTOR/formfactorCommandParser.ts, src/commands/MODEL/modelCommandParser.ts, src/commands/PARAMETER/parameterCommandParser.ts, src/commands/PERSONA/personaCommandParser.ts, src/book-2.0/agent-source/string_book.ts, src/llm-providers/agent/self-learning/SelfLearningManager.ts, src/formats/csv/CsvFormatParser.ts, src/utils/validators/parameterName/validateParameterName.ts, src/llm-providers/openai/OpenAiAgentKitExecutionTools.ts, src/book-2.0/agent-source/extractOpenTeacherInstructions.ts)
waitasecond (imported by src/cli/cli-commands/hello.ts, src/cli/cli-commands/start-pipelines-server.ts, src/cli/cli-commands/runInteractiveChatbot.ts, src/remote-server/startRemoteServer.ts, src/utils/execCommand/$execCommand.ts, src/execution/createPipelineExecutor/10-executePipeline.ts, src/llm-providers/agent/self-learning/SelfLearningManager.ts)
fs/promises (imported by src/cli/cli-commands/make.ts, src/cli/cli-commands/prettify.ts, src/cli/cli-commands/run.ts, src/cli/cli-commands/test-command.ts, src/scrapers/_boilerplate/BoilerplateScraper.ts, src/scrapers/document-legacy/LegacyDocumentScraper.ts, src/scrapers/document/DocumentScraper.ts, src/scrapers/markitdown/MarkitdownScraper.ts, src/collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory.ts, src/scrapers/_common/register/$provideFilesystemForNode.ts, src/scrapers/_common/utils/getScraperIntermediateSource.ts, scripts/find-refactor-candidates/find-refactor-candidates.ts, scripts/verify-prompts/verify-prompts.ts, scripts/run-codex-prompts/common/normalizeLineEndingsInChangedFiles.ts, scripts/run-codex-prompts/git/commitChanges.ts, scripts/run-codex-prompts/prompts/loadPromptFiles.ts, scripts/run-codex-prompts/prompts/writePromptErrorLog.ts, scripts/run-codex-prompts/prompts/writePromptFile.ts, scripts/run-codex-prompts/runners/cline/ClineRunner.ts, src/storage/env-storage/$EnvStorage.ts, src/storage/file-cache-storage/FileCacheStorage.ts, apps/agents-server/src/tools/runBrowserArtifacts.ts, scripts/run-codex-prompts/common/runGoScript/withTempScript.ts, apps/agents-server/src/tools/BrowserConnectionProvider.ts)
path (imported by src/cli/cli-commands/make.ts, src/cli/cli-commands/prettify.ts, src/cli/cli-commands/run.ts, src/cli/cli-commands/test-command.ts, src/scrapers/document-legacy/LegacyDocumentScraper.ts, src/cli/cli-commands/coder/generate-boilerplates.ts, src/collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory.ts, src/wizard/$getCompiledBook.ts, src/remote-server/startAgentServer.ts, src/scrapers/_common/utils/getScraperIntermediateSource.ts, src/utils/normalization/titleToName.ts, scripts/find-fresh-emoji-tag/find-fresh-emoji-tag.ts, scripts/find-refactor-candidates/find-refactor-candidates.ts, scripts/utils/prompts/getPromptNumbering.ts, scripts/run-codex-prompts/main/runCodexPrompts.ts, scripts/verify-prompts/verify-prompts.ts, src/llm-providers/_common/register/$provideLlmToolsForWizardOrCli.ts, src/utils/files/listAllFiles.ts, scripts/run-codex-prompts/common/normalizeLineEndingsInChangedFiles.ts, scripts/run-codex-prompts/git/commitChanges.ts, scripts/run-codex-prompts/migrations/runAutoMigrateTestingServers.ts, scripts/run-codex-prompts/prompts/buildPromptLabelForDisplay.ts, scripts/run-codex-prompts/prompts/loadPromptFiles.ts, scripts/run-codex-prompts/prompts/writePromptErrorLog.ts, scripts/run-codex-prompts/runners/cline/ClineRunner.ts, src/storage/env-storage/$EnvStorage.ts, src/storage/file-cache-storage/FileCacheStorage.ts, apps/agents-server/src/database/resolveMigrationsDirectory.ts, scripts/run-codex-prompts/prompts/parsePromptFile.ts, src/llm-providers/_common/register/$provideEnvFilename.ts, src/executables/platforms/locateAppOnWindows.ts, src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts, apps/agents-server/src/database/migratePrefix.ts, apps/agents-server/src/utils/runBrowserArtifactStorage.ts, apps/agents-server/src/tools/BrowserConnectionProvider.ts)
glob-promise (imported by src/cli/cli-commands/prettify.ts, src/cli/cli-commands/test-command.ts, scripts/find-fresh-emoji-tag/find-fresh-emoji-tag.ts, scripts/find-refactor-candidates/find-refactor-candidates.ts, scripts/utils/prompts/getPromptNumbering.ts, scripts/utils/prompts/promptEmojiTags.ts)
prompts (imported by src/cli/cli-commands/run.ts, src/cli/common/$provideLlmToolsForCli.ts, src/cli/cli-commands/runInteractiveChatbot.ts, scripts/verify-prompts/verify-prompts.ts)
@anthropic-ai/sdk (imported by src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts)
bottleneck (imported by src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts, src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts, src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts)
@azure/openai (imported by src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts)
openai (imported by src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts)
@mozilla/readability (imported by src/scrapers/website/WebsiteScraper.ts)
jsdom (imported by src/scrapers/website/WebsiteScraper.ts)
fs (imported by src/cli/cli-commands/coder/generate-boilerplates.ts, scripts/find-fresh-emoji-tag/find-fresh-emoji-tag.ts, scripts/find-refactor-candidates/find-refactor-candidates.ts, scripts/utils/prompts/promptEmojiTags.ts, scripts/run-codex-prompts/migrations/runAutoMigrateTestingServers.ts, apps/agents-server/src/database/resolveMigrationsDirectory.ts, apps/agents-server/src/database/migratePrefix.ts)
jszip (imported by src/conversion/archive/saveArchive.ts, src/conversion/archive/loadArchive.ts)
moment (imported by src/execution/execution-report/executionReportJsonToString.ts, scripts/run-codex-prompts/main/runCodexPrompts.ts, src/commitments/USE_TIME/USE_TIME.ts, scripts/run-codex-prompts/common/cliProgressDisplay.ts, scripts/run-codex-prompts/prompts/markPromptDone.ts, scripts/run-codex-prompts/prompts/markPromptFailed.ts, scripts/run-codex-prompts/prompts/writePromptErrorLog.ts)
express (imported by src/remote-server/startRemoteServer.ts)
express-openapi-validator (imported by src/remote-server/startRemoteServer.ts)
http (imported by src/remote-server/startRemoteServer.ts)
socket.io (imported by src/remote-server/startRemoteServer.ts)
swagger-ui-express (imported by src/remote-server/startRemoteServer.ts)
socket.io-client (imported by src/remote-server/createRemoteClient.ts)
crypto (imported by src/utils/random/$randomToken.ts, scripts/run-codex-prompts/common/normalizeLineEndingsInChangedFiles.ts, apps/agents-server/src/tools/runBrowserRuntime.ts)
child_process (imported by src/utils/execCommand/$execCommand.ts, scripts/run-codex-prompts/common/runGoScript/runScriptUntilMarkerIdle.ts)
crypto-js (imported by src/scrapers/_common/utils/getScraperIntermediateSource.ts, src/utils/misc/computeHash.ts, src/commands/KNOWLEDGE/utils/knowledgeSourceContentToName.ts, src/llm-providers/agent/AgentLlmExecutionTools.ts)
crypto-js/enc-hex (imported by src/scrapers/_common/utils/getScraperIntermediateSource.ts, src/utils/misc/computeHash.ts, src/storage/file-cache-storage/FileCacheStorage.ts, src/llm-providers/_common/utils/cache/cacheLlmTools.ts, src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts, src/commands/KNOWLEDGE/utils/knowledgeSourceContentToName.ts, src/llm-providers/agent/AgentLlmExecutionTools.ts)
showdown (imported by src/scrapers/website/utils/createShowdownConverter.ts)
dotenv (imported by scripts/find-fresh-emoji-tag/find-fresh-emoji-tag.ts, scripts/find-refactor-candidates/find-refactor-candidates.ts, src/storage/env-storage/$EnvStorage.ts, src/llm-providers/_common/register/$provideLlmToolsConfigurationFromEnv.ts)
typescript (imported by scripts/find-refactor-candidates/find-refactor-candidates.ts)
rxjs (imported by src/execution/ExecutionTask.ts, src/llm-providers/_common/utils/count-total-usage/countUsage.ts, src/llm-providers/agent/RemoteAgent.ts, src/types/Updatable.ts)
react (imported by src/remote-server/ui/renderServerIndexHtml.ts)
react-dom/server (imported by src/remote-server/ui/renderServerIndexHtml.ts)
readline (imported by scripts/run-codex-prompts/common/cliProgressDisplay.ts, scripts/run-codex-prompts/common/waitForEnter.ts, scripts/run-codex-prompts/common/waitForPause.ts)
pg (imported by scripts/run-codex-prompts/migrations/runAutoMigrateTestingServers.ts, apps/agents-server/src/database/runDatabaseMigrations.ts)
crypto-js/sha256 (imported by src/storage/file-cache-storage/FileCacheStorage.ts, src/llm-providers/_common/utils/cache/cacheLlmTools.ts, src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts)
mime-types (imported by src/utils/files/mimeTypeToExtension.ts, src/utils/files/extensionToMimeType.ts)
@supabase/supabase-js (imported by apps/agents-server/src/utils/serverRegistry.ts)
path/posix (imported by scripts/run-codex-prompts/common/runGoScript/withTempScript.ts)
os (imported by apps/agents-server/src/utils/runBrowserArtifactStorage.ts, apps/agents-server/src/tools/BrowserConnectionProvider.ts)
configchecker (imported by apps/agents-server/config.ts)
locate-app (imported by apps/agents-server/src/tools/BrowserConnectionProvider.ts)
playwright (imported by apps/agents-server/src/tools/BrowserConnectionProvider.ts)
papaparse (imported by src/formats/csv/CsvFormatParser.ts, src/formats/csv/utils/csvParse.ts)
@openai/agents (imported by src/llm-providers/openai/OpenAiAgentKitExecutionTools.ts)
(!) Missing global variable names
Use output.globals to specify browser global variable names corresponding to external modules
colors (guessing 'colors')
commander (guessing 'commander')
spacetrim (guessing 'spaceTrim$1')
fs (guessing 'fs')
path (guessing 'path')
waitasecond (guessing 'waitasecond')
prompts (guessing 'prompts')
fs/promises (guessing 'promises')
dotenv (guessing 'dotenv')
crypto-js/enc-hex (guessing 'hexEncoder')
crypto-js/sha256 (guessing 'sha256')
socket.io-client (guessing 'socket_ioClient')
crypto-js (guessing 'cryptoJs')
jszip (guessing 'JSZip')
crypto (guessing 'crypto')
@mozilla/readability (guessing 'readability')

jsdom (guessing 'jsdom')
showdown (guessing 'showdown')
os (guessing 'os')
configchecker (guessing 'configchecker')
locate-app (guessing 'locateApp$1')
playwright (guessing 'playwright')
glob-promise (guessing 'glob')
moment (guessing 'moment')
express (guessing 'express')
express-openapi-validator (guessing 'OpenApiValidator')
http (guessing 'http')
socket.io (guessing 'socket_io')
swagger-ui-express (guessing 'swaggerUi')
react (guessing 'react')
react-dom/server (guessing 'server')
@anthropic-ai/sdk (guessing 'Anthropic')
bottleneck (guessing 'Bottleneck')
@azure/openai (guessing 'openai')
typescript (guessing 'ts')
readline (guessing 'readline')
child_process (guessing 'child_process')
pg (guessing 'pg')
path/posix (guessing 'posix')
rxjs (guessing 'rxjs')
mime-types (guessing 'mimeTypes')
papaparse (guessing 'papaparse')
@openai/agents (guessing 'agents')
openai (guessing 'OpenAI')
(!) Circular dependencies
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
src/prepare/preparePipeline.ts -> src/execution/createPipelineExecutor/00-createPipelineExecutor.ts -> src/execution/createPipelineExecutor/10-executePipeline.ts -> src/prepare/preparePipeline.ts
src/book-2.0/agent-source/createAgentModelRequirements.ts -> src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.ts -> src/book-2.0/agent-source/createAgentModelRequirements.ts
(!) Use of eval is strongly discouraged
https://rollupjs.org/guide/en/#avoiding-eval
src/scripting/javascript/utils/extractVariablesFromJavascript.ts
18:         for (let i = 0; i < LOOP_LIMIT; i++)
19:             try {
20:                 eval(script); // <- TODO: Use `JavascriptExecutionTools.execute` here
                    ^
21:             }
22:             catch (error) {
src/scripting/javascript/JavascriptEvalExecutionTools.ts
160:         let result;
161:         try {
162:             result = await eval(statementToEvaluate);
                                ^
163:             if (this.options.isVerbose) {
164:                 console.info(_spaceTrim((block) => `
created ./packages/cli/esm/index.es.js, ./packages/cli/umd/index.umd.js in 6h 19m 43s

::group::Node Used resources
🕑 Building 7 minutes
🧠 Memory: rss=288.7MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 8 minutes
🧠 Memory: rss=288.7MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 9 minutes
🧠 Memory: rss=288.7MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 10 minutes
🧠 Memory: rss=288.7MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 11 minutes
🧠 Memory: rss=288.7MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 12 minutes
🧠 Memory: rss=288.7MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 13 minutes
🧠 Memory: rss=288.7MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 14 minutes
🧠 Memory: rss=288.7MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 15 minutes
🧠 Memory: rss=288.7MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 48ms
::endgroup::
::group::Node Used resources
🕑 Building 16 minutes
🧠 Memory: rss=235.3MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 17 minutes
🧠 Memory: rss=235.3MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 18 minutes
🧠 Memory: rss=235.3MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 19 minutes
🧠 Memory: rss=235.3MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 20 minutes
🧠 Memory: rss=235.3MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 21 minutes
🧠 Memory: rss=235.3MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 22 minutes
🧠 Memory: rss=235.3MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 23 minutes
🧠 Memory: rss=235.3MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 24 minutes
🧠 Memory: rss=235.3MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 25 minutes
🧠 Memory: rss=235.3MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 26 minutes
🧠 Memory: rss=7.2MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 17ms
::endgroup::
::group::Node Used resources
🕑 Building 27 minutes
🧠 Memory: rss=7.2MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 28 minutes
🧠 Memory: rss=7.2MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 29 minutes
🧠 Memory: rss=7.2MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 30 minutes
🧠 Memory: rss=7.2MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 31 minutes
🧠 Memory: rss=6.6MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 32 minutes
🧠 Memory: rss=6.6MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 33 minutes
🧠 Memory: rss=6.7MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 34 minutes
🧠 Memory: rss=6.7MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 35 minutes
🧠 Memory: rss=6.7MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 36 minutes
🧠 Memory: rss=5.7MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 37 minutes
🧠 Memory: rss=5.7MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 38 minutes
🧠 Memory: rss=5.7MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 39 minutes
🧠 Memory: rss=5.7MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 40 minutes
🧠 Memory: rss=5.7MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 41 minutes
🧠 Memory: rss=5.3MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 42 minutes
🧠 Memory: rss=5.4MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 43 minutes
🧠 Memory: rss=5.4MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 44 minutes
🧠 Memory: rss=5.4MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 45 minutes
🧠 Memory: rss=5.4MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 46 minutes
🧠 Memory: rss=5.3MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 47 minutes
🧠 Memory: rss=5.4MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 48 minutes
🧠 Memory: rss=5.4MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 49 minutes
🧠 Memory: rss=5.4MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 50 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 51 minutes
🧠 Memory: rss=5.3MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 52 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 53 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 54 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 55 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 56 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 57 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 58 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 59 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 60 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 61 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 62 minutes
🧠 Memory: rss=5.4MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 63 minutes
🧠 Memory: rss=5.4MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 64 minutes
🧠 Memory: rss=5.4MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 65 minutes
🧠 Memory: rss=5.4MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 66 minutes
🧠 Memory: rss=5.4MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 67 minutes
🧠 Memory: rss=5.4MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 68 minutes
🧠 Memory: rss=5.4MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 69 minutes
🧠 Memory: rss=5.5MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 70 minutes
🧠 Memory: rss=5.5MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 71 minutes
🧠 Memory: rss=5.5MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 72 minutes
🧠 Memory: rss=5.5MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 73 minutes
🧠 Memory: rss=5.5MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 74 minutes
🧠 Memory: rss=5.5MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 75 minutes
🧠 Memory: rss=5.5MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 76 minutes
🧠 Memory: rss=11.6MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 77 minutes
🧠 Memory: rss=11.6MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 22ms
::endgroup::
::group::Node Used resources
🕑 Building 78 minutes
🧠 Memory: rss=11.6MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 79 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 80 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 81 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 82 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 83 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 84 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 85 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 86 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 87 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 45ms
::endgroup::
::group::Node Used resources
🕑 Building 88 minutes
🧠 Memory: rss=11.7MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 89 minutes
🧠 Memory: rss=11.7MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 90 minutes
🧠 Memory: rss=11.7MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 91 minutes
🧠 Memory: rss=11.7MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 92 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 93 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 94 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 95 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 96 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 97 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 98 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 99 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 100 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 101 minutes
🧠 Memory: rss=11.8MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 102 minutes
🧠 Memory: rss=11.8MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 103 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 104 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 105 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 106 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 107 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 108 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 109 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 110 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 111 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 112 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 113 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 114 minutes
🧠 Memory: rss=11.9MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 115 minutes
🧠 Memory: rss=11.9MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 0ms
::endgroup::
::group::Node Used resources
🕑 Building 116 minutes
🧠 Memory: rss=12.0MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 117 minutes
🧠 Memory: rss=12.0MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 118 minutes
🧠 Memory: rss=12.0MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 119 minutes
🧠 Memory: rss=15.5MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 120 minutes
🧠 Memory: rss=15.5MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 121 minutes
🧠 Memory: rss=15.5MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 122 minutes
🧠 Memory: rss=15.5MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 123 minutes
🧠 Memory: rss=15.5MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 124 minutes
🧠 Memory: rss=15.5MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 0ms
::endgroup::
::group::Node Used resources
🕑 Building 125 minutes
🧠 Memory: rss=15.5MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 126 minutes
🧠 Memory: rss=15.6MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 127 minutes
🧠 Memory: rss=15.6MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: -1ms
::endgroup::
::group::Node Used resources
🕑 Building 128 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 129 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 130 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 0ms
::endgroup::
::group::Node Used resources
🕑 Building 131 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 132 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 133 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 134 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 135 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 136 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 137 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 138 minutes
🧠 Memory: rss=15.6MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 139 minutes
🧠 Memory: rss=15.7MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 140 minutes
🧠 Memory: rss=15.7MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 141 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 142 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 143 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 144 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 145 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 146 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 147 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 31ms
::endgroup::
::group::Node Used resources
🕑 Building 148 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 149 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 150 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 151 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 18ms
::endgroup::
::group::Node Used resources
🕑 Building 152 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 153 minutes
🧠 Memory: rss=15.7MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 154 minutes
🧠 Memory: rss=15.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 155 minutes
🧠 Memory: rss=15.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 156 minutes
🧠 Memory: rss=15.7MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 157 minutes
🧠 Memory: rss=15.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 158 minutes
🧠 Memory: rss=15.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 159 minutes
🧠 Memory: rss=15.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 160 minutes
🧠 Memory: rss=15.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 161 minutes
🧠 Memory: rss=8.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 162 minutes
🧠 Memory: rss=8.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 24ms
::endgroup::
::group::Node Used resources
🕑 Building 163 minutes
🧠 Memory: rss=8.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 164 minutes
🧠 Memory: rss=8.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 17ms
::endgroup::
::group::Node Used resources
🕑 Building 165 minutes
🧠 Memory: rss=8.8MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 175ms
::endgroup::
::group::Node Used resources
🕑 Building 166 minutes
🧠 Memory: rss=9.9MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 78ms
::endgroup::
::group::Node Used resources
🕑 Building 167 minutes
🧠 Memory: rss=9.9MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 168 minutes
🧠 Memory: rss=10.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 169 minutes
🧠 Memory: rss=10.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 19ms
::endgroup::
::group::Node Used resources
🕑 Building 170 minutes
🧠 Memory: rss=10.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 171 minutes
🧠 Memory: rss=10.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 172 minutes
🧠 Memory: rss=14.8MB heapUsed=260.2MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 173 minutes
🧠 Memory: rss=14.8MB heapUsed=260.2MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 174 minutes
🧠 Memory: rss=14.8MB heapUsed=260.2MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 175 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: -1ms
::endgroup::
::group::Node Used resources
🕑 Building 176 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 177 minutes
🧠 Memory: rss=14.8MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 178 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 179 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 180 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 181 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 182 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 21ms
::endgroup::
::group::Node Used resources
🕑 Building 183 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 184 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 185 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 186 minutes
🧠 Memory: rss=14.9MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 187 minutes
🧠 Memory: rss=14.2MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 188 minutes
🧠 Memory: rss=14.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 189 minutes
🧠 Memory: rss=14.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 0ms
::endgroup::
::group::Node Used resources
🕑 Building 190 minutes
🧠 Memory: rss=14.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 21ms
::endgroup::
::group::Node Used resources
🕑 Building 191 minutes
🧠 Memory: rss=14.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 18ms
::endgroup::
::group::Node Used resources
🕑 Building 192 minutes
🧠 Memory: rss=12.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 193 minutes
🧠 Memory: rss=12.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 194 minutes
🧠 Memory: rss=12.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 195 minutes
🧠 Memory: rss=12.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 196 minutes
🧠 Memory: rss=12.2MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 197 minutes
🧠 Memory: rss=9.0MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 198 minutes
🧠 Memory: rss=9.0MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 199 minutes
🧠 Memory: rss=9.0MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 26ms
::endgroup::
::group::Node Used resources
🕑 Building 200 minutes
🧠 Memory: rss=9.0MB heapUsed=260.4MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 0ms
::endgroup::
::group::Node Used resources
🕑 Building 201 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 202 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 21ms
::endgroup::
::group::Node Used resources
🕑 Building 203 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 204 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 205 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 206 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 207 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 208 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 209 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 281ms
::endgroup::
::group::Node Used resources
🕑 Building 210 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 211 minutes
🧠 Memory: rss=9.1MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 212 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 213 minutes
🧠 Memory: rss=9.0MB heapUsed=260.5MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 214 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 0ms
::endgroup::
::group::Node Used resources
🕑 Building 215 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 216 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 217 minutes
🧠 Memory: rss=9.0MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 218 minutes
🧠 Memory: rss=9.0MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 219 minutes
🧠 Memory: rss=9.0MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 220 minutes
🧠 Memory: rss=9.0MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 221 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 222 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 223 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 31ms
::endgroup::
::group::Node Used resources
🕑 Building 224 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 225 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 226 minutes
🧠 Memory: rss=9.1MB heapUsed=260.6MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 227 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 228 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 229 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 7ms
::endgroup::
::group::Node Used resources
🕑 Building 230 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 231 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 232 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 233 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 234 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 235 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 236 minutes
🧠 Memory: rss=9.1MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 237 minutes
🧠 Memory: rss=9.2MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 238 minutes
🧠 Memory: rss=9.2MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 239 minutes
🧠 Memory: rss=10.3MB heapUsed=260.7MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 240 minutes
🧠 Memory: rss=10.3MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 241 minutes
🧠 Memory: rss=10.9MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 242 minutes
🧠 Memory: rss=10.9MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 243 minutes
🧠 Memory: rss=10.9MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 244 minutes
🧠 Memory: rss=10.9MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 245 minutes
🧠 Memory: rss=10.9MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 246 minutes
🧠 Memory: rss=10.9MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 247 minutes
🧠 Memory: rss=10.9MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 248 minutes
🧠 Memory: rss=11.0MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 249 minutes
🧠 Memory: rss=11.0MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 250 minutes
🧠 Memory: rss=11.0MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 251 minutes
🧠 Memory: rss=11.0MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 252 minutes
🧠 Memory: rss=10.9MB heapUsed=260.8MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 253 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 9ms
::endgroup::
::group::Node Used resources
🕑 Building 254 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 255 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
::endgroup::
::group::Node Used resources
🕑 Building 256 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 257 minutes
🧠 Memory: rss=10.9MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 258 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 4ms
::endgroup::
::group::Node Used resources
🕑 Building 259 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 260 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 261 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 13ms
::endgroup::
::group::Node Used resources
🕑 Building 262 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
::endgroup::
::group::Node Used resources
🕑 Building 263 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 264 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 265 minutes
🧠 Memory: rss=11.0MB heapUsed=260.9MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 266 minutes
🧠 Memory: rss=11.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 267 minutes
🧠 Memory: rss=10.9MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 1ms
::endgroup::
::group::Node Used resources
🕑 Building 268 minutes
🧠 Memory: rss=10.9MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 269 minutes
🧠 Memory: rss=10.9MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 270 minutes
🧠 Memory: rss=10.9MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 271 minutes
🧠 Memory: rss=11.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 6ms
::endgroup::
::group::Node Used resources
🕑 Building 272 minutes
🧠 Memory: rss=11.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
::endgroup::
::group::Node Used resources
🕑 Building 273 minutes
🧠 Memory: rss=11.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 274 minutes
🧠 Memory: rss=11.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
::endgroup::
::group::Node Used resources
🕑 Building 275 minutes
🧠 Memory: rss=11.0MB heapUsed=261.0MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 2ms
::endgroup::
::group::Node Used resources
🕑 Building 276 minutes
🧠 Memory: rss=15.5MB heapUsed=260.2MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
::endgroup::
::group::Node Used resources
🕑 Building 277 minutes
🧠 Memory: rss=14.4MB heapUsed=260.2MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 15ms
::endgroup::
::group::Node Used resources
🕑 Building 278 minutes
🧠 Memory: rss=14.4MB heapUsed=260.2MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 3ms
::endgroup::
::group::Node Used resources
🕑 Building 279 minutes
🧠 Memory: rss=14.4MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 40ms
::endgroup::
::group::Node Used resources
🕑 Building 280 minutes
🧠 Memory: rss=14.4MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 5ms
::endgroup::
::group::Node Used resources
🕑 Building 281 minutes
🧠 Memory: rss=14.4MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 66ms
::endgroup::
::group::Node Used resources
🕑 Building 282 minutes
🧠 Memory: rss=14.2MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
::endgroup::
::group::Node Used resources
🕑 Building 283 minutes
🧠 Memory: rss=14.2MB heapUsed=260.3MB heapTotal=266.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 68ms
::endgroup::

```

