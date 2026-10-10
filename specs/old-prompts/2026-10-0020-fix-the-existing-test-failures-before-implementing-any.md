[x] by Promptbook Developer on OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation $2.25 7 minutes; Testing 3 minutes

[✨🕖] Fix the existing test failures before implementing any queued coding tasks.

The verification command `npm run test-for-ptbk-coder` failed before coding started. Fix the underlying failure without weakening or removing the tests, and leave the project ready for the remaining coding prompts.

## Verification output

```
[..., test output truncated to the last 12000 characters...]
serChat/userChatReplies.test.ts
PASS apps/agents-server/src/utils/userChat/userChatJobState.test.ts
PASS apps/agents-server/src/utils/userChat/runDurableUserChatJobWorkerTick.test.ts
PASS apps/agents-server/src/utils/userChat/resolveUserChatWorkerInternalToken.test.ts
PASS apps/agents-server/src/utils/userChat/heartbeatUserChatJob.test.ts
PASS apps/agents-server/src/utils/speech-to-text/SpeechToTextFailoverRecognition.test.ts
PASS apps/agents-server/src/utils/resourceMonitor/resolveServerResourceWarningStatus.test.ts
PASS apps/agents-server/src/utils/normalization/normalizeUploadFilename.test.ts
PASS apps/agents-server/src/utils/normalization/filenameToPrompt.test.ts
PASS apps/agents-server/src/utils/messages/sendMessage.test.ts
PASS apps/agents-server/src/utils/localChatRunner/persistLocalTeamConversations.test.ts
PASS apps/agents-server/src/utils/externalChatRunner/GithubRepositoryClient.test.ts
PASS apps/agents-server/src/utils/agentProjects/listAgentProjectChatReferences.test.ts
PASS apps/agents-server/src/utils/agentOrganization/hiddenFolders.test.ts
PASS apps/agents-server/src/components/UsersList/generateSecurePassword.test.ts
PASS apps/agents-server/src/components/NewAgentDialog/NewAgentWizardState.test.ts
PASS apps/agents-server/src/components/Header/resolveHeaderSystemActivities.test.ts
PASS src/utils/normalization/parseKeywordsFromString.test.ts
PASS src/utils/normalization/parseKeywords.test.ts
PASS src/utils/normalization/nameToUriParts.test.ts
PASS src/utils/normalization/isValidKeyword.test.ts
PASS src/utils/sets/union.test.ts
PASS src/utils/parameters/numberToString.test.ts
PASS src/utils/parameters/extractParameterNames.test.ts
PASS src/utils/misc/debounce.test.ts
PASS src/utils/markdown/trimCodeBlock.test.ts
PASS src/utils/markdown/parseMarkdownSection.test.ts
PASS src/utils/markdown/createMarkdownChart.test.ts
PASS src/utils/files/listAllFiles.test.ts
PASS src/utils/files/extensionToMimeType.test.ts
PASS src/utils/files/decodeAttachmentAsText.test.ts
PASS src/utils/knowledge/inlineKnowledgeSource.test.ts
PASS src/utils/execCommand/execCommandNormalizeOptions.test.ts
PASS src/execution/utils/addUsage.test.ts
PASS src/commitments/_common/getCommitmentNoticeMetadata.test.ts
PASS src/commitments/ACTION/ACTION.test.ts
PASS src/conversion/utils/extractParameterNamesFromTask.test.ts
PASS src/conversion/validation/_importPipeline.test.ts
PASS src/cli/common/$hideCliCommandFromHelp.test.ts
PASS src/cli/common/$deprecateCliCommand.test.ts
PASS scripts/verify-prompts/VerifyPromptsOrder.test.ts
PASS apps/agents-server/src/utils/userPushNotificationSettings.test.ts
PASS apps/agents-server/src/utils/standaloneVpsDnsDiagnostics.test.ts
PASS apps/agents-server/src/utils/resolveCurrentOrInternalServerOrigin.test.ts
PASS apps/agents-server/src/utils/chatEnterBehaviorSettings.test.ts
PASS src/execution/resolveTaskTldr.test.ts
PASS apps/agents-server/src/components/NewAgentDialog/ManGoNewAgentWizard/services/bookService.test.ts
PASS src/collection/agent-collection/constructors/agent-collection-in-supabase/buildAgentNameOrPermanentIdFilter.test.ts
PASS src/cli/cli-commands/common/promptbook-cli/$checkPromptbookCliInstallations.test.ts
PASS src/cli/cli-commands/common/disk-space/resolveFreeDiskSpaceLevel.test.ts
PASS src/cli/cli-commands/common/disk-space/formatFreeDiskSpaceBytes.test.ts
PASS src/cli/cli-commands/common/disk-space/$readFreeDiskSpaceStatus.test.ts
PASS src/cli/cli-commands/common/npm/isNpmPackageVersionOutdated.test.ts
PASS src/cli/cli-commands/common/npm/extractNpmPackageVersionFromOutput.test.ts
PASS scripts/run-codex-prompts/runners/openai-codex/getCodexSubscriptionUsage.test.ts
PASS scripts/run-codex-prompts/runners/qwen-code/buildQwenCodeScript.test.ts
PASS scripts/run-codex-prompts/runners/common/extractHarnessAuthenticationFailureReason.test.ts
PASS scripts/run-codex-prompts/runners/claude-code/ClaudeCodeSessionResurrection.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/AgentProfileChat.navigation.test.ts
PASS apps/agents-server/src/app/admin/_components/adminTableSorting.test.ts
PASS src/utils/validators/url/isValidAgentUrl.test.ts
PASS src/utils/validators/url/isUrlOnPrivateNetwork.test.ts
PASS src/llm-providers/_common/utils/pricing.test.ts
PASS src/utils/validators/uuid/isValidUuid.test.ts
PASS src/book-components/Chat/utils/thinkingMessageVariants.test.ts
PASS src/formats/json/utils/isValidJsonString.test.ts
PASS src/book-components/Chat/utils/sanitizeStreamingMessageContent.test.ts
PASS src/book-components/Chat/utils/parseCitationsFromContent.test.ts
PASS src/book-components/Chat/CodeBlock/resolveCodeBlockLanguage.test.ts
PASS scripts/run-codex-prompts/prompts/formatCoderRunSteps.test.ts
PASS scripts/run-codex-prompts/prompts/buildPromptRunTracePath.test.ts
PASS scripts/run-codex-prompts/prompts/formatRunnerSignature.test.ts
PASS scripts/run-codex-prompts/isolation/coderIsolationNaming.test.ts
PASS scripts/run-codex-prompts/isolation/coderIsolationCheckoutFailureReport.test.ts
PASS scripts/run-agent-messages/messages/buildAgentMessageScriptPath.test.ts
PASS scripts/run-codex-prompts/common/appendCoderContext.test.ts
PASS book/scripts/import-markdown/increaseHeadings.test.ts
PASS apps/agents-server/src/utils/userWallet/resolveWalletAgentPermanentId.test.ts
PASS apps/agents-server/src/utils/userChat/triggerUserChatJobWorker.test.ts
PASS apps/agents-server/src/utils/userChat/persistFrozenUserChat.test.ts
PASS apps/agents-server/src/utils/userChat/UserChatScopeError.test.ts
PASS apps/agents-server/src/utils/userChat/getUserChatForJobRunner.test.ts
PASS apps/agents-server/src/utils/upload/fileUploadAvailability.test.ts
PASS apps/agents-server/src/utils/stalwart/stalwartJmapValues.test.ts
PASS apps/agents-server/src/utils/stalwart/resolveStalwartApiUrl.test.ts
PASS apps/agents-server/src/utils/stalwart/createEmailDnsInstructions.test.ts
PASS apps/agents-server/src/utils/localChatRunner/LocalUserChatJobMetadata.test.ts
PASS apps/agents-server/src/utils/email/agentEmailAddress.test.ts
PASS apps/agents-server/src/utils/chat/createWordLikeDeltas.test.ts
PASS apps/agents-server/src/utils/dnsRecords/resolveDnsRecordBatchPlan.test.ts
PASS apps/agents-server/src/components/ViewportHeightController/resolveVisibleViewportHeight.test.ts
PASS apps/agents-server/src/utils/agentRouting/agentRouteHrefs.test.ts
PASS apps/agents-server/src/components/Homepage/loadFederatedServerAgents.test.ts
PASS apps/agents-server/src/components/AdminTerminal/useAdminTerminalSession.test.ts
PASS src/utils/normalization/normalizeTo_snake_case.test.ts
PASS src/utils/normalization/normalizeTo_camelCase.test.ts
PASS src/utils/normalization/normalize-to-kebab-case.test.ts
PASS src/utils/normalization/normalizeTo_PascalCase.test.ts
PASS src/utils/normalization/capitalize.test.ts
PASS src/utils/serialization/asSerializable.test.ts
PASS src/utils/markdown/trimEndOfCodeBlock.test.ts
PASS src/utils/markdown/removeMarkdownFormatting.test.ts
PASS src/utils/markdown/removeMarkdownComments.test.ts
PASS src/utils/markdown/extractAllListItemsFromMarkdown.test.ts
PASS src/utils/markdown/extractAllBlocksFromMarkdown-real.test.ts
PASS src/utils/files/isFileExisting.test.ts
PASS src/utils/files/getFileExtension.test.ts
PASS src/utils/knowledge/simplifyKnowledgeLabel.test.ts
PASS src/utils/filesystem/promptbookTemporaryPath.test.ts
PASS src/utils/expectation-counters/countParagraphs.test.ts
PASS src/utils/expectation-counters/countPages.test.ts
PASS src/utils/expectation-counters/countLines.test.ts
PASS src/execution/utils/usageToWorktime.test.ts
PASS src/execution/utils/formatUsagePrice.test.ts
PASS src/execution/execution-report/countWorkingDuration.test.ts
PASS src/commitments/META_DISCLAIMER/META_DISCLAIMER.test.ts
PASS src/executables/browsers/locateDefaultSystemBrowser.test.ts
PASS src/cli/common/$requireCliSubcommand.test.ts
PASS src/book-components/BookEditor/BookEditorMonacoTokenization.test.ts
PASS scripts/verify-prompts/$orderPromptFiles.test.ts
PASS scripts/generate-packages/collectMainPackageDependencies.test.ts
PASS scripts/find-refactor-candidates/selectMostImportantRefactorCandidates.test.ts
PASS scripts/find-refactor-candidates/RefactorCandidateLevel.test.ts
PASS apps/agents-server/src/utils/userThemeModeSettings.test.ts
PASS apps/agents-server/src/utils/userLocationPromptParameter.test.ts
PASS apps/agents-server/src/utils/chatFeedbackMode.test.ts
PASS apps/agents-server/src/utils/agentIdentifier.test.ts
PASS apps/agents-server/src/database/loadAgentsServerEnvFile.test.ts
PASS apps/agents-server/src/constants/newAgentWizard.test.ts
PASS src/conversion/pipelineJsonToString.test.ts
PASS src/book-3.0/AgentPlannedMessagesSidecar.test.ts
PASS src/book-3.0/AgentMessageRunReport.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/chat/generateChatMetadata.test.ts
PASS src/cli/cli-commands/common/npm/buildNpmPackageInstallCommand.test.ts
PASS scripts/run-codex-prompts/runners/openai-codex/parseCodexLoginMethodFromOutput.test.ts
PASS scripts/run-codex-prompts/runners/claude-code/buildClaudeScript.test.ts
PASS src/utils/validators/semanticVersion/isValidPromptbookVersion.test.ts
PASS src/utils/validators/url/normalizeDomainForMatching.test.ts
PASS src/utils/validators/filePath/isRootPath.test.ts
PASS src/utils/validators/email/isValidEmail.test.ts
PASS src/cli/cli-commands/common/$askForConfirmation.test.ts
PASS scripts/repair-imports/utils/splitArrayIntoChunks.test.ts
PASS apps/agents-server/src/utils/userChatTimeout/createUserChatTimeoutActivity.test.ts
PASS apps/agents-server/src/utils/dnsRecords/createDnsZoneFileExport.test.ts
PASS src/utils/normalization/removeDiacritics.test.ts
PASS apps/agents-server/src/components/AgentProjects/resolveLatestCompletedAgentMessageKey.test.ts
PASS src/utils/normalization/orderJson.test.ts
PASS src/utils/normalization/normalizeWhitespaces.test.ts
PASS src/utils/normalization/decapitalize.test.ts
PASS src/utils/normalization/normalizeMessageText.test.ts
PASS src/utils/markdown/removeMarkdownLinks.test.ts
PASS src/transpilers/_common/formatUsedToolFunctions.test.ts
PASS apps/agents-server/src/utils/pagePreviewBrowserSessions.test.ts
PASS src/executables/apps/locateLibreoffice.test.ts
PASS apps/agents-server/src/utils/agentChatInputPlaceholder.test.ts
PASS apps/agents-server/src/utils/createAgentWithDefaultVisibility.test.ts
PASS apps/agents-server/src/constants/chatVisualMode.test.ts
PASS apps/agents-server/src/tools/createServerChromiumLaunchOptions.test.ts
PASS src/book-components/Chat/Chat/learnDictationDictionary.test.ts

Summary of all failing tests
FAIL scripts/run-codex-prompts/main/runCodexPrompts.test.ts
  ● runCodexPrompts › commits files changed by passing pre-coding tests before checking the first prompt in yes-and-fix mode

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/coder run defaults rrcT5c"
    Received: "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/coder run defaults rrcT5c"

    Number of calls: 1

      595 |             'load',
      596 |         ]);
    > 597 |         expect(captureCoderCommitScope).toHaveBeenCalledWith(process.cwd());
          |                                         ^
      598 |         expect(commitChanges).toHaveBeenCalledWith('test: Apply changes made by pre-coding tests', {
      599 |             autoPush: true,
      600 |             projectPath: process.cwd(),

      at Object.<anonymous> (scripts/run-codex-prompts/main/runCodexPrompts.test.ts:597:41)


Test Suites: 1 failed, 791 passed, 792 total
Tests:       1 failed, 7 todo, 3799 passed, 3807 total
Snapshots:   0 total
Time:        87.22 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
Verification step `test-unit` failed with code 1 and signal null.
[1]   Exit 1                  bash "$1"
[2]-  Done                    watch_control_input
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](CHANGELOG.md)
-   Update the [README](README.md) if needed.
-   Update the [AGENTS.md](AGENTS.md) for the next job to be done if it makes sense.

