[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~.24 31 minutes; Testing 5 minutes

[✨🕠] Fix the existing test failures before implementing any queued coding tasks.

The verification command `npm run test-for-ptbk-coder` failed before coding started. Fix the underlying failure without weakening or removing the tests, and leave the project ready for the remaining coding prompts.

## Verification output

```
[..., test output truncated to the last 12000 characters...]
ntity.name);
      161 |
    > 162 |             console.error(
          |                     ^
      163 |                 `Duplicate entity name "${entity.name}" found in files:\n${[
      164 |                     entity.filename,
      165 |                     ...duplicates.map((existingEntity) => existingEntity.filename),

      at findAllProjectEntities (scripts/utils/findAllProjectEntities.ts:162:21)
      at Object.<anonymous> (scripts/utils/findAllProjectEntities.test.ts:20:26)

    console.error
      Duplicate entity name "cancelUserChatTimeout" found in files:
       - /Users/hejny/work/promptbook/apps/agents-server/src/utils/userChatClient/cancelUserChatTimeout.ts
       - /Users/hejny/work/promptbook/apps/agents-server/src/utils/userChatTimeout/userChatTimeoutStore/cancelUserChatTimeout.ts

      160 |             reportedEntityNames.add(entity.name);
      161 |
    > 162 |             console.error(
          |                     ^
      163 |                 `Duplicate entity name "${entity.name}" found in files:\n${[
      164 |                     entity.filename,
      165 |                     ...duplicates.map((existingEntity) => existingEntity.filename),

      at findAllProjectEntities (scripts/utils/findAllProjectEntities.ts:162:21)
      at Object.<anonymous> (scripts/utils/findAllProjectEntities.test.ts:20:26)

PASS src/utils/serialization/jsonStringsToJsons.test.ts
PASS src/executables/apps/locateLibreoffice.test.ts
PASS src/utils/parameters/numberToString.test.ts
PASS apps/agents-server/src/utils/userLocationPromptParameter.test.ts
PASS apps/agents-server/src/components/NewAgentDialog/resolveWizardTeamReference.test.ts
PASS apps/agents-server/src/utils/chatFeedbackMode.test.ts
PASS src/utils/validators/url/isValidAgentUrl.test.ts
PASS src/utils/normalization/normalizeMessageText.test.ts
PASS src/commands/KNOWLEDGE/utils/knowledgeSourceContentToName.test.ts
PASS src/utils/files/getFileExtension.test.ts
PASS src/utils/validators/semanticVersion/isValidPromptbookVersion.test.ts
PASS apps/agents-server/src/utils/standaloneVpsRawIpBootstrap.test.ts
PASS src/utils/files/listAllFiles.test.ts
PASS src/utils/normalization/orderJson.test.ts
PASS src/book-components/Chat/Chat/insertDictationChunk.test.ts
PASS apps/agents-server/src/constants/newAgentWizard.test.ts
PASS src/formats/xml/utils/isValidXmlString.test.ts
PASS src/utils/normalization/nameToUriParts.test.ts
PASS apps/agents-server/src/utils/shibbolethAuthentication/resolveShibbolethPublicRequestUrl.test.ts
PASS src/utils/normalization/removeQuotes.test.ts
PASS src/commitments/META_DISCLAIMER/META_DISCLAIMER.test.ts
PASS src/utils/expectation-counters/countLines.test.ts
PASS src/commitments/MESSAGE_SUFFIX/MESSAGE_SUFFIX.test.ts
PASS src/utils/markdown/extractAllBlocksFromMarkdown-real.test.ts
PASS src/utils/markdown/removeMarkdownLinks.test.ts
PASS apps/agents-server/src/utils/projects/extractProjectRepositoriesFromAgentSource.test.ts
PASS src/conversion/utils/extractParameterNamesFromTask.test.ts
PASS src/utils/sets/intersection.test.ts
PASS apps/agents-server/src/utils/renameAgentSource.test.ts
PASS scripts/run-agent-messages/messages/buildAgentMessageScriptPath.test.ts
PASS src/utils/sets/union.test.ts
PASS src/formats/json/utils/isValidJsonString.test.ts
PASS src/cli/cli-commands/coder/getTypescriptModule.test.ts
PASS apps/agents-server/src/utils/thinkingMessages.test.ts
PASS apps/agents-server/src/utils/agentGoalChat/agentGoalChatIdentity.test.ts
PASS apps/agents-server/src/utils/stalwart/readStalwartEmailSnapshot.test.ts
PASS src/utils/normalization/removeDiacritics.test.ts
PASS scripts/verify-prompts/VerifyPromptsOrder.test.ts
PASS src/utils/normalization/suffixUrl.test.ts
PASS apps/agents-server/src/utils/userPushNotificationSettings.test.ts
PASS src/utils/expectation-counters/countParagraphs.test.ts
PASS src/utils/files/isDirectoryExisting.test.ts
PASS src/commands/_common/getParserForCommand.test.ts
PASS src/utils/validators/email/isValidEmail.test.ts
PASS src/book-2.0/agent-source/normalizeAgentName.test.ts
PASS src/utils/files/isFileExisting.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/chat/ExternalUserChatAdminActions.test.tsx
PASS src/utils/validators/url/normalizeDomainForMatching.test.ts
PASS apps/agents-server/src/utils/stalwart/stalwartBootstrap.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/chat/useCanonicalAgentChatPanelState.test.ts
PASS src/utils/execCommand/execCommand.test.ts
PASS apps/agents-server/src/components/ViewportHeightController/resolveVisibleViewportHeight.test.ts
PASS src/utils/validators/semanticVersion/isValidSemanticVersion.test.ts
PASS apps/agents-server/src/utils/userChatTimeout/createUserChatTimeoutActivity.test.ts
PASS scripts/generate-packages/getPackagesMetadataForRollup.test.ts
PASS apps/agents-server/src/utils/agentProjects/createAgentProjectInitials.test.ts
PASS scripts/run-codex-prompts/common/appendCoderContext.test.ts
PASS src/commands/X_INSTRUMENT/instrumentCommand.test.ts
PASS src/utils/validators/javascriptName/isValidJavascriptName.test.ts
PASS src/commands/X_ACTION/actionCommand.test.ts
PASS src/utils/normalization/normalizeWhitespaces.test.ts
PASS apps/agents-server/src/app/agents/[agentName]/chat/generateChatMetadata.test.ts
PASS src/utils/serialization/serializeToPromptbookJavascript.test.ts
PASS apps/agents-server/src/utils/agentChatInputPlaceholder.test.ts
PASS src/utils/random/$generateBookBoilerplate.test.ts
PASS scripts/run-codex-prompts/runners/gemini/buildGeminiScript.test.ts
PASS scripts/repair-imports/utils/splitArrayIntoChunks.test.ts
PASS apps/agents-server/src/search/createDefaultServerSearchProviders/createDocumentationSearchProvider.test.ts
PASS src/cli/cli-commands/common/npm/buildNpmPackageInstallCommand.test.ts
PASS scripts/run-codex-prompts/runners/gemini/gemini-pricing.test.ts
PASS src/execution/utils/formatUsagePrice.test.ts
PASS src/utils/normalization/nameToUriPart.test.ts
PASS src/cli/other/install.test.ts
PASS apps/agents-server/src/utils/agentProjects/humanizeAgentProjectName.test.ts
PASS src/utils/normalization/decapitalize.test.ts
PASS apps/agents-server/src/utils/normalization/normalizeUploadFilename.test.ts
PASS src/utils/color/Color.test.ts
PASS src/utils/normalization/capitalize.test.ts
PASS src/book-components/Chat/Chat/learnDictationDictionary.test.ts
PASS src/commitments/_common/getGroupedCommitmentDefinitions.openClosed.test.ts
PASS src/utils/normalization/isValidKeyword.test.ts
PASS src/errors/utils/serializeError.test.ts
PASS src/utils/serialization/asSerializable.test.ts
PASS src/errors/utils/deserializeError.test.ts
PASS scripts/run-agent-messages/messages/resolveAgentProjectsUrlPath.test.ts
PASS apps/agents-server/src/utils/externalChatRunner/ensureExternalAgentRepository.test.ts
PASS apps/agents-server/src/constants/chatVisualMode.test.ts
PASS src/executables/browsers/locateDefaultSystemBrowser.test.ts
PASS src/pipeline/isValidPipelineString.test.ts
PASS src/utils/misc/computeHash.test.ts
PASS src/book-2.0/agent-source/computeAgentHash.test.ts
PASS apps/agents-server/src/utils/parsePositiveUserId.test.ts
PASS src/storage/file-cache-storage/utils/nameToSubfolderPath.test.ts
PASS apps/agents-server/src/utils/chat/createWordLikeDeltas.test.ts
PASS src/utils/validators/filePath/isRootPath.test.ts
PASS src/executables/locateApp.test.ts
PASS src/scrapers/_common/utils/promptbookFetch.test.ts
PASS src/config.test.ts
PASS src/llm-providers/_common/utils/pricing.test.ts
PASS src/executables/browsers/locateEdge.test.ts
PASS src/llm-providers/openai/openai-models.test.ts
PASS src/executables/apps/locatePandoc.test.ts
PASS src/executables/apps/locateVscode.test.ts
PASS src/executables/browsers/locateFirefox.test.ts
PASS src/executables/browsers/locateChrome.test.ts
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Summary of all failing tests
FAIL src/cli/cli-commands/common/promptbook-cli/$resolvePromptbookCliInstallations.test.ts
  ● $resolvePromptbookCliInstallations › finds direct local dependencies and direct global CLI installations

    expect(received).resolves.toEqual(expected) // deep equality

    - Expected  - 2
    + Received  + 2

    @@ -1,17 +1,17 @@
      Array [
        Object {
          "installationLocation": "local-dependency",
          "installedVersion": "0.114.0-7",
          "npmPackageName": "ptbk",
    -     "projectPath": "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/promptbook-cli-installation-project-AUusxg",
    +     "projectPath": "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/promptbook-cli-installation-project-AUusxg",
        },
        Object {
          "installationLocation": "local-development-dependency",
          "installedVersion": "0.114.0-8",
          "npmPackageName": "@promptbook/cli",
    -     "projectPath": "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/promptbook-cli-installation-project-AUusxg",
    +     "projectPath": "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/promptbook-cli-installation-project-AUusxg",
        },
        Object {
          "installationLocation": "global",
          "installedVersion": "0.114.0-6",
          "npmPackageName": "ptbk",

      71 |         process.chdir(projectPath);
      72 |
    > 73 |         await expect($resolvePromptbookCliInstallations()).resolves.toEqual([
         |                                                                     ^
      74 |             {
      75 |                 npmPackageName: 'ptbk',
      76 |                 installedVersion: '0.114.0-7',

      at Object.toEqual (node_modules/expect/build/index.js:174:22)
      at Object.<anonymous> (src/cli/cli-commands/common/promptbook-cli/$resolvePromptbookCliInstallations.test.ts:73:69)

  ● $resolvePromptbookCliInstallations › finds an ancestor project manifest and its hoisted node_modules installation

    expect(received).resolves.toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 1

      Array [
        Object {
          "installationLocation": "local-development-dependency",
          "installedVersion": "0.114.0-8",
          "npmPackageName": "ptbk",
    -     "projectPath": "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/promptbook-cli-installation-project-C3i4XD",
    +     "projectPath": "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/promptbook-cli-installation-project-C3i4XD",
        },
      ]

      106 |         process.chdir(nestedWorkingDirectory);
      107 |
    > 108 |         await expect($resolvePromptbookCliInstallations()).resolves.toEqual([
          |                                                                     ^
      109 |             {
      110 |                 npmPackageName: 'ptbk',
      111 |                 installedVersion: '0.114.0-8',

      at Object.toEqual (node_modules/expect/build/index.js:174:22)
      at Object.<anonymous> (src/cli/cli-commands/common/promptbook-cli/$resolvePromptbookCliInstallations.test.ts:108:69)

FAIL src/scrapers/markdown/MarkdownScraper.test.ts
  ● Test suite failed to run

    A jest worker process (pid=4685) was terminated by another process: signal=SIGSEGV, exitCode=null. Operating system logs may contain more information on why this occurred.

      at ChildProcessWorker._onExit (node_modules/jest-worker/build/workers/ChildProcessWorker.js:370:23)


Test Suites: 2 failed, 720 passed, 722 total
Tests:       2 failed, 7 todo, 3127 passed, 3136 total
Snapshots:   0 total
Time:        137.975 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
Verification step `test-unit` failed with code 1 and signal null.
[1]-  Exit 1                  bash "$1"
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](CHANGELOG.md)
-   Update the [README](README.md) if needed.
-   Update the [AGENTS.md](AGENTS.md) for the next job to be done if it makes sense.

