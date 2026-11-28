[x] by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account) - Implementation ~$0.8157 an hour; Testing 25 minutes

[✨🤤] Fix the existing test failures before implementing any queued coding tasks.

The verification command `npm run test-for-ptbk-coder` failed before coding started. Fix the underlying failure without weakening or removing the tests, and leave the project ready for the remaining coding prompts.

## Verification output

```
[..., test output truncated to the last 12000 characters...]
cateVscode.test.ts
PASS src/commitments/META_DISCLAIMER/META_DISCLAIMER.test.ts
PASS apps/agents-server/src/utils/chatEnterBehaviorSettings.test.ts
PASS src/cli/cli-commands/coder/find-refactor-candidates.test.ts
PASS apps/agents-server/src/components/Header/buildHeaderMenuItems.test.ts
PASS src/utils/agent-message-runtime/resolveAgentMessageRuntimeActivity.test.ts
PASS apps/agents-server/src/utils/resolveInternalServerOrigin.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/AgentProfileChat.navigation.test.ts
PASS src/book-components/Chat/utils/citationHelpers.test.ts
PASS src/utils/files/extensionToMimeType.test.ts
PASS src/executables/browsers/locateDefaultSystemBrowser.test.ts
PASS scripts/run-codex-prompts/ui/CoderRunUiState.test.ts
PASS src/utils/markdown/removeMarkdownLinks.test.ts
PASS apps/agents-server/src/utils/userChat/persistFrozenUserChat.test.ts
PASS src/utils/markdown/parseMarkdownSection.test.ts
PASS src/utils/normalization/normalizeWhitespaces.test.ts
PASS src/book-components/BookEditor/BookEditorMonacoTokenization.test.ts
PASS src/utils/validators/email/isValidEmail.test.ts
PASS apps/agents-server/src/components/NewAgentDialog/ManGoNewAgentWizard/services/bookService.test.ts
PASS src/utils/normalization/nameToUriPart.test.ts
PASS src/utils/validators/filePath/isRootPath.test.ts
PASS src/commands/X_ACTION/actionCommand.test.ts
PASS src/formats/json/utils/isValidJsonString.test.ts
PASS apps/agents-server/src/utils/shareTarget.test.ts
PASS apps/agents-server/src/database/runDatabaseMigrations.test.ts
PASS src/book-components/Chat/save/markdown/mdSaveFormatDefinition.test.ts
PASS scripts/run-codex-prompts/runners/gemini/gemini-pricing.test.ts
PASS scripts/run-codex-prompts/common/runGoScript/withTempScript.test.ts
PASS src/scrapers/_common/utils/getScraperIntermediateSource.test.ts
PASS src/utils/markdown/splitMarkdownIntoSections.test.ts
PASS scripts/generate-packages/collectMainPackageDependencies.test.ts
PASS src/book-components/Chat/utils/decodeJsonUnicodeEscapesInMarkdownText.test.ts
PASS src/utils/normalization/removeQuotes.test.ts
PASS src/utils/color/Color.test.ts
PASS src/utils/expectation-counters/countWords.test.ts
PASS src/execution/utils/usageToWorktime.test.ts
PASS src/llm-providers/openai/computeOpenAiUsage.test.ts
PASS apps/agents-server/src/utils/session.test.ts
PASS scripts/run-codex-prompts/git/pullLatestChanges.test.ts
PASS src/commands/KNOWLEDGE/utils/knowledgeSourceContentToName.test.ts
PASS apps/agents-server/src/utils/userChat/runDurableUserChatJobWorkerTick.test.ts
PASS src/commitments/USE_PROJECT/projectReference.test.ts
PASS src/commitments/DELETE/DELETE.test.ts
PASS src/utils/files/isFileExisting.test.ts
PASS src/book-components/Chat/utils/sanitizeStreamingMessageContent.test.ts
PASS src/book-components/Chat/utils/parseImagePrompts.test.ts
PASS apps/agents-server/src/utils/stalwart/createEmailDnsInstructions.test.ts
PASS scripts/run-agent-messages/ui/buildAgentRunUiFrame.test.ts
PASS src/utils/misc/debounce.test.ts
PASS apps/agents-server/src/utils/agentRouting/agentRouteHrefs.test.ts
PASS scripts/run-codex-prompts/runners/claude-code/ClaudeCodeSessionResurrection.test.ts
PASS src/utils/validators/semanticVersion/isValidSemanticVersion.test.ts
PASS src/book-components/Chat/utils/getToolCallChipletInfo.test.ts
PASS src/utils/normalization/parseKeywords.test.ts
PASS apps/agents-server/src/utils/agentProjects/listAgentProjectChatReferences.test.ts
PASS src/utils/sets/intersection.test.ts
PASS src/utils/markdown/extractAllBlocksFromMarkdown-real.test.ts
PASS src/utils/normalization/removeDiacritics.test.ts
PASS apps/agents-server/src/utils/upload/fileUploadAvailability.test.ts
PASS src/conversion/utils/extractParameterNamesFromTask.test.ts
PASS src/utils/misc/arrayableToArray.test.ts
PASS apps/agents-server/src/utils/normalization/normalizeUploadFilename.test.ts
PASS src/utils/markdown/createMarkdownTable.test.ts
PASS apps/agents-server/src/utils/chatFeedbackMode.test.ts
PASS src/book-components/Chat/utils/parseCitationsFromContent.test.ts
PASS apps/agents-server/src/utils/userWallet/createUserWalletRecord.test.ts
PASS apps/agents-server/src/utils/transpilers/getTranspiledCodeFileMetadata.test.ts
PASS apps/agents-server/src/utils/agentProjects/readAgentProjectReadme.test.ts
PASS src/utils/sets/union.test.ts
PASS src/book-components/Chat/utils/splitMessageContentIntoSegments.test.ts
PASS apps/agents-server/src/components/ViewportHeightController/resolveVisibleViewportHeight.test.ts
PASS src/utils/parameters/valueToString.test.ts
PASS src/commitments/USE_CALENDAR/USE_CALENDAR.test.ts
PASS apps/agents-server/src/utils/userThemeModeSettings.test.ts
PASS src/book-components/Chat/utils/thinkingMessageVariants.test.ts
PASS apps/agents-server/src/utils/cloudflare/createCloudflareDnsRecordRequestBody.test.ts
PASS scripts/run-codex-prompts/git/coderGitSync.test.ts
PASS apps/agents-server/src/utils/standaloneVpsRawIpBootstrap.test.ts
PASS src/utils/parameters/extractParameterNames.test.ts
PASS src/utils/expectation-counters/countSentences.test.ts
PASS scripts/run-codex-prompts/runners/github-copilot/buildGitHubCopilotScript.test.ts
PASS src/book-components/Chat/Chat/refineFinalDictationChunk.test.ts
PASS apps/agents-server/src/components/UsersList/generateSecurePassword.test.ts
PASS src/utils/markdown/createMarkdownChart.test.ts
PASS src/utils/files/decodeAttachmentAsText.test.ts
PASS src/commitments/FORMAT/FORMAT.test.ts
PASS apps/agents-server/src/utils/userLocationPromptParameter.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/chat/useCanonicalAgentChatPanelState.test.ts
PASS src/utils/validators/uuid/isValidUuid.test.ts
PASS apps/agents-server/src/utils/userChat/triggerUserChatJobWorker.test.ts
PASS apps/agents-server/src/utils/stalwart/resolveStalwartApiUrl.test.ts
PASS src/utils/sets/difference.test.ts
PASS apps/agents-server/src/utils/agentIdentifier.test.ts
PASS src/conversion/pipelineJsonToString.test.ts
PASS src/storage/file-cache-storage/utils/nameToSubfolderPath.test.ts
PASS src/llm-providers/_common/utils/pricing.test.ts
PASS src/commitments/MESSAGE_SUFFIX/MESSAGE_SUFFIX.test.ts
PASS src/utils/normalization/isValidKeyword.test.ts
PASS src/executables/browsers/locateEdge.test.ts
PASS scripts/run-codex-prompts/runners/claude-code/buildClaudeScript.test.ts
PASS scripts/run-codex-prompts/isolation/coderIsolationNaming.test.ts
PASS src/execution/resolveTaskTldr.test.ts
PASS apps/agents-server/src/utils/standaloneVpsDnsDiagnostics.test.ts
PASS apps/agents-server/src/utils/userWallet/resolveWalletAgentPermanentId.test.ts
PASS src/cli/cli-commands/common/npm/extractNpmPackageVersionFromOutput.test.ts
PASS src/formats/xml/utils/isValidXmlString.test.ts
PASS apps/agents-server/src/utils/userChatTimeout/createUserChatTimeoutActivity.test.ts
PASS src/utils/normalization/normalizeTo_PascalCase.test.ts
PASS apps/agents-server/src/utils/shibbolethAuthentication/resolveShibbolethPublicRequestUrl.test.ts
PASS src/commitments/_common/getCommitmentNoticeMetadata.test.ts
PASS src/utils/markdown/extractAllListItemsFromMarkdown.test.ts
PASS src/avatars/avatarInteractionUtils.test.ts
PASS src/utils/files/getFileExtension.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/api/chat/resolveAgentChatRequestIdentities.test.ts
PASS src/utils/validators/url/isHostnameOnPrivateNetwork.test.ts
PASS src/utils/validators/url/extractUrlsFromText.test.ts
PASS src/book-components/Chat/utils/timeoutToolCallPresentation.test.ts
PASS src/utils/normalization/orderJson.test.ts
PASS scripts/run-codex-prompts/isolation/coderIsolationCheckoutFailureReport.test.ts
PASS src/cli/other/install.test.ts
PASS src/utils/misc/computeHash.test.ts
PASS src/avatars/visuals/orbAvatarVisual.test.ts
PASS apps/agents-server/src/constants/newAgentWizard.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/chat/formatChatTimeoutRemainingTime.test.ts
PASS apps/agents-server/src/utils/stalwart/stalwartJmapValues.test.ts
PASS apps/agents-server/src/utils/chat/createWordLikeDeltas.test.ts
PASS apps/agents-server/src/utils/messages/humanizeOutboundEmail.test.ts
PASS scripts/run-codex-prompts/runners/gemini/buildGeminiScript.test.ts
PASS src/utils/files/isDirectoryExisting.test.ts
PASS src/book-components/Chat/utils/parseMessageButtons.test.ts
PASS book/scripts/import-markdown/increaseHeadings.test.ts
PASS apps/agents-server/src/utils/agentGoalChat/agentGoalChatIdentity.test.ts
PASS src/utils/normalization/unwrapResult.test.ts
PASS apps/agents-server/src/constants/chatVisualMode.test.ts
PASS src/utils/serialization/jsonStringsToJsons.test.ts
PASS src/utils/normalization/removeEmojis.test.ts
PASS src/utils/filesystem/promptbookTemporaryPath.test.ts
PASS src/utils/validators/semanticVersion/isValidPromptbookVersion.test.ts
PASS apps/agents-server/src/utils/parsePositiveUserId.test.ts
PASS src/utils/normalization/nameToUriParts.test.ts
PASS src/conversion/validation/_importPipeline.test.ts
PASS src/book-3.0/AgentMessageRunReport.test.ts
PASS src/formats/csv/utils/isValidCsvString.test.ts
PASS apps/agents-server/src/components/NewAgentDialog/NewAgentWizardState.test.ts
PASS src/utils/normalization/searchKeywords.test.ts
PASS src/utils/normalization/decapitalize.test.ts
PASS src/transpilers/_common/formatUsedToolFunctions.test.ts
PASS src/avatars/avatarRenderingUtils.test.ts
PASS src/config.test.ts
PASS src/utils/serialization/serializeToPromptbookJavascript.test.ts
PASS src/cli/cli-commands/common/npm/$resolveLatestNpmPackageVersion.test.ts
PASS src/utils/files/mimeTypeToExtension.test.ts
PASS src/utils/take/take.test.ts
PASS src/utils/expectation-counters/countParagraphs.test.ts
PASS src/utils/parameters/numberToString.test.ts
PASS scripts/run-codex-prompts/common/appendCoderContext.test.ts
PASS src/book-2.0/agent-source/normalizeAgentName.test.ts
PASS src/utils/normalization/parseKeywordsFromString.test.ts
PASS src/utils/normalization/constructImageFilename.test.ts
PASS src/cli/cli-commands/common/npm/buildNpmPackageInstallCommand.test.ts
PASS apps/agents-server/src/utils/userChat/createUserChatRunningActivity.test.ts
PASS src/utils/normalization/normalizeTo_SCREAMING_CASE.test.ts
PASS src/cli/cli-commands/common/promptbook-cli/$checkPromptbookCliInstallations.test.ts
PASS src/utils/validators/url/isValidUrl.test.ts
PASS src/utils/validators/url/isValidPipelineUrl.test.ts
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Summary of all failing tests
FAIL src/executables/apps/locateLibreoffice.test.ts (5.65 s)
  ● locating the LibreOffice › should locate LibreOffice

    expect(received).resolves.toMatch(expected)

    Matcher error: received value must be a string

    Received has value: null

    [0m [90m 4 |[39m describe([32m'locating the LibreOffice'[39m[33m,[39m () [33m=>[39m {
     [90m 5 |[39m     it([32m'should locate LibreOffice'[39m[33m,[39m [36masync[39m () [33m=>[39m {
    [31m[1m>[22m[39m[90m 6 |[39m         [36mawait[39m expect(locateLibreoffice())[33m.[39mresolves[33m.[39mtoMatch([35m/office/i[39m)[33m;[39m
     [90m   |[39m         [31m[1m^[22m[39m
     [90m 7 |[39m         expect[33m.[39massertions([35m1[39m)[33m;[39m
     [90m 8 |[39m     })[33m;[39m
     [90m 9 |[39m })[33m;[39m[0m

      at node_modules/expect/build/index.js:177:75
      at Object.<anonymous> (src/executables/apps/locateLibreoffice.test.ts:6:9)


Test Suites: 1 failed, 688 passed, 689 total
Tests:       1 failed, 7 todo, 2933 passed, 2941 total
Snapshots:   0 total
Time:        443.051 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
Verification step `test-unit` failed with code 1 and signal null.
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](CHANGELOG.md)
-   Update the [README](README.md) if needed.
-   Update the [AGENTS.md](AGENTS.md) for the next job to be done if it makes sense.

