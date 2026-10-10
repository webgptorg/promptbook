[x] by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account) - Implementation ~$0.5084 37 minutes; Testing 14 minutes

[✨😯] Fix the existing test failures before implementing any queued coding tasks.

The verification command `npm run test-for-ptbk-coder` failed before coding started. Fix the underlying failure without weakening or removing the tests, and leave the project ready for the remaining coding prompts.

## Verification output

```
[..., test output truncated to the last 12000 characters...]
SS src/book-3.0/AgentMessageRunReport.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/chat/formatChatTimeoutRemainingTime.test.ts
PASS src/book-components/Chat/utils/splitMessageContentIntoSegments.test.ts
PASS src/utils/validators/url/isValidAgentUrl.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/AgentProfileChat.navigation.test.ts
PASS scripts/run-codex-prompts/isolation/coderIsolationCheckoutFailureReport.test.ts
PASS src/utils/take/take.test.ts
PASS src/utils/normalization/suffixUrl.test.ts
PASS apps/agents-server/src/utils/speech-to-text/SpeechToTextFailoverRecognition.test.ts
PASS src/cli/other/install.test.ts
PASS src/execution/resolveTaskTldr.test.ts
PASS src/collection/agent-collection/constructors/agent-collection-in-supabase/buildAgentNameOrPermanentIdFilter.test.ts
PASS src/utils/validators/javascriptName/isValidJavascriptName.test.ts
PASS scripts/run-codex-prompts/common/runGoScript/withTempScript.test.ts
PASS apps/agents-server/src/app/admin/_components/adminTableSorting.test.ts
PASS src/utils/sets/intersection.test.ts
PASS src/utils/normalization/nameToUriParts.test.ts
PASS src/utils/files/isFileExisting.test.ts
PASS src/commitments/ACTION/ACTION.test.ts
PASS apps/agents-server/src/utils/userChat/persistFrozenUserChat.test.ts
PASS apps/agents-server/src/utils/email/agentEmailAddress.test.ts
PASS src/cli/cli-commands/common/npm/isNpmPackageVersionOutdated.test.ts
PASS src/utils/validators/url/isUrlOnPrivateNetwork.test.ts
PASS scripts/run-codex-prompts/common/waitForSkippableWorldTimeDeadline.test.ts
PASS src/utils/files/decodeAttachmentAsText.test.ts
PASS src/utils/normalization/normalizeWhitespaces.test.ts
PASS src/commitments/USE_CALENDAR/USE_CALENDAR.test.ts
PASS src/utils/agent-message-runtime/resolveAgentMessageTouchedProjectNames.test.ts
PASS src/book-components/BookEditor/BookEditorMonacoTokenization.test.ts
PASS apps/agents-server/src/utils/userChat/resolveUserChatWorkerInternalToken.test.ts
PASS apps/agents-server/src/utils/userChat/triggerUserChatJobWorker.test.ts
PASS apps/agents-server/src/utils/agentProjects/createAgentProjectDnsRecords.test.ts
PASS apps/agents-server/src/utils/agentProjects/listAgentProjectChatReferences.test.ts
PASS src/utils/validators/filePath/isValidFilePath.test.ts
PASS src/formats/json/utils/isValidJsonString.test.ts
PASS src/book-components/Chat/utils/ChatPersistence.test.ts
PASS scripts/run-codex-prompts/ui/buildCoderRunUiTerminalFrameUpdate.test.ts
PASS scripts/run-codex-prompts/prompts/promptRunnerFiltering.test.ts
PASS src/utils/expectation-counters/countSentences.test.ts
PASS src/execution/utils/addUsage.test.ts
PASS apps/agents-server/src/components/Header/resolveHeaderSystemActivities.test.ts
PASS apps/agents-server/src/utils/createAgentWithDefaultVisibility.test.ts
PASS src/utils/validators/url/isValidUrl.test.ts
PASS src/utils/validators/filePath/isRootPath.test.ts
PASS apps/agents-server/src/utils/userChatTimeout/plannedMessageSchedule/resolvePlannedMessageDueAt.test.ts
PASS apps/agents-server/src/utils/getAdminChatTasksResponse/getAdminChatTasks/compareAdminChatTasks.test.ts
PASS scripts/run-codex-prompts/prompts/printStats.test.ts
PASS src/utils/normalization/searchKeywords.test.ts
PASS src/utils/normalization/parseKeywordsFromString.test.ts
PASS src/utils/normalization/parseKeywords.test.ts
PASS src/utils/expectation-counters/countWords.test.ts
PASS src/utils/normalization/normalize-to-kebab-case.test.ts
PASS src/execution/execution-report/countWorkingDuration.test.ts
PASS src/utils/expectation-counters/countPages.test.ts
PASS src/executables/platforms/locateAppOnWindows.test.ts
PASS src/executables/browsers/locateDefaultSystemBrowser.test.ts
PASS apps/agents-server/src/constants/chatVisualMode.test.ts
PASS src/book-components/Chat/utils/timeoutToolCallPresentation.test.ts
PASS scripts/run-codex-prompts/git/gitLongPathsSupport.test.ts
PASS book/scripts/import-markdown/increaseHeadings.test.ts
PASS src/utils/markdown/extractAllListItemsFromMarkdown.test.ts
PASS src/utils/misc/debounce.test.ts
PASS src/utils/execCommand/execCommandNormalizeOptions.test.ts
PASS apps/agents-server/src/utils/stalwart/resolveStalwartApiUrl.test.ts
PASS apps/agents-server/src/utils/agentRouting/agentRouteHrefs.test.ts
PASS apps/agents-server/src/components/Homepage/loadFederatedServerAgents.test.ts
PASS src/utils/validators/url/isHostnameOnPrivateNetwork.test.ts
PASS apps/agents-server/src/utils/agentIdentifier.test.ts
PASS src/utils/validators/semanticVersion/isValidPromptbookVersion.test.ts
PASS src/formats/xml/utils/isValidXmlString.test.ts
PASS src/cli/cli-commands/common/harnessUpdateCliOptions.test.ts
PASS src/utils/serialization/serializeToPromptbookJavascript.test.ts
PASS scripts/run-codex-prompts/ui/refreshCoderRunUiSubscriptionUsage.test.ts
PASS src/utils/normalization/normalizeTo_PascalCase.test.ts
PASS src/transpilers/_common/formatUsedToolFunctions.test.ts
PASS src/conversion/validation/_importPipeline.test.ts
PASS apps/agents-server/src/utils/userChat/userChatJobState.test.ts
PASS apps/agents-server/src/utils/messages/humanizeOutboundEmail.test.ts
PASS src/cli/cli-commands/common/harness/resolveHarnessUpdatePlan.test.ts
PASS scripts/run-codex-prompts/runners/gemini/buildGeminiScript.test.ts
PASS src/utils/validators/url/extractUrlsFromText.test.ts
PASS scripts/run-codex-prompts/common/appendCoderContext.test.ts
PASS src/book-components/Chat/utils/parseCitationsFromContent.test.ts
PASS src/utils/sets/difference.test.ts
PASS src/utils/normalization/normalizeTo_snake_case.test.ts
PASS src/utils/expectation-counters/countCharacters.test.ts
PASS src/commitments/_common/getCommitmentNoticeMetadata.test.ts
PASS src/commitments/USE_PROJECT/projectReference.test.ts
PASS src/commitments/META_DISCLAIMER/META_DISCLAIMER.test.ts
PASS apps/agents-server/src/utils/agentReferenceResolver/$provideAgentReferenceResolver.test.ts
PASS scripts/find-refactor-candidates/RefactorCandidateLevel.test.ts
PASS src/storage/file-cache-storage/utils/nameToSubfolderPath.test.ts
PASS src/utils/validators/url/isValidPipelineUrl.test.ts
PASS src/book-components/Chat/utils/thinkingMessageVariants.test.ts
PASS src/book-components/Chat/utils/parseImagePrompts.test.ts
PASS src/utils/normalization/removeQuotes.test.ts
PASS src/utils/normalization/orderJson.test.ts
PASS src/execution/utils/usageToWorktime.test.ts
PASS src/executables/apps/locateLibreoffice.test.ts
PASS src/cli/common/$deprecateCliCommand.test.ts
PASS apps/agents-server/src/utils/stalwart/stalwartJmapValues.test.ts
PASS apps/agents-server/src/utils/agentOrganization/hiddenFolders.test.ts
PASS src/speech-recognition/OpenAiSpeechRecognition.test.ts
PASS apps/agents-server/src/utils/standaloneVpsRawIpBootstrap.test.ts
PASS src/book-components/Chat/Chat/refineFinalDictationChunk.test.ts
PASS src/book-components/Chat/Chat/insertDictationChunk.test.ts
PASS src/utils/normalization/removeEmojis.test.ts
PASS src/utils/normalization/normalizeTo_camelCase.test.ts
PASS src/utils/knowledge/simplifyKnowledgeLabel.test.ts
PASS src/utils/markdown/extractAllBlocksFromMarkdown-real.test.ts
PASS src/utils/expectation-counters/countLines.test.ts
PASS src/utils/filesystem/promptbookTemporaryPath.test.ts
PASS apps/agents-server/src/utils/agentGoalChat/agentGoalChatIdentity.test.ts
PASS src/book-2.0/agent-source/normalizeAgentName.test.ts
PASS apps/agents-server/src/components/UsersList/generateSecurePassword.test.ts
PASS src/cli/cli-commands/agents-server/startAgentsServer/AgentsServerChildEnvironment.test.ts
PASS src/utils/validators/uuid/isValidUuid.test.ts
PASS src/utils/validators/url/normalizeDomainForMatching.test.ts
PASS scripts/run-codex-prompts/isolation/coderIsolationNaming.test.ts
PASS src/utils/normalization/capitalize.test.ts
PASS src/utils/markdown/trimEndOfCodeBlock.test.ts
PASS src/utils/markdown/removeMarkdownLinks.test.ts
PASS src/utils/markdown/escapeMarkdownBlock.test.ts
PASS apps/agents-server/src/utils/stalwart/createEmailDnsInstructions.test.ts
PASS apps/agents-server/src/utils/agentBook/createAgentBookDownloadFilename.test.ts
PASS src/cli/cli-commands/common/npm/buildNpmPackageInstallCommand.test.ts
PASS src/utils/validators/email/isValidEmail.test.ts
PASS src/utils/serialization/asSerializable.test.ts
PASS src/utils/normalization/nameToUriPart.test.ts
PASS src/cli/cli-commands/coder/getTypescriptModule.test.ts
PASS src/execution/utils/formatUsagePrice.test.ts
PASS src/book-components/Chat/utils/resolveCitationUrl.test.ts
PASS src/utils/normalization/decapitalize.test.ts
PASS src/utils/color/Color.test.ts
PASS apps/agents-server/src/utils/userWallet/resolveWalletAgentPermanentId.test.ts
PASS apps/agents-server/src/utils/cloudflare/createCloudflareDnsRecordRequestBody.test.ts
PASS scripts/run-agent-messages/messages/buildAgentMessageScriptPath.test.ts
PASS src/utils/normalization/isValidKeyword.test.ts
PASS src/utils/files/getFileExtension.test.ts
PASS src/llm-providers/_common/utils/pricing.test.ts
PASS apps/agents-server/src/utils/pagePreviewBrowserSessions.test.ts
PASS src/book-components/Chat/Chat/learnDictationDictionary.test.ts
PASS src/utils/sets/union.test.ts
PASS apps/agents-server/src/utils/userChatTimeout/createUserChatTimeoutActivity.test.ts
PASS src/utils/validators/semanticVersion/isValidSemanticVersion.test.ts
PASS apps/agents-server/src/utils/chat/createWordLikeDeltas.test.ts
PASS src/utils/normalization/removeDiacritics.test.ts

Test Suites: 738 passed, 738 total
Tests:       7 todo, 3230 passed, 3237 total
Snapshots:   0 total
Time:        478.93 s, estimated 492 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?

> lint
> eslint src/ --max-warnings=0 --cache --cache-location ./node_modules/.cache/eslint/agents-server-src.json


> pretest-build
> node ./scripts/kill-port.js 4021 4440

No process is listening on port 4021.
No process is listening on port 4440.

> test-build
> npm run build


> prebuild
> npm run generate-reserved-paths && node ./scripts/clearNextGeneratedTypes.js && node ./scripts/kill-port.js 4440


> generate-reserved-paths
> ts-node --transpile-only ./scripts/generate-reserved-paths/generate-reserved-paths.ts

Kept C:\Users\me\work\ai\promptbook\apps\agents-server\src\generated\reservedPaths.ts unchanged with 31 reserved paths.
No process is listening on port 4440.

> build
> node ./scripts/build-agents-server.js

   ▲ Next.js 15.4.11
   - Environments: .env
   - Experiments (use with caution):
     ✓ externalDir
     ✓ webpackBuildWorker
     · clientTraceMetadata
     ✓ parallelServerBuildTraces

   Creating an optimized production build ...
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (127kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (126kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (139kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
Failed to compile.

./..\..\node_modules\better-sqlite3\lib\database.js
Dynamic Code Evaluation (e. g. 'eval', 'new Function', 'WebAssembly.compile') not allowed in Edge Runtime 
Learn More: https://nextjs.org/docs/messages/edge-dynamic-code-evaluation

Import trace for requested module:
  ./..\..\node_modules\better-sqlite3\lib\database.js
  ./..\..\node_modules\better-sqlite3\lib\index.js
  ./src\database\sqlite\$provideAgentsServerSqliteDatabase.ts
  ./src\database\sqlite\standaloneServerRegistryStore.ts
  ./src\utils\serverRegistry.ts
  ./src\middleware\createMiddlewareRequestContext\loadRegisteredServers.ts
  ./src\middleware\createMiddlewareRequestContext.ts
  ./src\middleware.ts


> Build failed because of webpack errors
Verification step `test-build` failed with code 1 and signal null.
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](CHANGELOG.md)
-   Update the [README](README.md) if needed.
-   Update the [AGENTS.md](AGENTS.md) for the next job to be done if it makes sense.

