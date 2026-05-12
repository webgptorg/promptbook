[ ] !

[✨♣️] Fix fixing imports

-   Do not fix the imports, fix the script which fixes imports and find out why it cannot find the entities which are clearly in the project
-   Do a proper analysis of the current functionality before you start implementing.

```bash
$ npx ts-node ./scripts/repair-imports/repair-imports.ts --organize --organize-all
🏭🩹 Repair imports
/src/avatars/Avatar.tsx (7x)
/src/avatars/avatarAnimationScheduler.ts
/src/avatars/avatarInteractionUtils.test.ts (1x)
/src/avatars/avatarInteractionUtils.ts (3x)
/src/avatars/AvatarOrImage.tsx (4x)
/src/avatars/avatarPointerTracking.ts (2x)
/src/avatars/avatarRenderingUtils.test.ts (1x)
/src/avatars/avatarRenderingUtils.ts (9x)
/src/avatars/avatarVisibilityTracking.ts
/src/avatars/index.ts
/src/avatars/renderAvatarVisual.ts (6x)
/src/avatars/types/AvatarDefinition.ts (1x)
/src/avatars/types/AvatarVisualDefinition.ts (2x)
/src/avatars/visuals/asciiOctopusAvatarVisual.ts (4x)
/src/avatars/visuals/avatarVisualRegistry.test.ts (1x)
/src/avatars/visuals/avatarVisualRegistry.ts (9x)
/src/avatars/visuals/fractalAvatarVisual.ts (2x)
/src/avatars/visuals/minecraftAvatarVisual.ts (2x)
/src/avatars/visuals/octopus2AvatarVisual.ts (3x)
/src/avatars/visuals/octopus3AvatarVisual.test.ts (2x)
/src/avatars/visuals/octopus3AvatarVisual.ts (4x)
/src/avatars/visuals/octopusAvatarVisual.ts (3x)
/src/avatars/visuals/octopusAvatarVisualShared.test.ts (2x)
/src/avatars/visuals/octopusAvatarVisualShared.ts (1x)
/src/avatars/visuals/orbAvatarVisual.test.ts (2x)
/src/avatars/visuals/orbAvatarVisual.ts (7x)
/src/avatars/visuals/pixelArtAvatarVisual.ts (2x)
/src/book-2.0/agent-source/AgentBasicInformation.ts (2x)
/src/book-2.0/agent-source/AgentModelRequirements.ts (3x)
/src/book-2.0/agent-source/AgentReferenceResolver.ts (2x)
/src/book-2.0/agent-source/AgentSourceParseResult.ts (2x)
/src/book-2.0/agent-source/BookEditable.ts (1x)
/src/book-2.0/agent-source/communication-samples.test.ts (3x)
/src/book-2.0/agent-source/computeAgentHash.test.ts (2x)
/src/book-2.0/agent-source/computeAgentHash.ts (3x)
/src/book-2.0/agent-source/createAgentModelRequirements.tools.test.ts (5x)
/src/book-2.0/agent-source/createAgentModelRequirements.ts (10x)
/src/book-2.0/agent-source/createAgentModelRequirements.useCommitmentAggregation.test.ts (2x)
/src/book-2.0/agent-source/createAgentModelRequirements.writing.test.ts (2x)
/src/book-2.0/agent-source/CreateAgentModelRequirementsOptions.ts (3x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.agentReferenceResolver.test.ts (3x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.blocks.test.ts (2x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.closed.test.ts (2x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.delete.test.ts (3x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.import.test.ts (2x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.knowledge.test.ts (3x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.ts (12x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments/applyCommitmentsToAgentModelRequirements.ts (8x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments/augmentAgentModelRequirementsFromSource.ts (7x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments/filterCommitmentsForAgentModelRequirements.ts (3x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments/materializeInlineKnowledgeSources.ts (4x)
/src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments/ParsedAgentSourceWithCommitments.ts (1x)
/src/book-2.0/agent-source/createCommitmentRegex.ts (1x)
/src/book-2.0/agent-source/createDefaultAgentName.ts (5x)
/src/book-2.0/agent-source/createTeamToolName.ts (1x)
/src/book-2.0/agent-source/extractMetaLinks.ts (2x)
/src/book-2.0/agent-source/extractOpenTeacherInstructions.test.ts (2x)
/src/book-2.0/agent-source/extractOpenTeacherInstructions.ts (2x)
/src/book-2.0/agent-source/normalizeAgentName.test.ts (1x)
/src/book-2.0/agent-source/normalizeAgentName.ts (2x)
/src/book-2.0/agent-source/padBook.ts (1x)
/src/book-2.0/agent-source/parseAgentSource.import.test.ts (2x)
/src/book-2.0/agent-source/parseAgentSource.test.ts (2x)
/src/book-2.0/agent-source/parseAgentSource.ts (11x)
/src/book-2.0/agent-source/parseAgentSource/applyMetaCommitment.ts (5x)
/src/book-2.0/agent-source/parseAgentSource/consumeConversationSampleCommitment.ts (2x)
/src/book-2.0/agent-source/parseAgentSource/createCapabilitiesFromCommitment.ts (8x)
/src/book-2.0/agent-source/parseAgentSource/ensureMetaFullname.ts (1x)
/src/book-2.0/agent-source/parseAgentSource/extractAgentProfileText.ts (1x)
/src/book-2.0/agent-source/parseAgentSource/extractInitialMessage.ts (1x)
/src/book-2.0/agent-source/parseAgentSource/extractParsedAgentProfile.ts (6x)
/src/book-2.0/agent-source/parseAgentSource/ParseAgentSourceState.ts (1x)
/src/book-2.0/agent-source/parseAgentSource/ParsedAgentProfile.ts (1x)
/src/book-2.0/agent-source/parseAgentSourcePrelude.ts (2x)
/src/book-2.0/agent-source/parseAgentSourceWithCommitments.blocks.test.ts (2x)
/src/book-2.0/agent-source/parseAgentSourceWithCommitments.title.test.ts (3x)
/src/book-2.0/agent-source/parseAgentSourceWithCommitments.ts (6x)
/src/book-2.0/agent-source/parseAgentSourceWithCommitments.use.test.ts (2x)
/src/book-2.0/agent-source/parseParameters.ts (1x)
/src/book-2.0/agent-source/parseTeamCommitment.ts (3x)
/src/book-2.0/agent-source/pseudoAgentReferences.ts (3x)
/src/book-2.0/agent-source/removeCommentsFromSystemMessage.ts
/src/book-2.0/agent-source/string_book.ts (1x)
/src/book-2.0/agent-source/TeammateProfileResolver.ts
/src/book-2.0/book-language-documentation/bookLanguageCommonPitfalls.ts
/src/book-2.0/book-language-documentation/BookLanguageDocumentationExample.ts
/src/book-2.0/book-language-documentation/bookLanguageDocumentationExamples.ts (1x)
/src/book-2.0/book-language-documentation/createStandaloneBookLanguageMarkdown.ts (8x)
/src/book-2.0/book-language-documentation/renderGroupedCommitmentDocumentationMarkdown.test.ts (2x)
/src/book-2.0/book-language-documentation/renderGroupedCommitmentDocumentationMarkdown.ts (1x)
/src/book-2.0/utils/generatePlaceholderAgentProfileImageUrl.ts (1x)
/src/book-components/_common/Dropdown/Dropdown.tsx (2x)
/src/book-components/_common/HamburgerMenu/HamburgerMenu.tsx (1x)
/src/book-components/_common/MenuHoisting/MenuHoistingContext.tsx
/src/book-components/_common/Modal/Modal.tsx (1x)
/src/book-components/_common/MonacoEditorWithShadowDom.tsx
/src/book-components/_common/react-utils/classNames.ts (1x)
/src/book-components/_common/react-utils/collectCssTextsForClass.tsx
/src/book-components/_common/react-utils/escapeHtml.tsx
/src/book-components/_common/react-utils/escapeRegex.tsx
/src/book-components/_common/Tooltip/Tooltip.tsx
/src/book-components/AvatarProfile/AvatarChip/AvatarChip.tsx (4x)
/src/book-components/AvatarProfile/AvatarChip/AvatarChipFromSource.tsx (4x)
/src/book-components/AvatarProfile/AvatarChip/index.ts
/src/book-components/AvatarProfile/AvatarProfile/AvatarProfile.tsx (5x)
/src/book-components/AvatarProfile/AvatarProfile/AvatarProfileFromSource.tsx (4x)
/src/book-components/AvatarProfile/AvatarProfile/AvatarProfileTooltip.tsx (3x)
/src/book-components/BookEditor/BookEditor.tsx (8x)
/src/book-components/BookEditor/BookEditorActionbar.tsx (12x)
/src/book-components/BookEditor/BookEditorMonaco.tsx (16x)
/src/book-components/BookEditor/BookEditorMonacoConstants.ts
/src/book-components/BookEditor/BookEditorMonacoFormatting.ts
/src/book-components/BookEditor/BookEditorMonacoTokenization.test.ts (1x)
/src/book-components/BookEditor/BookEditorMonacoTokenization.ts (3x)
/src/book-components/BookEditor/BookEditorMonacoUploadPanel.tsx (2x)
/src/book-components/BookEditor/createDeprecatedCommitmentDiagnostics.test.ts (2x)
/src/book-components/BookEditor/createDeprecatedCommitmentDiagnostics.ts (4x)
/src/book-components/BookEditor/useBookEditorMonacoDecorations.ts
/src/book-components/BookEditor/useBookEditorMonacoDiagnostics.ts (1x)
/src/book-components/BookEditor/useBookEditorMonacoInteractions.ts
/src/book-components/BookEditor/useBookEditorMonacoLanguage.test.ts (2x)
/src/book-components/BookEditor/useBookEditorMonacoLanguage.ts (5x)
/src/book-components/BookEditor/useBookEditorMonacoLifecycle.ts (1x)
/src/book-components/BookEditor/useBookEditorMonacoStyles.ts (1x)
/src/book-components/BookEditor/useBookEditorMonacoUploads.ts (5x)
/src/book-components/Chat/AgentChat/AgentChat.test.tsx (7x)
/src/book-components/Chat/AgentChat/AgentChat.tsx (8x)
/src/book-components/Chat/AgentChat/AgentChatProps.tsx (3x)
/src/book-components/Chat/AgentChip/AgentChip.tsx (2x)
/src/book-components/Chat/AgentChip/index.ts
/src/book-components/Chat/Chat/Chat.tsx (19x)
/src/book-components/Chat/Chat/ChatActionsBar.test.tsx (3x)
/src/book-components/Chat/Chat/ChatActionsBar.tsx (10x)
/src/book-components/Chat/Chat/ChatCitationModal.tsx (8x)
/src/book-components/Chat/Chat/chatCssClassNames.ts
/src/book-components/Chat/Chat/ChatInputArea.test.tsx (4x)
/src/book-components/Chat/Chat/ChatInputArea.tsx (24x)
/src/book-components/Chat/Chat/ChatInputAreaDictationPanel.tsx (3x)
/src/book-components/Chat/Chat/ChatInputUploadedFile.ts
/src/book-components/Chat/Chat/ChatMessageItem.test.tsx (4x)
/src/book-components/Chat/Chat/ChatMessageItem.tsx (30x)
/src/book-components/Chat/Chat/ChatMessageList.tsx (7x)
/src/book-components/Chat/Chat/ChatMessageMap.tsx
/src/book-components/Chat/Chat/ChatMessageRichContent.tsx (8x)
/src/book-components/Chat/Chat/ChatMessageToolCallChips.tsx (3x)
/src/book-components/Chat/Chat/ChatProps.tsx (8x)
/src/book-components/Chat/Chat/ChatRatingModal.tsx (4x)
/src/book-components/Chat/Chat/ChatReplyPreview.tsx (2x)
/src/book-components/Chat/Chat/ChatSelfLearningSummary.ts (5x)
/src/book-components/Chat/Chat/ChatSoundToggle.tsx (1x)
/src/book-components/Chat/Chat/ChatToolCallModal.test.tsx (4x)
/src/book-components/Chat/Chat/ChatToolCallModal.tsx (9x)
/src/book-components/Chat/Chat/ChatToolCallModalComponents.tsx (4x)
/src/book-components/Chat/Chat/ChatToolCallModalContent.tsx (11x)
/src/book-components/Chat/Chat/ClockIcon.tsx
/src/book-components/Chat/Chat/constants.tsx
/src/book-components/Chat/Chat/createChatMessageToolCallRenderModel.ts (11x)
/src/book-components/Chat/Chat/createProgressCardChecklistMarkdown.ts (1x)
/src/book-components/Chat/Chat/ImagePromptRenderer.tsx (1x)
/src/book-components/Chat/Chat/insertDictationChunk.ts
/src/book-components/Chat/Chat/learnDictationDictionary.ts (1x)
/src/book-components/Chat/Chat/refineFinalDictationChunk.ts
/src/book-components/Chat/Chat/renderAdvancedToolCallDetails.tsx (7x)
/src/book-components/Chat/Chat/renderEmailToolCallDetails.tsx (4x)
/src/book-components/Chat/Chat/renderMemoryToolCallDetails.tsx (3x)
/src/book-components/Chat/Chat/renderPopupToolCallDetails.tsx (5x)
/src/book-components/Chat/Chat/renderRunBrowserToolCallDetails.tsx (8x)
/src/book-components/Chat/Chat/renderSearchToolCallDetails.tsx (7x)
/src/book-components/Chat/Chat/renderSelfLearningToolCallDetails.tsx (11x)
/src/book-components/Chat/Chat/renderTimeoutToolCallDetails.tsx (3x)
/src/book-components/Chat/Chat/renderTimeToolCallDetails.tsx (5x)
/src/book-components/Chat/Chat/renderToolCallClockPanel.tsx (2x)
/src/book-components/Chat/Chat/renderToolCallDetails.tsx (21x)
/src/book-components/Chat/Chat/renderToolCallProgressPlaceholder.tsx (1x)
/src/book-components/Chat/Chat/renderWalletCredentialToolCallDetails.tsx (2x)
/src/book-components/Chat/Chat/resolveRunBrowserToolCallDetailsState.ts (6x)
/src/book-components/Chat/Chat/resolveSpeechRecognitionUiDescriptor.ts
/src/book-components/Chat/Chat/resolveToolCallProgressMessage.ts (2x)
/src/book-components/Chat/Chat/StreamingFeaturePlaceholder.tsx (1x)
/src/book-components/Chat/Chat/TeamToolCallModalContent.test.tsx (2x)
/src/book-components/Chat/Chat/TeamToolCallModalContent.tsx (16x)
/src/book-components/Chat/Chat/useChatInputAreaAttachments.ts (2x)
/src/book-components/Chat/Chat/useChatInputAreaComposer.ts (3x)
/src/book-components/Chat/Chat/useChatInputAreaDictation.ts (8x)
/src/book-components/Chat/Chat/useChatInputAreaDictationPersistence.ts (1x)
/src/book-components/Chat/Chat/useChatInputAreaDictationSupport.ts (3x)
/src/book-components/Chat/Chat/useChatMessageAvatarTooltip.ts
/src/book-components/Chat/Chat/useChatMessageSpeechPlayback.ts (1x)
/src/book-components/Chat/Chat/useChatPostprocessedMessages.ts (4x)
/src/book-components/Chat/Chat/useChatScrollState.ts (3x)
/src/book-components/Chat/Chat/useChatToolCallModalState.ts (8x)
/src/book-components/Chat/Chat/useChatToolCallState.ts (5x)
/src/book-components/Chat/CodeBlock/CodeBlock.tsx (6x)
/src/book-components/Chat/CodeBlock/resolveCodeBlockLanguage.test.ts (1x)
/src/book-components/Chat/CodeBlock/resolveCodeBlockLanguage.ts
/src/book-components/Chat/effects/ChatEffectsSystem.tsx (6x)
/src/book-components/Chat/effects/components/ConfettiEffect.tsx
/src/book-components/Chat/effects/components/HeartsEffect.tsx
/src/book-components/Chat/effects/configs/defaultEffectConfigs.ts (1x)
/src/book-components/Chat/effects/index.ts
/src/book-components/Chat/effects/types/ChatEffect.ts (1x)
/src/book-components/Chat/effects/types/ChatEffectConfig.ts (1x)
/src/book-components/Chat/effects/types/ChatEffectsSystemProps.ts (3x)
/src/book-components/Chat/effects/types/ChatEffectType.ts
/src/book-components/Chat/effects/utils/detectEffects.ts (3x)
/src/book-components/Chat/hooks/index.ts
/src/book-components/Chat/hooks/useChatActionsOverlap.ts
/src/book-components/Chat/hooks/useChatAutoScroll.test.tsx (1x)
/src/book-components/Chat/hooks/useChatAutoScroll.ts
/src/book-components/Chat/hooks/useChatCompleteNotification.test.tsx (3x)
/src/book-components/Chat/hooks/useChatCompleteNotification.ts (2x)
/src/book-components/Chat/hooks/useChatRatings.ts (3x)
/src/book-components/Chat/hooks/useSendMessageToLlmChat.ts
/src/book-components/Chat/LlmChat/defaults.ts
/src/book-components/Chat/LlmChat/FriendlyErrorMessage.ts
/src/book-components/Chat/LlmChat/LlmChat.test.tsx (6x)
/src/book-components/Chat/LlmChat/LlmChat.tsx (4x)
/src/book-components/Chat/LlmChat/LlmChatProps.tsx (7x)
/src/book-components/Chat/LlmChat/useLlmChatMessageHandler.ts (7x)
/src/book-components/Chat/LlmChat/useLlmChatMessages.ts (2x)
/src/book-components/Chat/LlmChat/useLlmChatState.ts (12x)
/src/book-components/Chat/MarkdownContent/MarkdownContent.test.tsx (1x)
/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx (5x)
/src/book-components/Chat/MockedChat/constants.ts (1x)
/src/book-components/Chat/MockedChat/MockedChat.tsx (6x)
/src/book-components/Chat/save/_common/ChatSaveFormatDefinition.ts (3x)
/src/book-components/Chat/save/_common/getChatSaveFormatDefinitions.ts (3x)
/src/book-components/Chat/save/_common/string_chat_format_name.ts (1x)
/src/book-components/Chat/save/html/htmlSaveFormatDefinition.ts (3x)
/src/book-components/Chat/save/index.ts (7x)
/src/book-components/Chat/save/json/jsonSaveFormatDefinition.ts (1x)
/src/book-components/Chat/save/markdown/mdSaveFormatDefinition.ts (1x)
/src/book-components/Chat/save/pdf/buildChatPdf.ts (3x)
/src/book-components/Chat/save/pdf/pdfSaveFormatDefinition.ts (2x)
/src/book-components/Chat/save/react/reactSaveFormatDefinition.ts (3x)
/src/book-components/Chat/save/text/txtSaveFormatDefinition.ts (1x)
/src/book-components/Chat/SourceChip/index.ts
/src/book-components/Chat/SourceChip/SourceChip.tsx (2x)
/src/book-components/Chat/types/ChatMessage.ts (6x)
/src/book-components/Chat/types/ChatParticipant.ts (5x)
/src/book-components/Chat/utils/addUtmParamsToUrl.ts (1x)
/src/book-components/Chat/utils/ChatPersistence.test.ts (3x)
/src/book-components/Chat/utils/ChatPersistence.ts (3x)
/src/book-components/Chat/utils/citationHelpers.test.ts (3x)
/src/book-components/Chat/utils/citationHelpers.ts (4x)
/src/book-components/Chat/utils/collectTeamToolCallSummary.ts (6x)
/src/book-components/Chat/utils/createCitationFootnoteRenderModel.test.ts (1x)
/src/book-components/Chat/utils/createCitationFootnoteRenderModel.ts (3x)
/src/book-components/Chat/utils/createShortLinkForChat.ts
/src/book-components/Chat/utils/createTeamToolNameFromUrl.ts (1x)
/src/book-components/Chat/utils/downloadFile.ts
/src/book-components/Chat/utils/exportChatHistory.ts (12x)
/src/book-components/Chat/utils/ExportFormat.ts
/src/book-components/Chat/utils/formatToolCallDateTime.ts
/src/book-components/Chat/utils/formatToolCallLocalTime.ts (1x)
/src/book-components/Chat/utils/formatToolCallTranslationTemplate.ts
/src/book-components/Chat/utils/generatePdfContent.ts (3x)
/src/book-components/Chat/utils/generateQrDataUrl.ts
/src/book-components/Chat/utils/getChatMessageTimingDisplay.ts (1x)
/src/book-components/Chat/utils/getPromptbookBranding.ts
/src/book-components/Chat/utils/getToolCallChipletInfo.timeout.test.ts (2x)
/src/book-components/Chat/utils/getToolCallChipletInfo.ts (7x)
/src/book-components/Chat/utils/loadAgentProfile.ts (2x)
/src/book-components/Chat/utils/messagesToHtml.ts (6x)
/src/book-components/Chat/utils/messagesToJson.ts (2x)
/src/book-components/Chat/utils/messagesToMarkdown.ts (5x)
/src/book-components/Chat/utils/messagesToText.ts (4x)
/src/book-components/Chat/utils/parseCitationMarker.ts
/src/book-components/Chat/utils/parseCitationsFromContent.test.ts (2x)
/src/book-components/Chat/utils/parseCitationsFromContent.ts (2x)
/src/book-components/Chat/utils/parseImagePrompts.test.ts (1x)
/src/book-components/Chat/utils/parseImagePrompts.ts
/src/book-components/Chat/utils/parseMessageButtons.test.ts (1x)
/src/book-components/Chat/utils/parseMessageButtons.ts
/src/book-components/Chat/utils/resolveChatMessageReplyPreviewText.ts (3x)
/src/book-components/Chat/utils/resolveChatMessageReplySenderLabel.ts (2x)
/src/book-components/Chat/utils/resolveCitationUrl.test.ts (3x)
/src/book-components/Chat/utils/resolveCitationUrl.ts (1x)
/src/book-components/Chat/utils/resolveToolCallFromChatMessages.ts (3x)
/src/book-components/Chat/utils/resolveToolCallState.ts (1x)
/src/book-components/Chat/utils/sanitizeStreamingMessageContent.test.ts (1x)
/src/book-components/Chat/utils/sanitizeStreamingMessageContent.ts
/src/book-components/Chat/utils/splitMessageContentIntoSegments.test.ts (1x)
/src/book-components/Chat/utils/splitMessageContentIntoSegments.ts (2x)
/src/book-components/Chat/utils/thinkingMessageVariants.test.ts (2x)
/src/book-components/Chat/utils/thinkingMessageVariants.ts (1x)
/src/book-components/Chat/utils/timeoutToolCallPresentation.test.ts (1x)
/src/book-components/Chat/utils/timeoutToolCallPresentation.ts (3x)
/src/book-components/Chat/utils/toolCallParsing.test.ts (1x)
/src/book-components/Chat/utils/toolCallParsing.ts
/src/book-components/Chat/utils/toolCallParsing/extractSearchResults.ts (1x)
/src/book-components/Chat/utils/toolCallParsing/getToolCallResultDate.ts (2x)
/src/book-components/Chat/utils/toolCallParsing/getToolCallTimestamp.ts (1x)
/src/book-components/Chat/utils/toolCallParsing/parseRunBrowserToolResult.ts (2x)
/src/book-components/Chat/utils/toolCallParsing/parseTeamToolResult.ts (2x)
/src/book-components/Chat/utils/toolCallParsing/parseToolCallArguments.ts (2x)
/src/book-components/Chat/utils/toolCallParsing/parseToolCallResult.ts (2x)
/src/book-components/Chat/utils/toolCallParsing/resolveRunBrowserArtifactUrl.ts
/src/book-components/Chat/utils/toolCallParsing/RunBrowserToolResult.ts (1x)
/src/book-components/Chat/utils/toolCallParsing/TeamToolResult.ts (1x)
/src/book-components/Chat/utils/walletCredentialToolCall.test.ts (3x)
/src/book-components/Chat/utils/walletCredentialToolCall.ts (3x)
/src/book-components/icons/AboutIcon.tsx
/src/book-components/icons/ArrowIcon.tsx (1x)
/src/book-components/icons/AttachmentIcon.tsx
/src/book-components/icons/CameraIcon.tsx
/src/book-components/icons/CloseIcon.tsx
/src/book-components/icons/DownloadIcon.tsx
/src/book-components/icons/EmailIcon.tsx
/src/book-components/icons/ExitFullscreenIcon.tsx
/src/book-components/icons/FullscreenIcon.tsx
/src/book-components/icons/MenuIcon.tsx
/src/book-components/icons/MicIcon.tsx
/src/book-components/icons/PauseIcon.tsx
/src/book-components/icons/PlayIcon.tsx
/src/book-components/icons/ResetIcon.tsx
/src/book-components/icons/SaveIcon.tsx
/src/book-components/icons/SendIcon.tsx
/src/book-components/icons/SolidArrowButton.tsx (2x)
/src/book-components/icons/StopIcon.tsx
/src/book-components/icons/TeacherIcon.tsx
/src/book-components/icons/TemplateIcon.tsx
/src/book-components/PromptbookAgent/PromptbookAgentIntegration.tsx (4x)
/src/book-components/PromptbookAgent/PromptbookAgentSeamlessIntegration.tsx (5x)
/src/book-components/Qr/BrandedQrCode.tsx (2x)
/src/book-components/Qr/GenericQrCode.tsx (1x)
/src/book-components/Qr/PromptbookQrCode.tsx (2x)
/src/book-components/Qr/useQrCode.ts (1x)
/src/cli/$runPromptbookCli.ts (1x)
/src/cli/cli-commands/_boilerplate.ts (3x)
/src/cli/cli-commands/about.ts (8x)
/src/cli/cli-commands/agent.ts (4x)
/src/cli/cli-commands/agent/agentProjectPaths.ts
/src/cli/cli-commands/agent/agentRunCliOptions.ts (2x)
/src/cli/cli-commands/agent/init.ts (5x)
/src/cli/cli-commands/agent/initializeAgentProjectConfiguration.ts (4x)
/src/cli/cli-commands/agent/printAgentInitializationSummary.ts (3x)
/src/cli/cli-commands/agent/run.test.ts (4x)
/src/cli/cli-commands/agent/run.ts (5x)
/src/cli/cli-commands/agent/tick.ts (5x)
/src/cli/cli-commands/coder.ts (7x)
/src/cli/cli-commands/coder/agentCodingFile.ts (3x)
/src/cli/cli-commands/coder/agentsFile.ts
/src/cli/cli-commands/coder/appendBlock.ts
/src/cli/cli-commands/coder/boilerplateTemplates.test.ts (4x)
/src/cli/cli-commands/coder/boilerplateTemplates.ts (1x)
/src/cli/cli-commands/coder/ensureCoderEnvFile.ts (3x)
/src/cli/cli-commands/coder/ensureCoderGitignoreFile.ts (4x)
/src/cli/cli-commands/coder/ensureCoderMarkdownFile.ts (1x)
/src/cli/cli-commands/coder/ensureCoderPackageJsonFile.ts (3x)
/src/cli/cli-commands/coder/ensureCoderVscodeSettingsFile.ts (3x)
/src/cli/cli-commands/coder/ensureDirectory.ts (1x)
/src/cli/cli-commands/coder/find-fresh-emoji-tags.ts (2x)
/src/cli/cli-commands/coder/find-refactor-candidates.test.ts (2x)
/src/cli/cli-commands/coder/find-refactor-candidates.ts (4x)
/src/cli/cli-commands/coder/formatDisplayPath.ts
/src/cli/cli-commands/coder/generate-boilerplates.ts (3x)
/src/cli/cli-commands/coder/getDefaultCoderPackageJsonScripts.ts
/src/cli/cli-commands/coder/getDefaultCoderVscodeSettings.ts
/src/cli/cli-commands/coder/getTypescriptModule.test.ts (1x)
/src/cli/cli-commands/coder/getTypescriptModule.ts
/src/cli/cli-commands/coder/init.ts (8x)
/src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts (10x)
/src/cli/cli-commands/coder/mergeStringRecordJsonFile.test.ts (1x)
/src/cli/cli-commands/coder/mergeStringRecordJsonFile.ts (4x)
/src/cli/cli-commands/coder/printInitializationSummary.ts (5x)
/src/cli/cli-commands/coder/readTextFileIfExists.ts
/src/cli/cli-commands/coder/run.test.ts (2x)
/src/cli/cli-commands/coder/run.ts (4x)
/src/cli/cli-commands/coder/ThinkingLevel.ts
/src/cli/cli-commands/coder/verify.test.ts (2x)
/src/cli/cli-commands/coder/verify.ts (2x)
/src/cli/cli-commands/common/handleActionErrors.ts (2x)
/src/cli/cli-commands/common/promptRunnerCliOptions.ts (1x)
/src/cli/cli-commands/hello.ts (2x)
/src/cli/cli-commands/list-models.ts (5x)
/src/cli/cli-commands/list-scrapers.ts (5x)
/src/cli/cli-commands/login.ts (3x)
/src/cli/cli-commands/make.ts (21x)
/src/cli/cli-commands/prettify.ts (5x)
/src/cli/cli-commands/run.ts (33x)
/src/cli/cli-commands/runInteractiveChatbot.ts (4x)
/src/cli/cli-commands/start-agents-server.ts (7x)
/src/cli/cli-commands/start-pipelines-server.ts (17x)
/src/cli/cli-commands/test-command.ts (15x)
/src/cli/common/$addGlobalOptionsToCommand.ts (2x)
/src/cli/common/$provideLlmToolsForCli.ts (13x)
/src/cli/main.ts (1x)
/src/cli/promptbookCli.ts (18x)
/src/cli/test/ptbk.ts (1x)
/src/collection/agent-collection/AgentCollection.ts (1x)
/src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase.ts (15x)
/src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabaseOptions.ts (2x)
/src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentsDatabaseSchema.ts
/src/collection/agent-collection/constructors/agent-collection-in-supabase/createAgentPersistenceRecords.test.ts (2x)
/src/collection/agent-collection/constructors/agent-collection-in-supabase/createAgentPersistenceRecords.ts (8x)
/src/collection/agent-collection/constructors/agent-collection-in-supabase/prepareAgentSourceForPersistence.ts (4x)
/src/collection/agent-collection/CreateAgentInput.test.ts (3x)
/src/collection/agent-collection/CreateAgentInput.ts (5x)
/src/collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory.test.ts (4x)
/src/collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory.ts (20x)
/src/collection/pipeline-collection/constructors/createPipelineCollectionFromJson.test.ts (3x)
/src/collection/pipeline-collection/constructors/createPipelineCollectionFromJson.ts (3x)
/src/collection/pipeline-collection/constructors/createPipelineCollectionFromPromise.test.ts (3x)
/src/collection/pipeline-collection/constructors/createPipelineCollectionFromPromise.ts (5x)
/src/collection/pipeline-collection/constructors/createPipelineCollectionFromUrl.ts (4x)
/src/collection/pipeline-collection/constructors/createPipelineSubcollection.ts (5x)
/src/collection/pipeline-collection/PipelineCollection.ts (3x)
/src/collection/pipeline-collection/pipelineCollectionToJson.test.ts (4x)
/src/collection/pipeline-collection/pipelineCollectionToJson.ts (2x)
/src/collection/pipeline-collection/SimplePipelineCollection.ts (9x)
/src/commands/_BOILERPLATE/boilerplateCommand.test.ts (2x)
/src/commands/_BOILERPLATE/BoilerplateCommand.ts
/src/commands/_BOILERPLATE/boilerplateCommandParser.ts (7x)
/src/commands/_common/getParserForCommand.test.ts (5x)
/src/commands/_common/getParserForCommand.ts (4x)
/src/commands/_common/parseCommand.ts (14x)
/src/commands/_common/stringifyCommand.test.ts (2x)
/src/commands/_common/stringifyCommand.ts (3x)
/src/commands/_common/types/Command.ts (1x)
/src/commands/_common/types/CommandParser.ts (7x)
/src/commands/_common/types/CommandType.ts (1x)
/src/commands/_common/types/CommandUsagePlaces.ts
/src/commands/BOOK_VERSION/bookVersionCommand.test.ts (1x)
/src/commands/BOOK_VERSION/BookVersionCommand.ts (1x)
/src/commands/BOOK_VERSION/bookVersionCommandParser.ts (10x)
/src/commands/EXPECT/expectCommand.test.ts (2x)
/src/commands/EXPECT/ExpectCommand.ts (2x)
/src/commands/EXPECT/expectCommandParser.ts (11x)
/src/commands/FOREACH/foreachCommand.test.ts (2x)
/src/commands/FOREACH/ForeachCommand.ts (1x)
/src/commands/FOREACH/foreachCommandParser.ts (10x)
/src/commands/FOREACH/ForeachJson.ts (2x)
/src/commands/FORMAT/formatCommand.test.ts (2x)
/src/commands/FORMAT/FormatCommand.ts
/src/commands/FORMAT/formatCommandParser.ts (7x)
/src/commands/FORMFACTOR/formfactorCommand.test.ts (2x)
/src/commands/FORMFACTOR/FormfactorCommand.ts (1x)
/src/commands/FORMFACTOR/formfactorCommandParser.ts (8x)
/src/commands/index.ts (16x)
/src/commands/JOKER/jokerCommand.test.ts (2x)
/src/commands/JOKER/JokerCommand.ts (1x)
/src/commands/JOKER/jokerCommandParser.ts (8x)
/src/commands/KNOWLEDGE/knowledgeCommand.test.ts (2x)
/src/commands/KNOWLEDGE/KnowledgeCommand.ts (1x)
/src/commands/KNOWLEDGE/knowledgeCommandParser.ts (11x)
/src/commands/KNOWLEDGE/utils/knowledgeSourceContentToName.test.ts (1x)
/src/commands/KNOWLEDGE/utils/knowledgeSourceContentToName.ts (3x)
/src/commands/MODEL/modelCommand.test.ts (2x)
/src/commands/MODEL/ModelCommand.ts (2x)
/src/commands/MODEL/modelCommandParser.ts (9x)
/src/commands/PARAMETER/parameterCommand.test.ts (2x)
/src/commands/PARAMETER/ParameterCommand.ts (2x)
/src/commands/PARAMETER/parameterCommandParser.ts (9x)
/src/commands/PERSONA/personaCommand.test.ts (2x)
/src/commands/PERSONA/PersonaCommand.ts (2x)
/src/commands/PERSONA/personaCommandParser.ts (8x)
/src/commands/POSTPROCESS/postprocessCommand.test.ts (2x)
/src/commands/POSTPROCESS/PostprocessCommand.ts (1x)
/src/commands/POSTPROCESS/postprocessCommandParser.ts (8x)
/src/commands/SECTION/sectionCommand.test.ts (2x)
/src/commands/SECTION/SectionCommand.ts (1x)
/src/commands/SECTION/sectionCommandParser.ts (11x)
/src/commands/URL/urlCommand.test.ts (2x)
/src/commands/URL/UrlCommand.ts
/src/commands/URL/urlCommandParser.ts (9x)
/src/commands/X_ACTION/actionCommand.test.ts (2x)
/src/commands/X_ACTION/ActionCommand.ts
/src/commands/X_ACTION/actionCommandParser.ts (8x)
/src/commands/X_INSTRUMENT/instrumentCommand.test.ts (2x)
/src/commands/X_INSTRUMENT/InstrumentCommand.ts
/src/commands/X_INSTRUMENT/instrumentCommandParser.ts (8x)
/src/commitments/_base/BaseCommitmentDefinition.ts (6x)
/src/commitments/_base/BookCommitment.ts (1x)
/src/commitments/_base/CommitmentDefinition.ts (3x)
/src/commitments/_base/createEmptyAgentModelRequirements.ts (1x)
/src/commitments/_base/formatOptionalInstructionBlock.ts
/src/commitments/_base/NotYetImplementedCommitmentDefinition.ts (2x)
/src/commitments/_base/ParsedCommitment.ts (1x)
/src/commitments/_common/commitmentToolFunctions.ts (5x)
/src/commitments/_common/createSerpSearchToolFunction.ts (3x)
/src/commitments/_common/createWritingCommitmentSections.ts
/src/commitments/_common/getAllCommitmentDefinitions.test.ts (1x)
/src/commitments/_common/getAllCommitmentDefinitions.ts (4x)
/src/commitments/_common/getAllCommitmentsToolFunctionsForBrowser.ts (2x)
/src/commitments/_common/getAllCommitmentsToolFunctionsForNode.ts (7x)
/src/commitments/_common/getAllCommitmentsToolTitles.ts (4x)
/src/commitments/_common/getAllCommitmentTypes.ts (3x)
/src/commitments/_common/getCommitmentDefinition.ts (3x)
/src/commitments/_common/getCommitmentNoticeMetadata.test.ts (4x)
/src/commitments/_common/getCommitmentNoticeMetadata.ts (1x)
/src/commitments/_common/getGroupedCommitmentDefinitions.openClosed.test.ts (1x)
/src/commitments/_common/getGroupedCommitmentDefinitions.order.test.ts (1x)
/src/commitments/_common/getGroupedCommitmentDefinitions.ts (5x)
/src/commitments/_common/getGroupedCommitmentDefinitions.use.test.ts (2x)
/src/commitments/_common/getGroupedCommitmentDefinitions.writing.test.ts (1x)
/src/commitments/_common/isCommitmentSupported.ts (2x)
/src/commitments/_common/sortCommitmentDefinitions.ts (1x)
/src/commitments/_common/teamInternalAgentAccess.ts
/src/commitments/_common/toolExecutionEnvelope.ts (1x)
/src/commitments/_common/toolRuntimeContext.ts (3x)
/src/commitments/ACTION/ACTION.test.ts (2x)
/src/commitments/ACTION/ACTION.ts (2x)
/src/commitments/CLOSED/CLOSED.test.ts (3x)
/src/commitments/CLOSED/CLOSED.ts (3x)
/src/commitments/COMPONENT/COMPONENT.ts (2x)
/src/commitments/DELETE/DELETE.test.ts (2x)
/src/commitments/DELETE/DELETE.ts (2x)
/src/commitments/DICTIONARY/DICTIONARY.ts (2x)
/src/commitments/FORMAT/FORMAT.test.ts (2x)
/src/commitments/FORMAT/FORMAT.ts (2x)
/src/commitments/FROM/FROM.ts (5x)
/src/commitments/GOAL/GOAL.ts (2x)
/src/commitments/IMPORT/IMPORT.ts (6x)
/src/commitments/index.test.ts (1x)
/src/commitments/index.ts (57x)
/src/commitments/KNOWLEDGE/KNOWLEDGE.ts (5x)
/src/commitments/LANGUAGE/LANGUAGE.ts (2x)
/src/commitments/MEMORY/createMemorySystemMessage.ts (1x)
/src/commitments/MEMORY/createMemoryToolFunctions.ts (7x)
/src/commitments/MEMORY/createMemoryTools.ts (2x)
/src/commitments/MEMORY/getMemoryCommitmentDocumentation.ts
/src/commitments/MEMORY/getMemoryToolRuntimeAdapterOrDisabledResult.ts (2x)
/src/commitments/MEMORY/getMemoryToolTitles.ts (2x)
/src/commitments/MEMORY/MEMORY.test.ts (4x)
/src/commitments/MEMORY/MEMORY.ts (10x)
/src/commitments/MEMORY/MemoryToolNames.ts (1x)
/src/commitments/MEMORY/MemoryToolRuntimeAdapter.ts (1x)
/src/commitments/MEMORY/parseMemoryToolArgs.ts (1x)
/src/commitments/MEMORY/resolveMemoryRuntimeContext.ts (3x)
/src/commitments/MEMORY/setMemoryToolRuntimeAdapter.ts (1x)
/src/commitments/MESSAGE_SUFFIX/MESSAGE_SUFFIX.test.ts (2x)
/src/commitments/MESSAGE_SUFFIX/MESSAGE_SUFFIX.ts (3x)
/src/commitments/MESSAGE/AgentMessageCommitmentDefinition.ts (3x)
/src/commitments/MESSAGE/InitialMessageCommitmentDefinition.ts (2x)
/src/commitments/MESSAGE/InternalMessageCommitmentDefinition.ts (3x)
/src/commitments/MESSAGE/MESSAGE.ts (2x)
/src/commitments/MESSAGE/UserMessageCommitmentDefinition.ts (3x)
/src/commitments/META_AVATAR/META_AVATAR.ts (4x)
/src/commitments/META_COLOR/META_COLOR.ts (3x)
/src/commitments/META_DISCLAIMER/META_DISCLAIMER.test.ts (2x)
/src/commitments/META_DISCLAIMER/META_DISCLAIMER.ts (3x)
/src/commitments/META_DOMAIN/META_DOMAIN.ts (3x)
/src/commitments/META_FONT/META_FONT.ts (3x)
/src/commitments/META_IMAGE/META_IMAGE.ts (3x)
/src/commitments/META_INPUT_PLACEHOLDER/META_INPUT_PLACEHOLDER.ts (3x)
/src/commitments/META_LINK/META_LINK.ts (3x)
/src/commitments/META_VOICE/META_VOICE.ts (3x)
/src/commitments/META/META_DESCRIPTION.ts (3x)
/src/commitments/META/META.ts (3x)
/src/commitments/MODEL/MODEL.test.ts (3x)
/src/commitments/MODEL/MODEL.ts (3x)
/src/commitments/NOTE/NOTE.ts (2x)
/src/commitments/OPEN/OPEN.ts (3x)
/src/commitments/PERSONA/PERSONA.ts (2x)
/src/commitments/RULE/RULE.ts (2x)
/src/commitments/SAMPLE/SAMPLE.ts (3x)
/src/commitments/SCENARIO/SCENARIO.ts (2x)
/src/commitments/STYLE/STYLE.ts (2x)
/src/commitments/TEAM/TEAM.ts (14x)
/src/commitments/TEMPLATE/TEMPLATE.test.ts (2x)
/src/commitments/TEMPLATE/TEMPLATE.ts (2x)
/src/commitments/USE_BROWSER/fetchUrlContent.ts (5x)
/src/commitments/USE_BROWSER/fetchUrlContentViaBrowser.ts
/src/commitments/USE_BROWSER/resolveRunBrowserToolForNode.test.ts (1x)
/src/commitments/USE_BROWSER/resolveRunBrowserToolForNode.ts (3x)
/src/commitments/USE_BROWSER/USE_BROWSER.test.ts (2x)
/src/commitments/USE_BROWSER/USE_BROWSER.ts (7x)
/src/commitments/USE_CALENDAR/calendarReference.ts
/src/commitments/USE_CALENDAR/callGoogleCalendarApi.ts
/src/commitments/USE_CALENDAR/createUseCalendarToolFunctions.ts (5x)
/src/commitments/USE_CALENDAR/createUseCalendarTools.ts (2x)
/src/commitments/USE_CALENDAR/getUseCalendarToolTitles.ts (2x)
/src/commitments/USE_CALENDAR/normalizeConfiguredCalendars.ts (1x)
/src/commitments/USE_CALENDAR/resolveUseCalendarToolRuntimeOrWalletCredentialResult.ts (3x)
/src/commitments/USE_CALENDAR/USE_CALENDAR.test.ts (3x)
/src/commitments/USE_CALENDAR/USE_CALENDAR.ts (10x)
/src/commitments/USE_CALENDAR/UseCalendarToolNames.ts (1x)
/src/commitments/USE_CALENDAR/UseCalendarWallet.ts
/src/commitments/USE_DEEPSEARCH/USE_DEEPSEARCH.test.ts (3x)
/src/commitments/USE_DEEPSEARCH/USE_DEEPSEARCH.ts (6x)
/src/commitments/USE_EMAIL/parseUseEmailCommitmentContent.test.ts (1x)
/src/commitments/USE_EMAIL/parseUseEmailCommitmentContent.ts (1x)
/src/commitments/USE_EMAIL/resolveSendEmailToolForNode.ts (2x)
/src/commitments/USE_EMAIL/sendEmailViaBrowser.ts
/src/commitments/USE_EMAIL/USE_EMAIL.test.ts (2x)
/src/commitments/USE_EMAIL/USE_EMAIL.ts (8x)
/src/commitments/USE_IMAGE_GENERATOR/USE_IMAGE_GENERATOR.test.ts (2x)
/src/commitments/USE_IMAGE_GENERATOR/USE_IMAGE_GENERATOR.ts (3x)
/src/commitments/USE_MCP/USE_MCP.ts (2x)
/src/commitments/USE_POPUP/USE_POPUP.ts (5x)
/src/commitments/USE_PRIVACY/USE_PRIVACY.test.ts (4x)
/src/commitments/USE_PRIVACY/USE_PRIVACY.ts (7x)
/src/commitments/USE_PROJECT/callGitHubApi.ts
/src/commitments/USE_PROJECT/createUseProjectToolFunctions.ts (9x)
/src/commitments/USE_PROJECT/createUseProjectTools.ts (2x)
/src/commitments/USE_PROJECT/getUseProjectToolTitles.ts (2x)
/src/commitments/USE_PROJECT/normalizeConfiguredProjects.ts
/src/commitments/USE_PROJECT/normalizeOptionalToolText.ts
/src/commitments/USE_PROJECT/projectReference.test.ts (1x)
/src/commitments/USE_PROJECT/projectReference.ts
/src/commitments/USE_PROJECT/resolveUseProjectToolRuntimeOrWalletCredentialResult.ts (4x)
/src/commitments/USE_PROJECT/USE_PROJECT.test.ts (3x)
/src/commitments/USE_PROJECT/USE_PROJECT.ts (10x)
/src/commitments/USE_PROJECT/UseProjectToolNames.ts (1x)
/src/commitments/USE_PROJECT/UseProjectWallet.ts
/src/commitments/USE_SEARCH_ENGINE/USE_SEARCH_ENGINE.test.ts (2x)
/src/commitments/USE_SEARCH_ENGINE/USE_SEARCH_ENGINE.ts (6x)
/src/commitments/USE_SPAWN/resolveSpawnAgentToolForNode.ts (2x)
/src/commitments/USE_SPAWN/spawnAgentViaBrowser.ts
/src/commitments/USE_SPAWN/USE_SPAWN.test.ts (2x)
/src/commitments/USE_SPAWN/USE_SPAWN.ts (8x)
/src/commitments/USE_TIME/USE_TIME.test.ts (2x)
/src/commitments/USE_TIME/USE_TIME.ts (5x)
/src/commitments/USE_TIMEOUT/createTimeoutSystemMessage.ts
/src/commitments/USE_TIMEOUT/createTimeoutToolFunctions.ts (8x)
/src/commitments/USE_TIMEOUT/createTimeoutTools.ts (2x)
/src/commitments/USE_TIMEOUT/getTimeoutToolRuntimeAdapterOrDisabledResult.ts (2x)
/src/commitments/USE_TIMEOUT/parseTimeoutToolArgs.ts (2x)
/src/commitments/USE_TIMEOUT/resolveTimeoutRuntimeContext.ts (3x)
/src/commitments/USE_TIMEOUT/setTimeoutToolRuntimeAdapter.ts (1x)
/src/commitments/USE_TIMEOUT/TimeoutToolNames.ts (1x)
/src/commitments/USE_TIMEOUT/TimeoutToolRuntimeAdapter.ts (1x)
/src/commitments/USE_TIMEOUT/USE_TIMEOUT.test.ts (4x)
/src/commitments/USE_TIMEOUT/USE_TIMEOUT.ts (9x)
/src/commitments/USE_USER_LOCATION/USE_USER_LOCATION.test.ts (4x)
/src/commitments/USE_USER_LOCATION/USE_USER_LOCATION.ts (7x)
/src/commitments/USE/aggregateUseCommitmentSystemMessages.ts (3x)
/src/commitments/WALLET/createWalletSystemMessage.ts (1x)
/src/commitments/WALLET/createWalletToolFunctions.ts (7x)
/src/commitments/WALLET/createWalletTools.ts (3x)
/src/commitments/WALLET/getWalletCommitmentDocumentation.ts
/src/commitments/WALLET/getWalletToolRuntimeAdapterOrDisabledResult.ts (2x)
/src/commitments/WALLET/getWalletToolTitles.ts (2x)
/src/commitments/WALLET/parseWalletToolArgs.ts (1x)
/src/commitments/WALLET/resolveWalletRuntimeContext.ts (3x)
/src/commitments/WALLET/setWalletToolRuntimeAdapter.ts (1x)
/src/commitments/WALLET/WALLET.test.ts (3x)
/src/commitments/WALLET/WALLET.ts (10x)
/src/commitments/WALLET/WalletToolNames.ts (1x)
/src/commitments/WALLET/WalletToolRuntimeAdapter.ts (1x)
/src/commitments/WRITING_RULES/WRITING_RULES.ts (3x)
/src/commitments/WRITING_SAMPLE/WRITING_SAMPLE.ts (3x)
/src/config.test.ts (1x)
/src/config.ts (8x)
/src/constants.ts (4x)
/src/constants/streaming.ts
/src/conversion/archive/loadArchive.ts (6x)
/src/conversion/archive/saveArchive.ts (6x)
/src/conversion/compilePipeline.test.ts (2x)
/src/conversion/compilePipeline.ts (6x)
/src/conversion/compilePipelineOnRemoteServer.ts (5x)
/src/conversion/parsePipeline.test.ts (2x)
/src/conversion/parsePipeline.ts (31x)
/src/conversion/pipelineJsonToString.ts (7x)
/src/conversion/prettify/PrettifyOptions.ts
/src/conversion/prettify/prettifyPipelineString.ts (6x)
/src/conversion/prettify/renderPipelineMermaidOptions.ts (9x)
/src/conversion/utils/extractParameterNamesFromTask.test.ts (1x)
/src/conversion/utils/extractParameterNamesFromTask.ts (5x)
/src/conversion/validation/_importPipeline.ts (7x)
/src/conversion/validation/pipelineStringToJson-parseErrors.test.ts (5x)
/src/conversion/validation/validatePipeline-logicErrors.test.ts (4x)
/src/conversion/validation/validatePipeline.test.ts (4x)
/src/conversion/validation/validatePipeline.ts (13x)
/src/dialogs/callback/CallbackInterfaceTools.ts (3x)
/src/dialogs/callback/CallbackInterfaceToolsOptions.ts (2x)
/src/dialogs/simple-prompt/SimplePromptInterfaceTools.ts (4x)
/src/dialogs/user-interface-execution-tools.test.ts (5x)
/src/errors/0-BoilerplateError.ts
/src/errors/0-index.ts (21x)
/src/errors/AbstractFormatError.ts
/src/errors/assertsError.ts (3x)
/src/errors/AuthenticationError.ts
/src/errors/CollectionError.ts
/src/errors/ConflictError.ts
/src/errors/DatabaseError.ts
/src/errors/EnvironmentMismatchError.ts
/src/errors/ExpectError.ts
/src/errors/KnowledgeScrapeError.ts
/src/errors/LimitReachedError.ts
/src/errors/MissingToolsError.ts
/src/errors/NotAllowed.ts
/src/errors/NotFoundError.ts
/src/errors/NotYetImplementedError.ts
/src/errors/ParseError.ts
/src/errors/PipelineExecutionError.ts (2x)
/src/errors/PipelineLogicError.ts
/src/errors/PipelineUrlError.ts
/src/errors/PromptbookFetchError.ts
/src/errors/UnexpectedError.ts (2x)
/src/errors/utils/deserializeError.test.ts (2x)
/src/errors/utils/deserializeError.ts (3x)
/src/errors/utils/ErrorJson.ts (1x)
/src/errors/utils/getErrorReportUrl.ts (2x)
/src/errors/utils/serializeError.test.ts (2x)
/src/errors/utils/serializeError.ts (3x)
/src/errors/WrappedError.ts (2x)
/src/executables/$provideExecutablesForNode.ts (9x)
/src/executables/apps/locateLibreoffice.test.ts (1x)
/src/executables/apps/locateLibreoffice.ts (2x)
/src/executables/apps/locatePandoc.test.ts (1x)
/src/executables/apps/locatePandoc.ts (2x)
/src/executables/apps/locateVscode.test.ts (1x)
/src/executables/apps/locateVscode.ts (2x)
/src/executables/browsers/locateBrowser.test.ts (1x)
/src/executables/browsers/locateBrowser.ts (10x)
/src/executables/browsers/locateChrome.test.ts (1x)
/src/executables/browsers/locateChrome.ts (2x)
/src/executables/browsers/locateDefaultSystemBrowser.test.ts (1x)
/src/executables/browsers/locateDefaultSystemBrowser.ts (1x)
/src/executables/browsers/locateEdge.test.ts (1x)
/src/executables/browsers/locateEdge.ts (2x)
/src/executables/browsers/locateFirefox.test.ts (1x)
/src/executables/browsers/locateFirefox.ts (2x)
/src/executables/browsers/locateInternetExplorer.test.ts (1x)
/src/executables/browsers/locateInternetExplorer.ts (2x)
/src/executables/browsers/locateSafari.ts (2x)
/src/executables/locateApp.test.ts (1x)
/src/executables/locateApp.ts (6x)
/src/executables/platforms/locateAppOnLinux.ts (4x)
/src/executables/platforms/locateAppOnMacOs.ts (6x)
/src/executables/platforms/locateAppOnWindows.ts (5x)
/src/execution/AbstractTaskResult.ts (1x)
/src/execution/assertsTaskSuccessful.ts (3x)
/src/execution/AvailableModel.ts (2x)
/src/execution/CommonToolsOptions.ts (1x)
/src/execution/createPipelineExecutor/$OngoingTaskResult.ts (6x)
/src/execution/createPipelineExecutor/00-createPipelineExecutor.ts (23x)
/src/execution/createPipelineExecutor/00-CreatePipelineExecutorOptions.ts (4x)
/src/execution/createPipelineExecutor/10-executePipeline.ts (21x)
/src/execution/createPipelineExecutor/20-executeTask.ts (14x)
/src/execution/createPipelineExecutor/30-executeFormatSubvalues.ts (11x)
/src/execution/createPipelineExecutor/40-executeAttempts.ts (25x)
/src/execution/createPipelineExecutor/computeCosineSimilarity.ts (1x)
/src/execution/createPipelineExecutor/filterJustOutputParameters.ts (3x)
/src/execution/createPipelineExecutor/getContextForTask.ts (5x)
/src/execution/createPipelineExecutor/getExamplesForTask.ts (5x)
/src/execution/createPipelineExecutor/getKnowledgeForTask.ts (9x)
/src/execution/createPipelineExecutor/getReservedParametersForTask.ts (12x)
/src/execution/createPipelineExecutor/knowledgePiecesToString.ts (1x)
/src/execution/EmbeddingVector.ts
/src/execution/embeddingVectorToString.ts (1x)
/src/execution/Executables.ts (1x)
/src/execution/execution-report/countWorkingDuration.test.ts (1x)
/src/execution/execution-report/countWorkingDuration.ts (1x)
/src/execution/execution-report/ExecutionPromptReportJson.ts (3x)
/src/execution/execution-report/ExecutionReportJson.ts (4x)
/src/execution/execution-report/executionReportJsonToString.ts (15x)
/src/execution/execution-report/ExecutionReportString.ts
/src/execution/execution-report/ExecutionReportStringOptions.ts (1x)
/src/execution/ExecutionTask.ts (15x)
/src/execution/ExecutionTools.ts (8x)
/src/execution/FilesystemTools.ts
/src/execution/LlmExecutionTools.ts (5x)
/src/execution/LlmExecutionToolsConstructor.ts (3x)
/src/execution/PipelineExecutor.ts (2x)
/src/execution/PipelineExecutorResult.ts (5x)
/src/execution/PromptbookFetch.test-type.ts (2x)
/src/execution/PromptbookFetch.ts (1x)
/src/execution/PromptResult.ts (5x)
/src/execution/ScriptExecutionTools.ts (3x)
/src/execution/translation/automatic-translate/automatic-translators/AutomaticTranslator.ts
/src/execution/translation/automatic-translate/automatic-translators/DebugAutomaticTranslator.ts (1x)
/src/execution/translation/automatic-translate/automatic-translators/FakeAutomaticTranslator.ts (1x)
/src/execution/translation/automatic-translate/automatic-translators/LindatAutomaticTranslator.ts (3x)
/src/execution/translation/automatic-translate/automatic-translators/TranslatorOptions.ts
/src/execution/translation/automatic-translate/automatic-translators/utils/extractMultiplicatedOccurrence.test.ts (1x)
/src/execution/translation/automatic-translate/automatic-translators/utils/extractMultiplicatedOccurrence.ts (1x)
/src/execution/translation/automatic-translate/translateMessages.ts (3x)
/src/execution/UncertainNumber.ts (2x)
/src/execution/Usage.ts (2x)
/src/execution/UserInterfaceTools.ts (2x)
/src/execution/utils/$provideExecutionToolsForNode.ts (10x)
/src/execution/utils/addUsage.test.ts (3x)
/src/execution/utils/addUsage.ts (3x)
/src/execution/utils/checkExpectations.test.ts (1x)
/src/execution/utils/checkExpectations.ts (4x)
/src/execution/utils/computeUsageCounts.ts (7x)
/src/execution/utils/forEachAsync.ts
/src/execution/utils/uncertainNumber.ts (2x)
/src/execution/utils/usage-constants.ts (2x)
/src/execution/utils/usageToHuman.ts (4x)
/src/execution/utils/usageToWorktime.test.ts (4x)
/src/execution/utils/usageToWorktime.ts (2x)
/src/execution/utils/validatePromptResult.ts (9x)
/src/file-security-checkers/FileSecurityChecker.ts (2x)
/src/file-security-checkers/FileSecurityCheckResult.ts (1x)
/src/file-security-checkers/virustotal/VirusTotalFileSecurityChecker.test.ts (1x)
/src/file-security-checkers/virustotal/VirusTotalFileSecurityChecker.ts (4x)
/src/formats/_common/FormatParser.ts (5x)
/src/formats/_common/FormatSubvalueParser.ts (5x)
/src/formats/csv/CsvFormatError.ts (1x)
/src/formats/csv/CsvFormatParser.ts (8x)
/src/formats/csv/CsvSettings.ts
/src/formats/csv/utils/csvParse.ts (5x)
/src/formats/csv/utils/isValidCsvString.test.ts (1x)
/src/formats/csv/utils/isValidCsvString.ts (1x)
/src/formats/index.ts (4x)
/src/formats/json/JsonFormatParser.ts (4x)
/src/formats/json/utils/isValidJsonString.test.ts (1x)
/src/formats/json/utils/isValidJsonString.ts (1x)
/src/formats/json/utils/jsonParse.ts
/src/formats/text/TextFormatParser.ts (4x)
/src/formats/xml/utils/isValidXmlString.test.ts (1x)
/src/formats/xml/utils/isValidXmlString.ts (1x)
/src/formats/xml/XmlFormatParser.ts (4x)
/src/formfactors/_boilerplate/BoilerplateFormfactorDefinition.ts (1x)
/src/formfactors/_common/AbstractFormfactorDefinition.ts (5x)
/src/formfactors/_common/FormfactorDefinition.ts (1x)
/src/formfactors/_common/string_formfactor_name.ts (1x)
/src/formfactors/chatbot/ChatbotFormfactorDefinition.ts (1x)
/src/formfactors/completion/CompletionFormfactorDefinition.ts (1x)
/src/formfactors/generator/GeneratorFormfactorDefinition.ts (1x)
/src/formfactors/generic/GenericFormfactorDefinition.ts (2x)
/src/formfactors/image-generator/ImageGeneratorFormfactorDefinition.ts (1x)
/src/formfactors/index.ts (8x)
/src/formfactors/matcher/MatcherFormfactorDefinition.ts (1x)
/src/formfactors/sheets/SheetsFormfactorDefinition.ts (1x)
/src/formfactors/translator/TranslatorFormfactorDefinition.ts (1x)
/src/globals.d.ts
/src/high-level-abstractions/_common/HighLevelAbstraction.ts (2x)
/src/high-level-abstractions/implicit-formfactor/ImplicitFormfactorHla.ts (4x)
/src/high-level-abstractions/index.ts (2x)
/src/high-level-abstractions/quick-chatbot/QuickChatbotHla.ts (2x)
/src/import-plugins/$fileImportPlugins.ts (4x)
/src/import-plugins/AgentFileImportPlugin.ts (3x)
/src/import-plugins/FileImportPlugin.ts (1x)
/src/import-plugins/JsonFileImportPlugin.ts (1x)
/src/import-plugins/TextFileImportPlugin.ts (2x)
/src/llm-providers/_common/filterModels.ts (4x)
/src/llm-providers/_common/register/$llmToolsMetadataRegister.ts (2x)
/src/llm-providers/_common/register/$llmToolsRegister.ts (2x)
/src/llm-providers/_common/register/$provideEnvFilename.ts (8x)
/src/llm-providers/_common/register/$provideLlmToolsConfigurationFromEnv.ts (6x)
/src/llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground.ts (12x)
/src/llm-providers/_common/register/$provideLlmToolsForWizardOrCli.ts (19x)
/src/llm-providers/_common/register/$provideLlmToolsFromEnv.ts (9x)
/src/llm-providers/_common/register/$registeredLlmToolsMessage.ts (8x)
/src/llm-providers/_common/register/createLlmToolsFromConfiguration.test.ts (2x)
/src/llm-providers/_common/register/createLlmToolsFromConfiguration.ts (12x)
/src/llm-providers/_common/register/LlmToolsConfiguration.ts (3x)
/src/llm-providers/_common/register/LlmToolsMetadata.ts (5x)
/src/llm-providers/_common/register/LlmToolsOptions.ts (1x)
/src/llm-providers/_common/utils/assertUniqueModels.ts (1x)
/src/llm-providers/_common/utils/cache/CacheItem.ts (5x)
/src/llm-providers/_common/utils/cache/cacheLlmTools.ts (16x)
/src/llm-providers/_common/utils/cache/CacheLlmToolsOptions.ts (2x)
/src/llm-providers/_common/utils/count-total-usage/countUsage.ts (7x)
/src/llm-providers/_common/utils/count-total-usage/limitTotalUsage.ts (13x)
/src/llm-providers/_common/utils/count-total-usage/LlmExecutionToolsWithTotalUsage.ts (2x)
/src/llm-providers/_common/utils/pricing.test.ts (1x)
/src/llm-providers/_common/utils/pricing.ts
/src/llm-providers/_common/utils/removeUnsupportedModelRequirements.test.ts (1x)
/src/llm-providers/_common/utils/removeUnsupportedModelRequirements.ts (1x)
/src/llm-providers/_multiple/getSingleLlmExecutionTools.ts (4x)
/src/llm-providers/_multiple/joinLlmExecutionTools.ts (3x)
/src/llm-providers/_multiple/MultipleLlmExecutionTools.ts (10x)
/src/llm-providers/_multiple/playground/playground.ts (9x)
/src/llm-providers/agent/Agent.test.ts (9x)
/src/llm-providers/agent/Agent.ts (19x)
/src/llm-providers/agent/AgentLlmExecutionTools.test.ts (10x)
/src/llm-providers/agent/AgentLlmExecutionTools.ts (22x)
/src/llm-providers/agent/AgentOptions.ts (6x)
/src/llm-providers/agent/createAgentLlmExecutionTools.ts (3x)
/src/llm-providers/agent/CreateAgentLlmExecutionToolsOptions.ts (6x)
/src/llm-providers/agent/playground/playground.ts (14x)
/src/llm-providers/agent/register-configuration.ts (3x)
/src/llm-providers/agent/register-constructor.ts (3x)
/src/llm-providers/agent/RemoteAgent.test.ts (4x)
/src/llm-providers/agent/RemoteAgent.ts (18x)
/src/llm-providers/agent/RemoteAgentOptions.ts (2x)
/src/llm-providers/agent/self-learning/SelfLearningManager.test.ts (6x)
/src/llm-providers/agent/self-learning/SelfLearningManager.ts (11x)
/src/llm-providers/anthropic-claude/anthropic-claude-models.ts (4x)
/src/llm-providers/anthropic-claude/AnthropicClaudeExecutionTools.ts (18x)
/src/llm-providers/anthropic-claude/AnthropicClaudeExecutionToolsOptions.ts (2x)
/src/llm-providers/anthropic-claude/computeAnthropicClaudeUsage.test.ts (1x)
/src/llm-providers/anthropic-claude/computeAnthropicClaudeUsage.ts (8x)
/src/llm-providers/anthropic-claude/createAnthropicClaudeExecutionTools.ts (4x)
/src/llm-providers/anthropic-claude/playground/playground.ts (6x)
/src/llm-providers/anthropic-claude/register-configuration.ts (7x)
/src/llm-providers/anthropic-claude/register-constructor.ts (3x)
/src/llm-providers/azure-openai/AzureOpenAiExecutionTools.ts (18x)
{
  match: [
    "import type { Usage } from '../../execution/Usage';",
    'type ',
    'Usage',
    index: 767,
    input: "import { AzureKeyCredential, OpenAIClient } from '@azure/openai';\n" +
      "import Bottleneck from 'bottleneck';\n" +
      "import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser\n" +
      "import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';\n" +
      "import { CONNECTION_TIMEOUT_MS, DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';\n" +
      "import { PipelineExecutionError } from '../../errors/PipelineExecutionError';\n" +
      "import { UnexpectedError } from '../../errors/UnexpectedError';\n" +
      "import type { AvailableModel } from '../../execution/AvailableModel';\n" +
      "import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';\n" +
      "import type { ChatPromptResult, CompletionPromptResult } from '../../execution/PromptResult';\n" +
      "import type { Usage } from '../../execution/Usage';\n" +
      "import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';\n" +
      "import { uncertainNumber } from '../../execution/utils/uncertainNumber';\n" +
      "import type { Prompt } from '../../types/Prompt';\n" +
      'import type {\n' +
      '    string_completion_prompt,\n' +
      '    string_date_iso8601,\n' +
      '    string_markdown,\n' +
      '    string_markdown_text,\n' +
      '    string_name,\n' +
      '    string_title,\n' +
      "} from '../../types/typeAliases';\n" +
      "import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';\n" +
      "import { keepTypeImported } from '../../utils/organization/keepTypeImported';\n" +
      "import { templateParameters } from '../../utils/parameters/templateParameters';\n" +
      "import { exportJson } from '../../utils/serialization/exportJson';\n" +
      "import { OPENAI_MODELS } from '../openai/openai-models';\n" +
      "import type { AzureOpenAiExecutionToolsOptions } from './AzureOpenAiExecutionToolsOptions';\n" +
      '\n' +
      '/**\n' +
      ' * Profile for Azure OpenAI provider\n' +
      ' */\n' +
      'const AZURE_OPENAI_PROVIDER_PROFILE: ChatParticipant = {\n' +
      "    name: 'AZURE_OPENAI' as string_name,\n" +
      "    fullname: 'Azure OpenAI',\n" +
      "    color: '#0078d4',\n" +
      '} as const;\n' +
      '\n' +
      'keepTypeImported<Usage>();\n' +
      '\n' +
      '/**\n' +
      ' * Execution Tools for calling Azure OpenAI API.\n' +
      ' *\n' +
      ' * @public exported from `@promptbook/azure-openai`\n' +
      ' */\n' +
      'export class AzureOpenAiExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {\n' +
      '    /**\n' +
      '     * OpenAI Azure API client.\n' +
      '     */\n' +
      '    private client: OpenAIClient | null = null;\n' +
      '\n' +
      '    /**\n' +
      '     * Rate limiter instance\n' +
      '     */\n' +
      '    private limiter: Bottleneck;\n' +
      '\n' +
      '    /**\n' +
      '     * Creates OpenAI Execution Tools.\n' +
      '     *\n' +
      '     * @param options which are relevant are directly passed to the OpenAI client\n' +
      '     */\n' +
      '    public constructor(protected readonly options: AzureOpenAiExecutionToolsOptions) {\n' +
      '        // TODO: Allow configuring rate limits via options\n' +
      '        this.limiter = new Bottleneck({\n' +
      '            minTime: 60000 / (this.options.maxRequestsPerMinute || DEFAULT_MAX_REQUESTS_PER_MINUTE),\n' +
      '        });\n' +
      '    }\n' +
      '\n' +
      '    public get title(): string_title & string_markdown_text {\n' +
      "        return 'Azure OpenAI';\n" +
      '    }\n' +
      '\n' +
      '    public get description(): string_markdown {\n' +
      "        return 'Use all models trained by OpenAI provided by Azure';\n" +
      '    }\n' +
      '\n' +
      '    public get profile() {\n' +
      '        return AZURE_OPENAI_PROVIDER_PROFILE;\n' +
      '    }\n' +
      '\n' +
      '    public async getClient(): Promise<OpenAIClient> {\n' +
      '        if (this.client === null) {\n' +
      '            this.client = new OpenAIClient(\n' +
      '                `https://${this.options.resourceName}.openai.azure.com/`,\n' +
      '                new AzureKeyCredential(this.options.apiKey),\n' +
      '            );\n' +
      '        }\n' +
      '\n' +
      '        return this.client;\n' +
      '    }\n' +
      '\n' +
      '    /**\n' +
      '     * Check the `options` passed to `constructor`\n' +
      '     */\n' +
      '    public async checkConfiguration(): Promise<void> {\n' +
      '        await this.getClient();\n' +
      '        // TODO: [🎍] Do here a real check that API is online, working and API key is correct\n' +
      '    }\n' +
      '\n' +
      '    /**\n' +
      '     * List all available Azure OpenAI models that can be used\n' +
      '     */\n' +
      '    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {\n' +
      '        // TODO: [main] !!3 Do here some filtering which models are really available as deployment\n' +
      '        //       @see https://management.azure.com/subscriptions/subscriptionId/resourceGroups/resourceGroupName/providers/Microsoft.CognitiveServices/accounts/accountName/deployments?api-version=2023-05-01\n' +
      '        return OPENAI_MODELS.map(\n' +
      '            ({\n' +
      '                modelTitle,\n' +
      '                modelName,\n' +
      '\n' +
      '                modelVariant,\n' +
      '            }) => ({\n' +
      '                modelTitle: `Azure ${modelTitle}`,\n' +
      '                modelName,\n' +
      '                modelVariant,\n' +
      '            }),\n' +
      '        );\n' +
      '    }\n' +
      '\n' +
      '    /**\n' +
      '     * Calls OpenAI API to use a chat model.\n' +
      '     */\n' +
      '    public async callChatModel(\n' +
      "        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,\n" +
      '    ): Promise<ChatPromptResult> {\n' +
      '        if (this.options.isVerbose) {\n' +
      "            console.info('💬 OpenAI callChatModel call');\n" +
      '        }\n' +
      '\n' +
      '        const { content, parameters, modelRequirements } = prompt;\n' +
      '\n' +
      '        const client = await this.getClient();\n' +
      '\n' +
      '        // TODO: [☂] Use here more modelRequirements\n' +
      "        if (modelRequirements.modelVariant !== 'CHAT') {\n" +
      "            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');\n" +
      '        }\n' +
      '\n' +
      '        try {\n' +
      '            const modelName = prompt.modelRequirements.modelName || this.options.deploymentName;\n' +
      '            const modelSettings = {\n' +
      '                maxTokens: modelRequirements.maxTokens,\n' +
      '                temperature: modelRequirements.temperature,\n' +
      '                user: this.options.userId?.toString(),\n' +
      '                // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools\n' +
      '                // <- Note: [🧆]\n' +
      '            }; // <- TODO: [💩] TODO: Guard here types better\n' +
      '\n' +
      '            const rawPromptContent = templateParameters(content, { ...parameters, modelName });\n' +
      '            const messages = [\n' +
      '                ...(modelRequirements.systemMessage === undefined\n' +
      '                    ? []\n' +
      '                    : ([\n' +
      '                          {\n' +
      "                              role: 'system',\n" +
      '                              content: modelRequirements.systemMessage,\n' +
      '                          },\n' +
      '                      ] as const)),\n' +
      '                {\n' +
      "                    role: 'user',\n" +
      '                    content: rawPromptContent,\n' +
      '                },\n' +
      '            ];\n' +
      '\n' +
      '            const start: string_date_iso8601 = $getCurrentDate();\n' +
      '            let complete: string_date_iso8601;\n' +
      '\n' +
      '            if (this.options.isVerbose) {\n' +
      "                console.info(colors.bgWhite('messages'), JSON.stringify(messages, null, 4));\n" +
      '            }\n' +
      '\n' +
      '            const rawRequest = [modelName, messages, modelSettings] as const;\n' +
      '            const rawResponse = await this.limiter\n' +
      '                .schedule(() => this.withTimeout(client.getChatCompletions(...rawRequest)))\n' +
      '                .catch((error) => {\n' +
      '                    if (this.options.isVerbose) {\n' +
      "                        console.info(colors.bgRed('error'), error);\n" +
      '                    }\n' +
      '                    throw error;\n' +
      '                });\n' +
      '\n' +
      '            if (this.options.isVerbose) {\n' +
      "                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));\n" +
      '            }\n' +
      '\n' +
      '            if (!rawResponse.choices[0]) {\n' +
      "                throw new PipelineExecutionError('No choises from Azure OpenAI');\n" +
      '            }\n' +
      '\n' +
      '            if (rawResponse.choices.length > 1) {\n' +
      '                // TODO: This should be maybe only warning\n' +
      "                throw new PipelineExecutionError('More than one choise from Azure OpenAI');\n" +
      '            }\n' +
      '\n' +
      '            if (!rawResponse.choices[0].message || !rawResponse.choices[0].message.content) {\n' +
      "                throw new PipelineExecutionError('Empty response from Azure OpenAI');\n" +
      '            }\n' +
      '\n' +
      '            const resultContent = rawResponse.choices[0].message.content;\n' +
      '            // eslint-disable-next-line prefer-const\n' +
      '            complete = $getCurrentDate();\n' +
      '\n' +
      '            const duration = uncertainNumber((new Date(complete).getTime() - new Date(start).getTime()) / 1000);\n' +
      '\n' +
      '            const usage = {\n' +
      '                price: uncertainNumber() /* <- TODO: [🐞] Compute usage */,\n' +
      '                duration,\n' +
      '                input: {\n' +
      '                    tokensCount: uncertainNumber(rawResponse.usage?.promptTokens),\n' +
      '                    ...computeUsageCounts(\n' +
      '                        prompt.content,\n' +
      '\n' +
      '                        // <- TODO: [🕘][🙀] What about system message\n' +
      '                    ),\n' +
      '                },\n' +
      '                output: {\n' +
      '                    tokensCount: uncertainNumber(rawResponse.usage?.completionTokens),\n' +
      '                    ...computeUsageCounts(prompt.content),\n' +
      '                },\n' +
      '            } satisfies Usage; /* <- Note: [🤛] */\n' +
      '\n' +
      '            return exportJson({\n' +
      "                name: 'promptResult',\n" +
      '                message: `Result of \\`AzureOpenAiExecutionTools.callChatModel\\``,\n' +
      '                order: [],\n' +
      '                value: {\n' +
      '                    content: resultContent,\n' +
      '                    modelName,\n' +
      '                    timing: {\n' +
      '                        start,\n' +
      '                        complete,\n' +
      '                    },\n' +
      '                    usage,\n' +
      '                    rawPromptContent,\n' +
      '                    rawRequest,\n' +
      '                    rawResponse: {\n' +
      '                        ...rawResponse,\n' +
      '                        created: rawResponse.created.toISOString(),\n' +
      '                        //  <- TODO: Put `created` at beginning\n' +
      '                    },\n' +
      '                    // <- [🗯]\n' +
      '                },\n' +
      '            });\n' +
      '        } catch (error) {\n' +
      '            throw this.transformAzureError(error as { code: string; message: string });\n' +
      '        }\n' +
      '    }\n' +
      '\n' +
      '    /**\n' +
      '     * Calls Azure OpenAI API to use a complete model.\n' +
      '     */\n' +
      '    public async callCompletionModel(\n' +
      "        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,\n" +
      '    ): Promise<CompletionPromptResult> {\n' +
      '        if (this.options.isVerbose) {\n' +
      "            console.info('🖋 OpenAI callCompletionModel call');\n" +
      '        }\n' +
      '\n' +
      '        const { content, parameters, modelRequirements } = prompt;\n' +
      '\n' +
      '        const client = await this.getClient();\n' +
      '\n' +
      '        // TODO: [☂] Use here more modelRequirements\n' +
      "        if (modelRequirements.modelVariant !== 'COMPLETION') {\n"... 5473 more characters,
    groups: [Object: null prototype] { importedEntities: 'Usage' }
  ]
}
{
  match: [
    "import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';",
    undefined,
    'computeUsageCounts',
    index: 819,
    input: "import { AzureKeyCredential, OpenAIClient } from '@azure/openai';\n" +
      "import Bottleneck from 'bottleneck';\n" +
      "import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser\n" +
      "import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';\n" +
      "import { CONNECTION_TIMEOUT_MS, DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';\n" +
      "import { PipelineExecutionError } from '../../errors/PipelineExecutionError';\n" +
      "import { UnexpectedError } from '../../errors/UnexpectedError';\n" +
      "import type { AvailableModel } from '../../execution/AvailableModel';\n" +
      "import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';\n" +
      "import type { ChatPromptResult, CompletionPromptResult } from '../../execution/PromptResult';\n" +
      "import type { Usage } from '../../execution/Usage';\n" +
      "import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';\n" +
      "import { uncertainNumber } from '../../execution/utils/uncertainNumber';\n" +
      "import type { Prompt } from '../../types/Prompt';\n" +
      'import type {\n' +
      '    string_completion_prompt,\n' +
      '    string_date_iso8601,\n' +
      '    string_markdown,\n' +
      '    string_markdown_text,\n' +
      '    string_name,\n' +
      '    string_title,\n' +
      "} from '../../types/typeAliases';\n" +
      "import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';\n" +
      "import { keepTypeImported } from '../../utils/organization/keepTypeImported';\n" +
      "import { templateParameters } from '../../utils/parameters/templateParameters';\n" +
      "import { exportJson } from '../../utils/serialization/exportJson';\n" +
      "import { OPENAI_MODELS } from '../openai/openai-models';\n" +
      "import type { AzureOpenAiExecutionToolsOptions } from './AzureOpenAiExecutionToolsOptions';\n" +
      '\n' +
      '/**\n' +
      ' * Profile for Azure OpenAI provider\n' +
      ' */\n' +
      'const AZURE_OPENAI_PROVIDER_PROFILE: ChatParticipant = {\n' +
      "    name: 'AZURE_OPENAI' as string_name,\n" +
      "    fullname: 'Azure OpenAI',\n" +
      "    color: '#0078d4',\n" +
      '} as const;\n' +
      '\n' +
      'keepTypeImported<Usage>();\n' +
      '\n' +
      '/**\n' +
      ' * Execution Tools for calling Azure OpenAI API.\n' +
      ' *\n' +
      ' * @public exported from `@promptbook/azure-openai`\n' +
      ' */\n' +
      'export class AzureOpenAiExecutionTools implements LlmExecutionTools /* <- TODO: [🍚] `, Destroyable` */ {\n' +
      '    /**\n' +
      '     * OpenAI Azure API client.\n' +
      '     */\n' +
      '    private client: OpenAIClient | null = null;\n' +
      '\n' +
      '    /**\n' +
      '     * Rate limiter instance\n' +
      '     */\n' +
      '    private limiter: Bottleneck;\n' +
      '\n' +
      '    /**\n' +
      '     * Creates OpenAI Execution Tools.\n' +
      '     *\n' +
      '     * @param options which are relevant are directly passed to the OpenAI client\n' +
      '     */\n' +
      '    public constructor(protected readonly options: AzureOpenAiExecutionToolsOptions) {\n' +
      '        // TODO: Allow configuring rate limits via options\n' +
      '        this.limiter = new Bottleneck({\n' +
      '            minTime: 60000 / (this.options.maxRequestsPerMinute || DEFAULT_MAX_REQUESTS_PER_MINUTE),\n' +
      '        });\n' +
      '    }\n' +
      '\n' +
      '    public get title(): string_title & string_markdown_text {\n' +
      "        return 'Azure OpenAI';\n" +
      '    }\n' +
      '\n' +
      '    public get description(): string_markdown {\n' +
      "        return 'Use all models trained by OpenAI provided by Azure';\n" +
      '    }\n' +
      '\n' +
      '    public get profile() {\n' +
      '        return AZURE_OPENAI_PROVIDER_PROFILE;\n' +
      '    }\n' +
      '\n' +
      '    public async getClient(): Promise<OpenAIClient> {\n' +
      '        if (this.client === null) {\n' +
      '            this.client = new OpenAIClient(\n' +
      '                `https://${this.options.resourceName}.openai.azure.com/`,\n' +
      '                new AzureKeyCredential(this.options.apiKey),\n' +
      '            );\n' +
      '        }\n' +
      '\n' +
      '        return this.client;\n' +
      '    }\n' +
      '\n' +
      '    /**\n' +
      '     * Check the `options` passed to `constructor`\n' +
      '     */\n' +
      '    public async checkConfiguration(): Promise<void> {\n' +
      '        await this.getClient();\n' +
      '        // TODO: [🎍] Do here a real check that API is online, working and API key is correct\n' +
      '    }\n' +
      '\n' +
      '    /**\n' +
      '     * List all available Azure OpenAI models that can be used\n' +
      '     */\n' +
      '    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {\n' +
      '        // TODO: [main] !!3 Do here some filtering which models are really available as deployment\n' +
      '        //       @see https://management.azure.com/subscriptions/subscriptionId/resourceGroups/resourceGroupName/providers/Microsoft.CognitiveServices/accounts/accountName/deployments?api-version=2023-05-01\n' +
      '        return OPENAI_MODELS.map(\n' +
      '            ({\n' +
      '                modelTitle,\n' +
      '                modelName,\n' +
      '\n' +
      '                modelVariant,\n' +
      '            }) => ({\n' +
      '                modelTitle: `Azure ${modelTitle}`,\n' +
      '                modelName,\n' +
      '                modelVariant,\n' +
      '            }),\n' +
      '        );\n' +
      '    }\n' +
      '\n' +
      '    /**\n' +
      '     * Calls OpenAI API to use a chat model.\n' +
      '     */\n' +
      '    public async callChatModel(\n' +
      "        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,\n" +
      '    ): Promise<ChatPromptResult> {\n' +
      '        if (this.options.isVerbose) {\n' +
      "            console.info('💬 OpenAI callChatModel call');\n" +
      '        }\n' +
      '\n' +
      '        const { content, parameters, modelRequirements } = prompt;\n' +
      '\n' +
      '        const client = await this.getClient();\n' +
      '\n' +
      '        // TODO: [☂] Use here more modelRequirements\n' +
      "        if (modelRequirements.modelVariant !== 'CHAT') {\n" +
      "            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');\n" +
      '        }\n' +
      '\n' +
      '        try {\n' +
      '            const modelName = prompt.modelRequirements.modelName || this.options.deploymentName;\n' +
      '            const modelSettings = {\n' +
      '                maxTokens: modelRequirements.maxTokens,\n' +
      '                temperature: modelRequirements.temperature,\n' +
      '                user: this.options.userId?.toString(),\n' +
      '                // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools\n' +
      '                // <- Note: [🧆]\n' +
      '            }; // <- TODO: [💩] TODO: Guard here types better\n' +
      '\n' +
      '            const rawPromptContent = templateParameters(content, { ...parameters, modelName });\n' +
      '            const messages = [\n' +
      '                ...(modelRequirements.systemMessage === undefined\n' +
      '                    ? []\n' +
      '                    : ([\n' +
      '                          {\n' +
      "                              role: 'system',\n" +
      '                              content: modelRequirements.systemMessage,\n' +
      '                          },\n' +
      '                      ] as const)),\n' +
      '                {\n' +
      "                    role: 'user',\n" +
      '                    content: rawPromptContent,\n' +
      '                },\n' +
      '            ];\n' +
      '\n' +
      '            const start: string_date_iso8601 = $getCurrentDate();\n' +
      '            let complete: string_date_iso8601;\n' +
      '\n' +
      '            if (this.options.isVerbose) {\n' +
      "                console.info(colors.bgWhite('messages'), JSON.stringify(messages, null, 4));\n" +
      '            }\n' +
      '\n' +
      '            const rawRequest = [modelName, messages, modelSettings] as const;\n' +
      '            const rawResponse = await this.limiter\n' +
      '                .schedule(() => this.withTimeout(client.getChatCompletions(...rawRequest)))\n' +
      '                .catch((error) => {\n' +
      '                    if (this.options.isVerbose) {\n' +
      "                        console.info(colors.bgRed('error'), error);\n" +
      '                    }\n' +
      '                    throw error;\n' +
      '                });\n' +
      '\n' +
      '            if (this.options.isVerbose) {\n' +
      "                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));\n" +
      '            }\n' +
      '\n' +
      '            if (!rawResponse.choices[0]) {\n' +
      "                throw new PipelineExecutionError('No choises from Azure OpenAI');\n" +
      '            }\n' +
      '\n' +
      '            if (rawResponse.choices.length > 1) {\n' +
      '                // TODO: This should be maybe only warning\n' +
      "                throw new PipelineExecutionError('More than one choise from Azure OpenAI');\n" +
      '            }\n' +
      '\n' +
      '            if (!rawResponse.choices[0].message || !rawResponse.choices[0].message.content) {\n' +
      "                throw new PipelineExecutionError('Empty response from Azure OpenAI');\n" +
      '            }\n' +
      '\n' +
      '            const resultContent = rawResponse.choices[0].message.content;\n' +
      '            // eslint-disable-next-line prefer-const\n' +
      '            complete = $getCurrentDate();\n' +
      '\n' +
      '            const duration = uncertainNumber((new Date(complete).getTime() - new Date(start).getTime()) / 1000);\n' +
      '\n' +
      '            const usage = {\n' +
      '                price: uncertainNumber() /* <- TODO: [🐞] Compute usage */,\n' +
      '                duration,\n' +
      '                input: {\n' +
      '                    tokensCount: uncertainNumber(rawResponse.usage?.promptTokens),\n' +
      '                    ...computeUsageCounts(\n' +
      '                        prompt.content,\n' +
      '\n' +
      '                        // <- TODO: [🕘][🙀] What about system message\n' +
      '                    ),\n' +
      '                },\n' +
      '                output: {\n' +
      '                    tokensCount: uncertainNumber(rawResponse.usage?.completionTokens),\n' +
      '                    ...computeUsageCounts(prompt.content),\n' +
      '                },\n' +
      '            } satisfies Usage; /* <- Note: [🤛] */\n' +
      '\n' +
      '            return exportJson({\n' +
      "                name: 'promptResult',\n" +
      '                message: `Result of \\`AzureOpenAiExecutionTools.callChatModel\\``,\n' +
      '                order: [],\n' +
      '                value: {\n' +
      '                    content: resultContent,\n' +
      '                    modelName,\n' +
      '                    timing: {\n' +
      '                        start,\n' +
      '                        complete,\n' +
      '                    },\n' +
      '                    usage,\n' +
      '                    rawPromptContent,\n' +
      '                    rawRequest,\n' +
      '                    rawResponse: {\n' +
      '                        ...rawResponse,\n' +
      '                        created: rawResponse.created.toISOString(),\n' +
      '                        //  <- TODO: Put `created` at beginning\n' +
      '                    },\n' +
      '                    // <- [🗯]\n' +
      '                },\n' +
      '            });\n' +
      '        } catch (error) {\n' +
      '            throw this.transformAzureError(error as { code: string; message: string });\n' +
      '        }\n' +
      '    }\n' +
      '\n' +
      '    /**\n' +
      '     * Calls Azure OpenAI API to use a complete model.\n' +
      '     */\n' +
      '    public async callCompletionModel(\n' +
      "        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,\n" +
      '    ): Promise<CompletionPromptResult> {\n' +
      '        if (this.options.isVerbose) {\n' +
      "            console.info('🖋 OpenAI callCompletionModel call');\n" +
      '        }\n' +
      '\n' +
      '        const { content, parameters, modelRequirements } = prompt;\n' +
      '\n' +
      '        const client = await this.getClient();\n' +
      '\n' +
      '        // TODO: [☂] Use here more modelRequirements\n' +
      "        if (modelRequirements.modelVariant !== 'COMPLETION') {\n"... 5473 more characters,
    groups: [Object: null prototype] { importedEntities: 'computeUsageCounts' }
  ]
}
/src/llm-providers/azure-openai/AzureOpenAiExecutionToolsOptions.ts (4x)
/src/llm-providers/azure-openai/createAzureOpenAiExecutionTools.ts (3x)
/src/llm-providers/azure-openai/playground/playground.ts (4x)
/src/llm-providers/azure-openai/register-configuration.ts (7x)
/src/llm-providers/azure-openai/register-constructor.ts (3x)
/src/llm-providers/deepseek/createDeepseekExecutionTools.ts (8x)
/src/llm-providers/deepseek/deepseek-models.ts (4x)
/src/llm-providers/deepseek/DeepseekExecutionToolsOptions.ts (1x)
/src/llm-providers/deepseek/register-configuration.ts (7x)
/src/llm-providers/deepseek/register-constructor.ts (3x)
/src/llm-providers/google/createGoogleExecutionTools.ts (16x)
/src/llm-providers/google/google-models.ts (4x)
/src/llm-providers/google/GoogleExecutionToolsOptions.ts (1x)
/src/llm-providers/google/register-configuration.ts (6x)
/src/llm-providers/google/register-constructor.ts (3x)
/src/llm-providers/mocked/$fakeTextToExpectations.ts (7x)
/src/llm-providers/mocked/MockedEchoLlmExecutionTools.ts (11x)
/src/llm-providers/mocked/MockedFackedLlmExecutionTools.ts (14x)
/src/llm-providers/mocked/test/faked-completion.test.ts (6x)
/src/llm-providers/mocked/test/fakeTextToExpectations.test.ts (3x)
/src/llm-providers/mocked/test/joker.test.ts (5x)
/src/llm-providers/mocked/test/mocked-chat.test.ts (6x)
/src/llm-providers/mocked/test/mocked-completion.test.ts (6x)
/src/llm-providers/ollama/createOllamaExecutionTools.ts (6x)
/src/llm-providers/ollama/ollama-models.ts (2x)
/src/llm-providers/ollama/OllamaExecutionTools.ts (12x)
/src/llm-providers/ollama/OllamaExecutionToolsOptions.ts (1x)
/src/llm-providers/ollama/playground/playground.ts (7x)
/src/llm-providers/ollama/register-configuration.ts (8x)
/src/llm-providers/ollama/register-constructor.ts (3x)
/src/llm-providers/openai/computeOpenAiUsage.test.ts (1x)
/src/llm-providers/openai/computeOpenAiUsage.ts (9x)
/src/llm-providers/openai/createOpenAiAssistantExecutionTools.ts (5x)
/src/llm-providers/openai/createOpenAiCompatibleExecutionTools.ts (13x)
/src/llm-providers/openai/createOpenAiExecutionTools.ts (6x)
/src/llm-providers/openai/openai-models.test.ts (2x)
/src/llm-providers/openai/openai-models.ts (3x)
/src/llm-providers/openai/OpenAiAgentKitExecutionTools.test.ts (2x)
/src/llm-providers/openai/OpenAiAgentKitExecutionTools.ts (25x)
/src/llm-providers/openai/OpenAiAgentKitExecutionToolsOptions.ts (2x)
/src/llm-providers/openai/OpenAiAssistantExecutionTools.ts (29x)
/src/llm-providers/openai/OpenAiAssistantExecutionToolsOptions.ts (2x)
/src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts (21x)
/src/llm-providers/openai/OpenAiCompatibleExecutionToolsOptions.ts (3x)
/src/llm-providers/openai/OpenAiExecutionTools.ts (7x)
/src/llm-providers/openai/OpenAiExecutionToolsOptions.ts (1x)
/src/llm-providers/openai/OpenAiVectorStoreHandler.ts (7x)
/src/llm-providers/openai/playground/playground.ts (13x)
/src/llm-providers/openai/register-configuration.ts (11x)
/src/llm-providers/openai/register-constructor.ts (5x)
/src/llm-providers/openai/utils/buildToolInvocationScript.ts (1x)
/src/llm-providers/openai/utils/callOpenAiCompatibleChatModel.ts (25x)
/src/llm-providers/openai/utils/mapToolsToOpenAi.ts (1x)
/src/llm-providers/openai/utils/OpenAiCompatibleUnsupportedParameterRetrier.ts (4x)
/src/llm-providers/openai/utils/uploadFilesToOpenAi.ts
/src/llm-providers/remote/playground/playground.ts (8x)
/src/llm-providers/remote/RemoteLlmExecutionTools.ts (16x)
/src/llm-providers/vercel/createExecutionToolsFromVercelProvider.ts (16x)
/src/llm-providers/vercel/playground/playground.ts (7x)
/src/llm-providers/vercel/VercelExecutionToolsOptions.ts (4x)
/src/llm-providers/vercel/VercelProvider.ts
/src/migrations/migratePipeline.ts (2x)
/src/other/templates/getBookTemplates.ts (5x)
/src/other/templates/getTemplatesPipelineCollection.ts (2x)
/src/personas/preparePersona.ts (12x)
/src/pipeline/book-notation.ts (6x)
/src/pipeline/isValidPipelineString.test.ts (2x)
/src/pipeline/isValidPipelineString.ts (3x)
/src/pipeline/PipelineInterface/constants.ts (1x)
/src/pipeline/PipelineInterface/getPipelineInterface.ts (5x)
/src/pipeline/PipelineInterface/isPipelineImplementingInterface.ts (4x)
/src/pipeline/PipelineInterface/isPipelineInterfacesEqual.ts (2x)
/src/pipeline/PipelineInterface/PipelineInterface.ts (2x)
/src/pipeline/PipelineJson/CommonTaskJson.ts (12x)
/src/pipeline/PipelineJson/DialogTaskJson.ts (1x)
/src/pipeline/PipelineJson/Expectations.ts (2x)
/src/pipeline/PipelineJson/KnowledgePieceJson.ts (8x)
/src/pipeline/PipelineJson/KnowledgeSourceJson.ts (3x)
/src/pipeline/PipelineJson/ParameterJson.ts (3x)
/src/pipeline/PipelineJson/PersonaJson.ts (4x)
/src/pipeline/PipelineJson/PipelineJson.ts (16x)
/src/pipeline/PipelineJson/PreparationJson.ts (3x)
/src/pipeline/PipelineJson/PromptTaskJson.ts (3x)
/src/pipeline/PipelineJson/ScriptTaskJson.ts (2x)
/src/pipeline/PipelineJson/SimpleTaskJson.ts (1x)
/src/pipeline/PipelineJson/TaskJson.ts (5x)
/src/pipeline/PipelineString.ts
/src/pipeline/prompt-notation.test.ts (1x)
/src/pipeline/prompt-notation.ts (10x)
/src/pipeline/prompt-notation/helpers/ParameterEscaping.ts (1x)
/src/pipeline/prompt-notation/helpers/ParameterNaming.ts (1x)
/src/pipeline/prompt-notation/helpers/ParameterSection.ts (1x)
/src/pipeline/validatePipelineString.ts (6x)
/src/playground/permanent/_boilerplate.ts
/src/playground/permanent/agent-with-browser-playground.ts (2x)
/src/playground/permanent/error-handling-playground.ts (5x)
/src/playground/playground.ts
/src/postprocessing/utils/extractBlock.ts (2x)
/src/postprocessing/utils/extractJsonBlock.test.ts (2x)
/src/postprocessing/utils/extractJsonBlock.ts (5x)
/src/prepare/isPipelinePrepared.test.ts (5x)
/src/prepare/isPipelinePrepared.ts (4x)
/src/prepare/PrepareAndScrapeOptions.ts (2x)
/src/prepare/preparePipeline.ts (21x)
/src/prepare/preparePipelineOnRemoteServer.ts (7x)
/src/prepare/prepareTasks.ts (7x)
/src/prepare/unpreparePipeline.ts (4x)
/src/remote-server/createRemoteClient.ts (3x)
/src/remote-server/openapi-types.ts
/src/remote-server/openapi.ts
/src/remote-server/RemoteServer.ts (2x)
/src/remote-server/socket-types/_common/PromptbookServer_Error.ts (1x)
/src/remote-server/socket-types/_subtypes/Identification.ts (4x)
/src/remote-server/socket-types/_subtypes/identificationToPromptbookToken.ts (3x)
/src/remote-server/socket-types/_subtypes/promptbookTokenToIdentification.ts (2x)
/src/remote-server/socket-types/listModels/PromptbookServer_ListModels_Request.ts (1x)
/src/remote-server/socket-types/listModels/PromptbookServer_ListModels_Response.ts (1x)
/src/remote-server/socket-types/prepare/PromptbookServer_PreparePipeline_Request.ts (2x)
/src/remote-server/socket-types/prepare/PromptbookServer_PreparePipeline_Response.ts (1x)
/src/remote-server/socket-types/prompt/PromptbookServer_Prompt_Request.ts (2x)
/src/remote-server/socket-types/prompt/PromptbookServer_Prompt_Response.ts (1x)
/src/remote-server/startAgentServer.ts (3x)
/src/remote-server/startRemoteServer.ts (37x)
/src/remote-server/types/RemoteClientOptions.ts (3x)
/src/remote-server/types/RemoteServerOptions.ts (7x)
/src/remote-server/ui/renderServerIndexHtml.ts (1x)
/src/remote-server/ui/ServerApp.tsx (1x)
/src/remote-server/ui/types.ts
/src/scrapers/_boilerplate/BoilerplateScraper.ts (19x)
/src/scrapers/_boilerplate/createBoilerplateScraper.ts (6x)
/src/scrapers/_boilerplate/playground/boilerplate-scraper-playground.ts (7x)
/src/scrapers/_boilerplate/register-constructor.ts (3x)
/src/scrapers/_boilerplate/register-metadata.ts (5x)
/src/scrapers/_common/Converter.ts (3x)
/src/scrapers/_common/prepareKnowledgePieces.test.ts (2x)
/src/scrapers/_common/prepareKnowledgePieces.ts (11x)
/src/scrapers/_common/register/$provideFilesystemForNode.ts (6x)
/src/scrapers/_common/register/$provideScrapersForBrowser.ts (7x)
/src/scrapers/_common/register/$provideScrapersForNode.ts (9x)
/src/scrapers/_common/register/$provideScriptingForNode.ts (8x)
/src/scrapers/_common/register/$registeredScrapersMessage.ts (5x)
/src/scrapers/_common/register/$scrapersMetadataRegister.ts (2x)
/src/scrapers/_common/register/$scrapersRegister.ts (2x)
/src/scrapers/_common/register/ScraperAndConverterMetadata.ts (3x)
/src/scrapers/_common/register/ScraperConstructor.ts (5x)
/src/scrapers/_common/Scraper.ts (6x)
/src/scrapers/_common/ScraperIntermediateSource.ts (1x)
/src/scrapers/_common/utils/getScraperIntermediateSource.test.ts (1x)
/src/scrapers/_common/utils/getScraperIntermediateSource.ts (8x)
/src/scrapers/_common/utils/makeKnowledgeSourceHandler.ts (20x)
/src/scrapers/_common/utils/promptbookFetch.test.ts (1x)
/src/scrapers/_common/utils/promptbookFetch.ts (4x)
/src/scrapers/document-legacy/createLegacyDocumentScraper.ts (6x)
/src/scrapers/document-legacy/LegacyDocumentScraper.test.ts (5x)
/src/scrapers/document-legacy/LegacyDocumentScraper.ts (19x)
/src/scrapers/document-legacy/playground/legacy-document-scraper-playground.ts (7x)
/src/scrapers/document-legacy/register-constructor.ts (3x)
/src/scrapers/document-legacy/register-metadata.ts (5x)
/src/scrapers/document/createDocumentScraper.ts (6x)
/src/scrapers/document/DocumentScraper.test.ts (5x)
/src/scrapers/document/DocumentScraper.ts (19x)
/src/scrapers/document/playground/document-scraper-playground.ts (7x)
/src/scrapers/document/register-constructor.ts (3x)
/src/scrapers/document/register-metadata.ts (5x)
/src/scrapers/markdown/createMarkdownScraper.ts (6x)
/src/scrapers/markdown/MarkdownScraper.test.ts (4x)
/src/scrapers/markdown/MarkdownScraper.ts (16x)
/src/scrapers/markdown/playground/markdown-scraper-playground.ts (6x)
/src/scrapers/markdown/register-constructor.ts (3x)
/src/scrapers/markdown/register-metadata.ts (5x)
/src/scrapers/markitdown/createMarkitdownScraper.ts (6x)
/src/scrapers/markitdown/MarkitdownScraper.ts (19x)
/src/scrapers/markitdown/playground/markitdown-scraper-playground.ts (9x)
/src/scrapers/markitdown/register-constructor.ts (3x)
/src/scrapers/markitdown/register-metadata.ts (5x)
/src/scrapers/pdf/createPdfScraper.ts (6x)
/src/scrapers/pdf/PdfScraper.ts (12x)
/src/scrapers/pdf/playground/pdf-scraper-playground.ts (6x)
/src/scrapers/pdf/register-constructor.ts (3x)
/src/scrapers/pdf/register-metadata.ts (5x)
/src/scrapers/website/createWebsiteScraper.ts (6x)
/src/scrapers/website/playground/website-scraper-playground.ts (7x)
/src/scrapers/website/register-constructor.ts (3x)
/src/scrapers/website/register-metadata.ts (5x)
/src/scrapers/website/utils/createShowdownConverter.test.ts (1x)
/src/scrapers/website/utils/createShowdownConverter.ts
/src/scrapers/website/WebsiteScraper.ts (19x)
/src/scripting/_test/custom-function-async.test.ts.test.ts (6x)
/src/scripting/_test/custom-function-missing.test.ts (6x)
/src/scripting/_test/custom-function-with-dependencies.test.ts (8x)
/src/scripting/_test/custom-function.test.ts (6x)
/src/scripting/_test/postprocessing.test.ts (6x)
/src/scripting/_test/script-execution-errors.test.ts (6x)
/src/scripting/_test/script-execution-tools.test.ts (6x)
/src/scripting/javascript/JavascriptEvalExecutionTools.test.ts (2x)
/src/scripting/javascript/JavascriptExecutionTools.ts (1x)
/src/scripting/javascript/JavascriptExecutionToolsOptions.ts (3x)
/src/scripting/javascript/postprocessing-functions.ts (19x)
/src/scripting/javascript/utils/extractVariablesFromJavascript.test.ts (1x)
/src/scripting/javascript/utils/extractVariablesFromJavascript.ts (5x)
/src/scripting/javascript/utils/extractVariablesFromScript.test.ts (1x)
/src/scripting/python/PythonExecutionTools.ts (4x)
/src/scripting/typescript/TypescriptExecutionTools.ts (4x)
/src/search-engines/_index.ts
/src/search-engines/bing/BingSearchEngine.ts (3x)
/src/search-engines/dummy/DummySearchEngine.ts (3x)
/src/search-engines/google/GoogleSearchEngine.ts (3x)
/src/search-engines/SearchEngine.ts (2x)
/src/search-engines/SearchResult.ts (1x)
/src/search-engines/serp/SerpSearchEngine.ts (3x)
/src/speech-recognition/BrowserSpeechRecognition.ts (2x)
/src/speech-recognition/OpenAiSpeechRecognition.test.ts (1x)
/src/speech-recognition/OpenAiSpeechRecognition.ts (1x)
/src/storage/_common/PromptbookStorage.test-type.ts (2x)
/src/storage/_common/PromptbookStorage.ts
/src/storage/blackhole/BlackholeStorage.ts (2x)
/src/storage/env-storage/$EnvStorage.ts (8x)
/src/storage/file-cache-storage/FileCacheStorage.ts (14x)
/src/storage/file-cache-storage/FileCacheStorageOptions.ts (1x)
/src/storage/file-cache-storage/utils/nameToSubfolderPath.test.ts (1x)
/src/storage/file-cache-storage/utils/nameToSubfolderPath.ts (1x)
/src/storage/local-storage/getIndexedDbStorage.ts (6x)
/src/storage/local-storage/getLocalStorage.ts (5x)
/src/storage/local-storage/getSessionStorage.ts (5x)
/src/storage/local-storage/utils/IndexedDbStorageOptions.ts (1x)
/src/storage/local-storage/utils/makePromptbookStorageFromIndexedDb.ts (2x)
/src/storage/local-storage/utils/makePromptbookStorageFromWebStorage.ts (5x)
/src/storage/memory/MemoryStorage.ts (1x)
/src/storage/utils/PrefixStorage.ts (1x)
/src/transpilers/_common/BookTranspiler.ts (5x)
/src/transpilers/_common/BookTranspilerOptions.ts (5x)
/src/transpilers/_common/createTranspiledTeamRuntimeSection.ts (5x)
/src/transpilers/_common/createZodSchemaSource.ts
/src/transpilers/_common/formatUsedToolFunctions.test.ts (1x)
/src/transpilers/_common/formatUsedToolFunctions.ts (1x)
/src/transpilers/_common/prepareSdkTranspilerContext.ts (10x)
/src/transpilers/_common/register/$bookTranspilersRegister.ts (2x)
/src/transpilers/_common/resolveClaudeModelName.ts
/src/transpilers/_common/TranspiledTeamExport.ts (4x)
/src/transpilers/_common/transpiledTeamTranspilers.test.ts (10x)
/src/transpilers/agent-os/AgentOsTranspiler.test.ts (3x)
/src/transpilers/agent-os/AgentOsTranspiler.ts (12x)
/src/transpilers/agent-os/register.ts (3x)
/src/transpilers/anthropic-claude-managed/AnthropicClaudeManagedTranspiler.test.ts (3x)
/src/transpilers/anthropic-claude-managed/AnthropicClaudeManagedTranspiler.ts (13x)
/src/transpilers/anthropic-claude-managed/register.ts (3x)
/src/transpilers/anthropic-claude-sdk/AnthropicClaudeSdkTranspiler.test.ts (3x)
/src/transpilers/anthropic-claude-sdk/AnthropicClaudeSdkTranspiler.ts (10x)
/src/transpilers/anthropic-claude-sdk/register.ts (3x)
/src/transpilers/e2b/E2BTranspiler.test.ts (3x)
/src/transpilers/e2b/E2BTranspiler.ts (6x)
/src/transpilers/e2b/register.ts (3x)
/src/transpilers/formatted-book-in-markdown/FormattedBookInMarkdownTranspiler.ts (6x)
/src/transpilers/formatted-book-in-markdown/register.ts (3x)
/src/transpilers/openai-agents/OpenAiAgentsTranspiler.test.ts (3x)
/src/transpilers/openai-agents/OpenAiAgentsTranspiler.ts (12x)
/src/transpilers/openai-agents/register.ts (3x)
/src/transpilers/openai-sdk/OpenAiSdkTranspiler.test.ts (3x)
/src/transpilers/openai-sdk/OpenAiSdkTranspiler.ts (9x)
/src/transpilers/openai-sdk/playground/playground.ts (4x)
/src/transpilers/openai-sdk/register.ts (3x)
/src/types/Arrayable.ts
/src/types/InputParameters_private.ts (3x)
/src/types/IntermediateFilesStrategy.ts
/src/types/LlmCall.ts (2x)
/src/types/LlmToolDefinition.ts (1x)
/src/types/Message.ts (2x)
/src/types/ModelRequirements.ts (3x)
/src/types/ModelVariant.ts
/src/types/NonEmptyArray.ts
/src/types/number_bytes.ts (1x)
/src/types/number_id.ts (1x)
/src/types/number_likeness.ts
/src/types/number_milliseconds.ts (1x)
/src/types/number_percent.ts
/src/types/number_positive.ts
/src/types/number_usd.ts
/src/types/Parameters_private.ts (3x)
/src/types/Parameters.ts (3x)
/src/types/Prompt.ts (15x)
/src/types/ReservedParameters_private.ts (2x)
/src/types/ScriptLanguage.ts
/src/types/SectionType.ts (1x)
/src/types/SpeechRecognition.ts (1x)
/src/types/string_agent_hash_private.ts (1x)
/src/types/string_agent_name_in_book_private.ts
/src/types/string_agent_name_private.ts
/src/types/string_agent_name.ts (4x)
/src/types/string_agent_permanent_id_private.ts (1x)
/src/types/string_agent_url_private.ts (1x)
/src/types/string_agent_url.ts (1x)
/src/types/string_base_url_private.ts (1x)
/src/types/string_base_url.ts (1x)
/src/types/string_base64_private.ts (1x)
/src/types/string_base64.ts (1x)
/src/types/string_business_category_name_private.ts
/src/types/string_business_category_name.ts (1x)
/src/types/string_char_private.ts
/src/types/string_chat_prompt_private.ts (1x)
/src/types/string_completion_prompt_private.ts (1x)
/src/types/string_email_private.ts
/src/types/string_email.ts (1x)
/src/types/string_filename.ts
/src/types/string_host_private.ts
/src/types/string_host.ts (1x)
/src/types/string_href_private.ts
/src/types/string_href.ts (1x)
/src/types/string_knowledge_source_content.ts (3x)
/src/types/string_markdown.ts
/src/types/string_mime_type_private.ts
/src/types/string_mime_type.ts (1x)
/src/types/string_model_description_private.ts
/src/types/string_model_name_private.ts
/src/types/string_model_name.ts (1x)
/src/types/string_name_private.ts
/src/types/string_name.ts (3x)
/src/types/string_page_private.ts
/src/types/string_page.ts (2x)
/src/types/string_parameter_name.ts
/src/types/string_parameter_value_private.ts
/src/types/string_person_fullname.ts (1x)
/src/types/string_persona_description_private.ts
/src/types/string_persona_description.ts (2x)
/src/types/string_pipeline_root_url_private.ts (1x)
/src/types/string_pipeline_root_url.ts (1x)
/src/types/string_pipeline_url_private.ts (1x)
/src/types/string_pipeline_url.ts (1x)
/src/types/string_prompt_image_private.ts
/src/types/string_prompt_private.ts
/src/types/string_prompt.ts (7x)
/src/types/string_promptbook_server_url_private.ts (1x)
/src/types/string_promptbook_server_url.ts (1x)
/src/types/string_reserved_parameter_name_private.ts (1x)
/src/types/string_sha256.ts
/src/types/string_system_message_private.ts (1x)
/src/types/string_template_private.ts
/src/types/string_text_prompt_private.ts (1x)
/src/types/string_title_private.ts
/src/types/string_title.ts (1x)
/src/types/string_token.ts (1x)
/src/types/string_url_image_private.ts (1x)
/src/types/string_url_image.ts (1x)
/src/types/string_url_private.ts
/src/types/string_url.ts (1x)
/src/types/TaskType.ts
/src/types/ToolCall.ts (2x)
/src/types/typeAliasEmoji.ts
/src/types/typeAliases.ts
/src/types/Updatable.ts
/src/utils/agents/resolveAgentAvatarImageUrl.test.ts (1x)
/src/utils/agents/resolveAgentAvatarImageUrl.ts (7x)
/src/utils/chat/chatAttachments.test.ts (2x)
/src/utils/chat/chatAttachments.ts
/src/utils/chat/chatAttachments/appendChatAttachmentContext.ts (3x)
/src/utils/chat/chatAttachments/appendChatAttachmentContextWithContent.ts (5x)
/src/utils/chat/chatAttachments/appendChatContextSections.ts
/src/utils/chat/chatAttachments/formatChatAttachmentContentContext.ts (1x)
/src/utils/chat/chatAttachments/formatChatAttachmentContext.ts (1x)
/src/utils/chat/chatAttachments/normalizeChatAttachments.ts (1x)
/src/utils/chat/chatAttachments/resolveChatAttachmentContent.ts (4x)
/src/utils/chat/chatAttachments/resolveChatAttachmentContents.ts (2x)
/src/utils/chat/constants.ts
/src/utils/chat/decodeChatStreamWhitespaceFromTransport.ts (2x)
/src/utils/chat/encodeChatStreamWhitespaceForTransport.ts (1x)
/src/utils/chat/escapeRegExp.ts
/src/utils/clientVersion.ts (1x)
/src/utils/color/$randomColor.ts (1x)
/src/utils/color/Color.test.ts (1x)
/src/utils/color/Color.ts (10x)
/src/utils/color/css-colors.ts
/src/utils/color/internal-utils/checkChannelValue.ts
/src/utils/color/internal-utils/hslToRgb.ts (3x)
/src/utils/color/internal-utils/rgbToHsl.ts (3x)
/src/utils/color/operators/ColorTransformer.ts (1x)
/src/utils/color/operators/darken.ts (3x)
/src/utils/color/operators/furthest.ts (4x)
/src/utils/color/operators/grayscale.ts (3x)
/src/utils/color/operators/lighten.ts (5x)
/src/utils/color/operators/mixWithColor.ts (3x)
/src/utils/color/operators/nearest.ts (3x)
/src/utils/color/operators/negative.ts (1x)
/src/utils/color/operators/negativeLightness.ts (3x)
/src/utils/color/operators/saturate.ts (5x)
/src/utils/color/operators/withAlpha.ts (2x)
/src/utils/color/parsers/ColorChannelSet.ts
/src/utils/color/parsers/parseHexColor.ts (2x)
/src/utils/color/parsers/parseHslColor.ts (2x)
/src/utils/color/parsers/parseRgbColor.ts (2x)
/src/utils/color/utils/areColorsEqual.ts (1x)
/src/utils/color/utils/colorDistance.ts (1x)
/src/utils/color/utils/colorHue.ts (1x)
/src/utils/color/utils/colorHueDistance.test.ts (2x)
/src/utils/color/utils/colorHueDistance.ts (2x)
/src/utils/color/utils/colorLuminance.ts (1x)
/src/utils/color/utils/colorSatulightion.ts (3x)
/src/utils/color/utils/colorSaturation.ts (1x)
/src/utils/color/utils/colorToDataUrl.ts (2x)
/src/utils/color/utils/mixColors.ts (2x)
/src/utils/database/uniqueConstraint.ts (1x)
/src/utils/DEFAULT_THINKING_MESSAGES.ts
/src/utils/editable/edit-pipeline-string/addPipelineCommand.test.ts (4x)
/src/utils/editable/edit-pipeline-string/addPipelineCommand.ts (3x)
/src/utils/editable/edit-pipeline-string/deflatePipeline.test.ts (5x)
/src/utils/editable/edit-pipeline-string/deflatePipeline.ts (7x)
/src/utils/editable/edit-pipeline-string/removePipelineCommand.test.ts (3x)
/src/utils/editable/edit-pipeline-string/removePipelineCommand.ts (2x)
/src/utils/editable/types/PipelineEditableSerialized.ts (3x)
/src/utils/editable/utils/isFlatPipeline.test.ts (2x)
/src/utils/editable/utils/isFlatPipeline.ts (2x)
/src/utils/editable/utils/renamePipelineParameter.test.ts (2x)
/src/utils/editable/utils/renamePipelineParameter.ts (5x)
/src/utils/editable/utils/stringifyPipelineJson.ts (5x)
/src/utils/environment/$detectRuntimeEnvironment.ts (4x)
/src/utils/environment/$getGlobalScope.ts (1x)
/src/utils/environment/$isRunningInBrowser.ts
/src/utils/environment/$isRunningInJest.ts
/src/utils/environment/$isRunningInNode.ts
/src/utils/environment/$isRunningInWebWorker.ts
/src/utils/execCommand/$execCommand.ts (6x)
/src/utils/execCommand/$execCommandNormalizeOptions.ts (3x)
/src/utils/execCommand/$execCommands.ts (2x)
/src/utils/execCommand/execCommand.test.ts (1x)
/src/utils/execCommand/execCommandNormalizeOptions.test.ts (2x)
/src/utils/execCommand/ExecCommandOptions.ts
/src/utils/expectation-counters/constants.ts
/src/utils/expectation-counters/countCharacters.test.ts (1x)
/src/utils/expectation-counters/countCharacters.ts (1x)
/src/utils/expectation-counters/countLines.test.ts (1x)
/src/utils/expectation-counters/countLines.ts (2x)
/src/utils/expectation-counters/countPages.test.ts (1x)
/src/utils/expectation-counters/countPages.ts (3x)
/src/utils/expectation-counters/countParagraphs.test.ts (1x)
/src/utils/expectation-counters/countParagraphs.ts (1x)
/src/utils/expectation-counters/countSentences.test.ts (1x)
/src/utils/expectation-counters/countSentences.ts (1x)
/src/utils/expectation-counters/countWords.test.ts (1x)
/src/utils/expectation-counters/countWords.ts (2x)
/src/utils/expectation-counters/index.ts (8x)
/src/utils/files/$induceBookDownload.ts (6x)
/src/utils/files/$induceFileDownload.ts (4x)
/src/utils/files/decodeAttachmentAsText.test.ts (1x)
/src/utils/files/decodeAttachmentAsText.ts
/src/utils/files/extensionToMimeType.test.ts (1x)
/src/utils/files/extensionToMimeType.ts (2x)
/src/utils/files/getFileExtension.test.ts (1x)
/src/utils/files/getFileExtension.ts (2x)
/src/utils/files/isDirectoryExisting.test.ts (2x)
/src/utils/files/isDirectoryExisting.ts (2x)
/src/utils/files/isExecutable.ts (1x)
/src/utils/files/isFileExisting.test.ts (2x)
/src/utils/files/isFileExisting.ts (2x)
/src/utils/files/listAllFiles.test.ts (2x)
/src/utils/files/listAllFiles.ts (3x)
/src/utils/files/mimeTypeToExtension.test.ts (1x)
/src/utils/files/mimeTypeToExtension.ts (2x)
/src/utils/files/ObjectUrl.ts (1x)
/src/utils/files/readResponseBytes.ts
/src/utils/knowledge/inlineKnowledgeSource.test.ts (1x)
/src/utils/knowledge/inlineKnowledgeSource.ts (2x)
/src/utils/knowledge/simplifyKnowledgeLabel.test.ts (1x)
/src/utils/knowledge/simplifyKnowledgeLabel.ts
/src/utils/language/getBrowserPreferredSpeechRecognitionLanguage.ts
/src/utils/linguistic-hash/linguisticHash.test.ts (1x)
/src/utils/linguistic-hash/linguisticHash.ts (6x)
/src/utils/linguistic-hash/LinguisticHashLanguage.ts (3x)
/src/utils/linguistic-hash/linguisticHashTypes.ts
/src/utils/linguistic-hash/linguisticHashWordCount.ts (1x)
/src/utils/linguistic-hash/linguisticHashWords.cs.ts (1x)
/src/utils/linguistic-hash/linguisticHashWords.en.ts (1x)
/src/utils/linguistic-hash/linguisticHashWordSelection.ts (1x)
/src/utils/markdown/addAutoGeneratedSection.test.ts (2x)
/src/utils/markdown/addAutoGeneratedSection.ts (4x)
/src/utils/markdown/createMarkdownChart.test.ts (1x)
/src/utils/markdown/createMarkdownChart.ts (5x)
/src/utils/markdown/createMarkdownTable.test.ts (1x)
/src/utils/markdown/createMarkdownTable.ts (2x)
/src/utils/markdown/escapeMarkdownBlock.test.ts (2x)
/src/utils/markdown/escapeMarkdownBlock.ts (1x)
/src/utils/markdown/extractAllBlocksFromMarkdown-real.test.ts (1x)
/src/utils/markdown/extractAllBlocksFromMarkdown.test.ts (1x)
/src/utils/markdown/extractAllBlocksFromMarkdown.ts (3x)
/src/utils/markdown/extractAllListItemsFromMarkdown.test.ts (1x)
/src/utils/markdown/extractAllListItemsFromMarkdown.ts (1x)
/src/utils/markdown/extractOneBlockFromMarkdown.test.ts (1x)
/src/utils/markdown/extractOneBlockFromMarkdown.ts (4x)
/src/utils/markdown/flattenMarkdown.test.ts (3x)
/src/utils/markdown/flattenMarkdown.ts (4x)
/src/utils/markdown/humanizeAiText.test.ts (2x)
/src/utils/markdown/humanizeAiText.ts (6x)
/src/utils/markdown/humanizeAiTextEllipsis.ts (1x)
/src/utils/markdown/humanizeAiTextEmdashed.ts (1x)
/src/utils/markdown/humanizeAiTextQuotes.ts (1x)
/src/utils/markdown/humanizeAiTextSources.ts (1x)
/src/utils/markdown/humanizeAiTextWhitespace.ts (1x)
/src/utils/markdown/parseMarkdownSection.test.ts (1x)
/src/utils/markdown/parseMarkdownSection.ts (2x)
/src/utils/markdown/prettifyMarkdown.ts (1x)
/src/utils/markdown/promptbookifyAiText.test.ts (2x)
/src/utils/markdown/promptbookifyAiText.ts (1x)
/src/utils/markdown/removeMarkdownComments.test.ts (1x)
/src/utils/markdown/removeMarkdownComments.ts (2x)
/src/utils/markdown/removeMarkdownFormatting.test.ts (1x)
/src/utils/markdown/removeMarkdownFormatting.ts (1x)
/src/utils/markdown/removeMarkdownLinks.test.ts (1x)
/src/utils/markdown/removeMarkdownLinks.ts
/src/utils/markdown/splitMarkdownIntoSections.test.ts (3x)
/src/utils/markdown/splitMarkdownIntoSections.ts (2x)
/src/utils/markdown/trimCodeBlock.test.ts (2x)
/src/utils/markdown/trimCodeBlock.ts
/src/utils/markdown/trimEndOfCodeBlock.test.ts (2x)
/src/utils/markdown/trimEndOfCodeBlock.ts
/src/utils/misc/$getCurrentDate.ts (1x)
/src/utils/misc/$Register.ts (7x)
/src/utils/misc/aboutPromptbookInformation.ts (6x)
/src/utils/misc/arrayableToArray.test.ts (1x)
/src/utils/misc/arrayableToArray.ts (1x)
/src/utils/misc/computeHash.test.ts (1x)
/src/utils/misc/computeHash.ts (3x)
/src/utils/misc/debounce.ts (1x)
/src/utils/misc/emojis.ts (2x)
/src/utils/misc/FromtoItems.ts
/src/utils/misc/injectCssModuleIntoShadowRoot.tsx (2x)
/src/utils/misc/parseNumber.test.ts (2x)
/src/utils/misc/parseNumber.ts (1x)
/src/utils/misc/xAboutPromptbookInformation.tsx (3x)
/src/utils/normalization/capitalize.test.ts (1x)
/src/utils/normalization/capitalize.ts
/src/utils/normalization/constructImageFilename.test.ts (1x)
/src/utils/normalization/constructImageFilename.ts
/src/utils/normalization/decapitalize.test.ts (1x)
/src/utils/normalization/decapitalize.ts
/src/utils/normalization/DIACRITIC_VARIANTS_LETTERS.ts
/src/utils/normalization/IKeywords.ts
/src/utils/normalization/index.ts
/src/utils/normalization/isValidKeyword.test.ts (1x)
/src/utils/normalization/isValidKeyword.ts (2x)
/src/utils/normalization/nameToUriPart.test.ts (1x)
/src/utils/normalization/nameToUriPart.ts (1x)
/src/utils/normalization/nameToUriParts.test.ts (1x)
/src/utils/normalization/nameToUriParts.ts (1x)
/src/utils/normalization/normalize-to-kebab-case.test.ts (1x)
/src/utils/normalization/normalize-to-kebab-case.ts (1x)
/src/utils/normalization/normalizeMessageText.test.ts (1x)
/src/utils/normalization/normalizeMessageText.ts
/src/utils/normalization/normalizeTo_camelCase.test.ts (1x)
/src/utils/normalization/normalizeTo_camelCase.ts
/src/utils/normalization/normalizeTo_PascalCase.test.ts (1x)
/src/utils/normalization/normalizeTo_PascalCase.ts (1x)
/src/utils/normalization/normalizeTo_SCREAMING_CASE.test.ts (1x)
/src/utils/normalization/normalizeTo_SCREAMING_CASE.ts
/src/utils/normalization/normalizeTo_snake_case.test.ts (1x)
/src/utils/normalization/normalizeTo_snake_case.ts (1x)
/src/utils/normalization/normalizeWhitespaces.test.ts (1x)
/src/utils/normalization/normalizeWhitespaces.ts
/src/utils/normalization/orderJson.test.ts (1x)
/src/utils/normalization/orderJson.ts
/src/utils/normalization/parseKeywords.test.ts (1x)
/src/utils/normalization/parseKeywords.ts (3x)
/src/utils/normalization/parseKeywordsFromString.test.ts (1x)
/src/utils/normalization/parseKeywordsFromString.ts (3x)
/src/utils/normalization/removeDiacritics.test.ts (1x)
/src/utils/normalization/removeDiacritics.ts (1x)
/src/utils/normalization/removeEmojis.test.ts (2x)
/src/utils/normalization/removeEmojis.ts
/src/utils/normalization/removeQuotes.test.ts (1x)
/src/utils/normalization/removeQuotes.ts
/src/utils/normalization/searchKeywords.test.ts (1x)
/src/utils/normalization/searchKeywords.ts (1x)
/src/utils/normalization/suffixUrl.test.ts (1x)
/src/utils/normalization/suffixUrl.ts (1x)
/src/utils/normalization/titleToName.test.ts (1x)
/src/utils/normalization/titleToName.ts (4x)
/src/utils/normalization/unwrapResult.test.ts (2x)
/src/utils/normalization/unwrapResult.ts
/src/utils/organization/___and___.ts (1x)
/src/utils/organization/___or___.ts
/src/utils/organization/$side_effect.ts (1x)
/src/utils/organization/$sideEffect.ts (2x)
/src/utils/organization/empty_object.ts
/src/utils/organization/just_empty_object.ts
/src/utils/organization/just.ts (1x)
/src/utils/organization/keepImported.ts (2x)
/src/utils/organization/keepTypeImported.ts (1x)
/src/utils/organization/keepUnused.ts (1x)
/src/utils/organization/preserve.ts (1x)
/src/utils/organization/really_any.ts
/src/utils/organization/really_unknown.ts
/src/utils/organization/spaceTrim.ts
/src/utils/organization/TODO_any.ts
/src/utils/organization/TODO_narrow.ts
/src/utils/organization/TODO_object.ts
/src/utils/organization/TODO_remove_as.ts
/src/utils/organization/TODO_string.ts
/src/utils/organization/TODO_unknown.ts
/src/utils/organization/TODO_USE.ts (1x)
/src/utils/parameters/extractParameterNames.test.ts (1x)
/src/utils/parameters/extractParameterNames.ts (3x)
/src/utils/parameters/mapAvailableToExpectedParameters.test.ts (1x)
/src/utils/parameters/mapAvailableToExpectedParameters.ts (3x)
/src/utils/parameters/numberToString.test.ts (1x)
/src/utils/parameters/numberToString.ts (3x)
/src/utils/parameters/templateParameters.test.ts (2x)
/src/utils/parameters/templateParameters.ts (8x)
/src/utils/parameters/valueToString.test.ts (2x)
/src/utils/parameters/valueToString.ts (5x)
/src/utils/random/$generateBookBoilerplate.ts (8x)
/src/utils/random/$randomAgentPersona.ts (2x)
/src/utils/random/$randomAgentRule.ts (2x)
/src/utils/random/$randomBase58.ts
/src/utils/random/$randomFullnameWithColor.ts (2x)
/src/utils/random/$randomItem.ts
/src/utils/random/$randomSeed.ts (1x)
/src/utils/random/$randomToken.ts (1x)
/src/utils/random/CzechNamePool.ts (3x)
/src/utils/random/EnglishNamePool.ts (4x)
/src/utils/random/getNamePool.ts (3x)
/src/utils/random/NamePool.ts (1x)
/src/utils/serialization/$deepFreeze.ts (3x)
/src/utils/serialization/asSerializable.test.ts (1x)
/src/utils/serialization/asSerializable.ts (2x)
/src/utils/serialization/checkSerializableAsJson.ts (4x)
/src/utils/serialization/clonePipeline.ts (1x)
/src/utils/serialization/deepClone.test.ts (1x)
/src/utils/serialization/deepClone.ts
/src/utils/serialization/exportJson.ts (7x)
/src/utils/serialization/isSerializableAsJson.test.ts (2x)
/src/utils/serialization/isSerializableAsJson.ts (1x)
/src/utils/serialization/jsonStringsToJsons.test.ts (1x)
/src/utils/serialization/jsonStringsToJsons.ts (2x)
/src/utils/serialization/serializeToPromptbookJavascript.ts (4x)
/src/utils/sets/difference.test.ts (1x)
/src/utils/sets/difference.ts
/src/utils/sets/intersection.test.ts (1x)
/src/utils/sets/intersection.ts
/src/utils/sets/union.test.ts (1x)
/src/utils/sets/union.ts
/src/utils/take/classes/TakeChain.ts (3x)
/src/utils/take/interfaces/ITakeChain.ts (1x)
/src/utils/take/interfaces/Takeable.ts
/src/utils/take/take.test.ts (1x)
/src/utils/take/take.ts (3x)
/src/utils/toolCalls/getToolCallIdentity.ts (2x)
/src/utils/toolCalls/mergeToolCalls.ts (2x)
/src/utils/toolCalls/resolveToolCallIdempotencyKey.ts (1x)
/src/utils/validators/email/isValidEmail.test.ts (1x)
/src/utils/validators/email/isValidEmail.ts (2x)
/src/utils/validators/filePath/isRootPath.test.ts (1x)
/src/utils/validators/filePath/isRootPath.ts (2x)
/src/utils/validators/filePath/isValidFilePath.test.ts (1x)
/src/utils/validators/filePath/isValidFilePath.ts (2x)
/src/utils/validators/javascriptName/isValidJavascriptName.test.ts (1x)
/src/utils/validators/javascriptName/isValidJavascriptName.ts (2x)
/src/utils/validators/parameterName/validateParameterName.test.ts (2x)
/src/utils/validators/parameterName/validateParameterName.ts (7x)
/src/utils/validators/semanticVersion/isValidPromptbookVersion.test.ts (1x)
/src/utils/validators/semanticVersion/isValidPromptbookVersion.ts (3x)
/src/utils/validators/semanticVersion/isValidSemanticVersion.test.ts (1x)
/src/utils/validators/semanticVersion/isValidSemanticVersion.ts (2x)
/src/utils/validators/url/extractUrlsFromText.test.ts (1x)
/src/utils/validators/url/extractUrlsFromText.ts (1x)
/src/utils/validators/url/isHostnameOnPrivateNetwork.test.ts (1x)
/src/utils/validators/url/isHostnameOnPrivateNetwork.ts (1x)
/src/utils/validators/url/isUrlOnPrivateNetwork.test.ts (1x)
/src/utils/validators/url/isUrlOnPrivateNetwork.ts (2x)
/src/utils/validators/url/isValidAgentUrl.test.ts (1x)
/src/utils/validators/url/isValidAgentUrl.ts (3x)
/src/utils/validators/url/isValidPipelineUrl.test.ts (1x)
/src/utils/validators/url/isValidPipelineUrl.ts (3x)
/src/utils/validators/url/isValidUrl.test.ts (1x)
/src/utils/validators/url/isValidUrl.ts (3x)
/src/utils/validators/url/normalizeDomainForMatching.test.ts (1x)
/src/utils/validators/url/normalizeDomainForMatching.ts
/src/utils/validators/uuid/isValidUuid.test.ts (1x)
/src/utils/validators/uuid/isValidUuid.ts (2x)
/src/version.ts (1x)
/src/wizard/$getCompiledBook.ts (18x)
/src/wizard/wizard.ts (20x)
/servers.ts (2x)

❌ Found 69 unfound entities:

📋 Available entities:
   • function Avatar
   • function retainAvatarAnimationListener
   • type AvatarInteractionRuntimeState
   • type AvatarPointerSnapshot
   • type AvatarPointerTarget
   • function createAvatarDefinitionKey
   • function createIdleAvatarInteractionState
   • function createAvatarInteractionRuntimeState
   • function resolveAvatarPointerTarget
   • function stepAvatarInteractionRuntimeState
   • type AvatarOrImageProps
   • function AvatarOrImage
   • function retainAvatarPointerTracking
   • function getAvatarPointerSnapshot
   • function getAvatarPointerSnapshotVersion
   • function getAvatarViewportLayoutVersion
   • const DEFAULT_AVATAR_SIZE
   • function normalizeAvatarColors
   • function normalizeAvatarDefinition
   • function parseAvatarColors
   • function createAvatarDefinitionFromAgentBasicInformation
   • function createAvatarPalette
   • function drawAvatarFrame
   • function createRoundedRectPath
   • function createSeededRandom
   • function createAvatarRandomFactory
   • function prepareAvatarCanvas
   • function pickRandomItem
   • function observeAvatarVisibility
   • type ResolvedAvatarRenderDefinition
   • function resolveAvatarRenderDefinition
   • function renderAvatarVisual
   • type AvatarDefinition
   • type AvatarVisualId
   • type AvatarPalette
   • type AvatarSurfaceStyle
   • type AvatarPointerType
   • type AvatarInteractionState
   • type AvatarVisualRenderContext
   • type AvatarVisual
   • type AvatarVisualDefinition
   • type AvatarProps
   • type RenderAvatarVisualOptions
   • const asciiOctopusAvatarVisual
   • const AVATAR_VISUALS
   • function getAvatarVisualById
   • function resolveAvatarVisualId
   • const fractalAvatarVisual
   • const minecraftAvatarVisual
   • const octopus2AvatarVisual
   • type Octopus3MorphologyProfile
   • function createOctopus3MorphologyProfile
   • const octopus3AvatarVisual
   • const octopusAvatarVisual
   • type OrganicTentacleShape
   • type OrganicTentacleRibbonPoint
   • type OrganicEyeMotion
   • function createOrganicOctopusBodyPoints
   • function traceSmoothClosedPath
   • function createOrganicOctopusTentacleShapes
   • function sampleOrganicTentacleRibbonPoints
   • function resolveOrganicEyeMotion
   • function getCubicBezierPoint
   • const orbAvatarVisual
   • function createOrbMorphologyProfile
   • const pixelArtAvatarVisual
   • type BookParameter
   • type AgentCapability
   • type AgentBasicInformation
   • type AgentModelRequirements
   • type AgentReferenceResolver
   • type AgentSourceParseResult
   • class BookEditable
   • function computeAgentHash
   • function createAgentModelRequirements
   • function extractMcpServers
   • function createAgentSystemMessage
   • function extractAgentName
   • function extractAgentProfileImage
   • type CreateAgentModelRequirementsOptions
   • function createAgentModelRequirementsWithCommitments
   • function applyCommitmentsToAgentModelRequirements
   • function augmentAgentModelRequirementsFromSource
   • function filterCommitmentsForAgentModelRequirements
   • function materializeInlineKnowledgeSources
   • type ParsedAgentSourceWithCommitments
   • function createCommitmentRegex
   • function createCommitmentTypeRegex
   • function createDefaultAgentName
   • function createTeamToolName
   • function extractMetaLinks
   • function extractOpenTeacherInstructions
   • function normalizeAgentName
   • const PADDING_LINES
   • function padBook
   • function parseAgentSource
   • function applyMetaCommitment
   • function consumeConversationSampleCommitment
   • function createCapabilitiesFromCommitment
   • function ensureMetaFullname
   • function extractAgentProfileText
   • function extractInitialMessage
   • function extractParsedAgentProfile
   • type ParseAgentSourceState
   • type ParsedAgentProfile
   • function parseAgentSourcePrelude
   • function parseAgentSourceWithCommitments
   • function parseParameters
   • type TeamTeammate
   • type ParseTeamCommitmentOptions
   • function parseTeamCommitmentContent
   • type PseudoAgentKind
   • const PSEUDO_AGENT_USER_URL
   • const PSEUDO_AGENT_VOID_URL
   • const VOID_PSEUDO_AGENT_REFERENCE
   • const VOID_PSEUDO_AGENT_ALIAS_KEYS
   • function resolvePseudoAgentKindFromReference
   • function resolvePseudoAgentKindFromUrl
   • function isPseudoAgentUrl
   • function createPseudoAgentUrl
   • function createPseudoUserTeammateLabel
   • function isVoidPseudoAgentReference
   • function isUserPseudoAgentReference
   • function isPseudoAgentAllowedInCommitment
   • function removeCommentsFromSystemMessage
   • type string_book
   • function isValidBook
   • function validateBook
   • const DEFAULT_BOOK
   • type TeammateProfile
   • type TeammateProfileResolver
   • type BookLanguageCommonPitfall
   • const bookLanguageCommonPitfalls
   • type BookLanguageDocumentationExample
   • const bookLanguageDocumentationExamples
   • function createStandaloneBookLanguageMarkdown
   • function renderGroupedCommitmentDocumentationMarkdown
   • function generatePlaceholderAgentProfileImageUrl
   • function Dropdown
   • function HamburgerMenu
   • type HoistedMenuItem
   • function MenuHoistingProvider
   • function useMenuHoisting
   • function Modal
   • function MonacoEditorWithShadowDom
   • function classNames
   • function collectCssTextsForClass
   • function escapeHtml
   • function escapeRegex
   • function Tooltip
   • type AvatarChipProps
   • function AvatarChip
   • type AvatarChipFromSourceProps
   • function AvatarChipFromSource
   • type AvatarProfileProps
   • function AvatarProfile
   • type AvatarProfileFromSourceProps
   • function AvatarProfileFromSource
   • const AvatarProfileTooltip
   • const DEFAULT_BOOK_EDITOR_HEIGHT
   • type BookEditorUploadProgressCallback
   • type BookEditorUploadOptions
   • type BookEditorProps
   • function BookEditor
   • function BookEditorActionbar
   • function BookEditorMonaco
   • const BookEditorMonacoConstants
   • const BookEditorMonacoFormatting
   • const BookEditorMonacoTokenization
   • function BookEditorMonacoUploadPanel
   • function createDeprecatedCommitmentDiagnostics
   • function useBookEditorMonacoDecorations
   • function useBookEditorMonacoDiagnostics
   • function useBookEditorMonacoInteractions
   • function ensureBookEditorMonacoLanguage
   • function ensureBookEditorMonacoLanguageForEditor
   • function useBookEditorMonacoLanguage
   • function useBookEditorMonacoLifecycle
   • function useBookEditorMonacoStyles
   • type UploadItem
   • type UploadStats
   • function useBookEditorMonacoUploads
   • function AgentChat
   • type AgentChatProps
   • type AgentChipData
   • type AgentChipProps
   • function AgentChip
   • function Chat
   • type ChatActionsBarProps
   • function ChatActionsBar
   • type ChatCitationModalProps
   • function ChatCitationModal
   • const chatCssClassNames
   • const chatCssClassDescriptions
   • function getChatCssClassName
   • type ChatInputButtonClickHandler
   • type ChatInputAreaProps
   • function ChatInputArea
   • type ChatInputAreaDictationPanelProps
   • function ChatInputAreaDictationPanel
   • type ChatInputUploadedFile
   • const ChatMessageItem
   • type ChatMessageListProps
   • function ChatMessageList
   • function ChatMessageMap
   • type ChatMessageRichContentProps
   • function ChatMessageRichContent
   • type ChatMessageToolCallChipsProps
   • function ChatMessageToolCallChips
   • type ChatFeedbackResponse
   • type ChatFeedbackMode
   • type ChatVisualMode
   • type ChatFeedbackTranslations
   • type ChatUiTranslations
   • type ChatTimingTranslations
   • type ChatSoundSystem
   • type ChatProps
   • type ChatRatingModalProps
   • function ChatRatingModal
   • type ChatReplyPreviewProps
   • function ChatReplyPreview
   • type SelfLearningSummaryData
   • function buildSelfLearningSummary
   • type ChatSoundToggleProps
   • function ChatSoundToggle
   • type ChatVibrationToggleProps
   • function ChatVibrationToggle
   • type ChatSoundAndVibrationPanelProps
   • function ChatSoundAndVibrationPanel
   • type ChatToolCallModalProps
   • function ChatToolCallModal
   • type TeamHeaderProfileProps
   • function TeamHeaderProfile
   • type SelfLearningAvatarProps
   • function SelfLearningAvatar
   • function ChatToolCallModalContent
   • function ClockIcon
   • const LOADING_INTERACTIVE_IMAGE
   • const AVATAR_SIZE
   • type ToolCallChipStatus
   • type ToolCallChipEntry
   • type ChatMessageToolCallRenderModel
   • type CreateChatMessageToolCallRenderModelOptions
   • function createChatMessageToolCallRenderModel
   • function createProgressCardChecklistMarkdown
   • function isProgressCardVisible
   • type ImagePromptRendererProps
   • function ImagePromptRenderer
   • function insertDictationChunk
   • function learnDictationDictionary
   • type DictationRefinementSettings
   • type DictationDictionary
   • const DEFAULT_DICTATION_SETTINGS
   • function normalizeDictationWhitespace
   • function refineFinalDictationChunk
   • function renderAdvancedToolCallDetails
   • function createAdvancedToolCallReportMarkdown
   • function createAdvancedToolCallReportFilename
   • function renderEmailToolCallDetails
   • function renderMemoryToolCallDetails
   • function renderPopupToolCallDetails
   • function renderRunBrowserToolCallDetails
   • function renderSearchToolCallDetails
   • function renderSelfLearningToolCallDetails
   • function renderTimeoutToolCallDetails
   • function renderTimeToolCallDetails
   • function renderToolCallClockPanel
   • function renderToolCallDetails
   • function renderToolCallProgressPlaceholder
   • function renderWalletCredentialToolCallDetails
   • function resolveRunBrowserToolCallDetailsState
   • type DictationUiState
   • type SpeechStatusBubbleTone
   • type SpeechRecognitionUiDescriptor
   • function resolveSpeechRecognitionUiDescriptor
   • function resolveToolCallProgressMessage
   • type StreamingFeaturePlaceholderKind
   • function resolveStreamingFeaturePlaceholderKind
   • type StreamingFeaturePlaceholderProps
   • function StreamingFeaturePlaceholder
   • function TeamToolCallModalContent
   • function useChatInputAreaAttachments
   • function useChatInputAreaComposer
   • function useChatInputAreaDictation
   • function useChatInputAreaDictationPersistence
   • function useChatInputAreaDictationSupport
   • type UseChatMessageAvatarTooltipResult
   • function useChatMessageAvatarTooltip
   • type UseChatMessageSpeechPlaybackOptions
   • type UseChatMessageSpeechPlaybackResult
   • function useChatMessageSpeechPlayback
   • function useChatPostprocessedMessages
   • function useChatScrollState
   • function useChatToolCallModalState
   • function useChatToolCallState
   • function CodeBlock
   • type MonacoCodeBlockLanguage
   • function resolveCodeBlockLanguage
   • function ChatEffectsSystem
   • function ConfettiEffect
   • function HeartsEffect
   • const defaultEffectConfigs
   • type ChatEffect
   • type ChatEffectConfig
   • type ChatEffectsSystemProps
   • type ChatEffectType
   • function detectEffects
   • type ChatActionsOverlapConfig
   • type ChatActionsOverlapResult
   • function useChatActionsOverlap
   • type ChatAutoScrollConfig
   • function useChatAutoScroll
   • function useChatCompleteNotification
   • type UseChatRatingsOptions
   • type FeedbackStatusVariant
   • type FeedbackStatus
   • type ChatRatingsState
   • type ChatRatingsActions
   • function useChatRatings
   • type SendMessageToLlmChatFunction
   • function useSendMessageToLlmChat
   • const DEFAULT_CHAT_FAIL_MESSAGE
   • type FriendlyErrorMessage
   • function LlmChat
   • type LlmChatProps
   • function useLlmChatMessageHandler
   • function useLlmChatMessages
   • function useLlmChatState
   • const MarkdownContent
   • const NORMAL_FLOW
   • const FAST_FLOW
   • const SLOW_FLOW
   • const BLOCKY_FLOW
   • const RANDOM_FLOW
   • const MOCKED_CHAT_DELAY_CONFIGS
   • type MockedChatDelayConfig
   • type MockedChatProps
   • function MockedChat
   • type ChatSaveFormatDefinition
   • function getChatSaveFormatDefinitions
   • type string_chat_format_name
   • const htmlSaveFormatDefinition
   • const CHAT_SAVE_FORMATS
   • const jsonSaveFormatDefinition
   • const mdSaveFormatDefinition
   • function buildChatPdf
   • const pdfSaveFormatDefinition
   • const reactSaveFormatDefinition
   • const txtSaveFormatDefinition
   • type SourceChipProps
   • function SourceChip
   • type ChatToolCall
   • type ChatProgressItem
   • type ChatProgressCard
   • type ChatMessageReplyingTo
   • type ChatMessage
   • type ChatParticipant
   • function addUtmParamsToUrl
   • class ChatPersistence
   • function isCitationUrl
   • function isPlainTextCitation
   • function getCitationLabel
   • function resolveCitationPreviewUrl
   • type ToolCallOrigin
   • type TransitiveToolCall
   • type TransitiveCitation
   • type TeamToolCallSummary
   • function collectTeamToolCallSummary
   • type CitationFootnoteEntry
   • type CitationFootnoteRenderModel
   • function createCitationFootnoteRenderModel
   • function createShortLinkForChat
   • function createTeamToolNameFromUrl
   • function isTeamToolName
   • function downloadFile
   • function exportChatHistory
   • type ExportFormat
   • function formatToolCallDateTime
   • function formatToolCallLocalTime
   • function formatToolCallTranslationTemplate
   • function generatePdfContent
   • function generateQrDataUrl
   • type ChatMessageTimingDisplay
   • function getChatMessageTimingDisplay
   • function getPromptbookBranding
   • type ToolCallChipletInfo
   • function buildToolCallChipText
   • const TOOL_TITLES
   • function getToolCallChipletInfo
   • type AgentProfileInput
   • type AgentProfileData
   • function extractAgentNameFromUrl
   • function isLikelyGeneratedId
   • function resolveInitialAgentLabel
   • function resolvePreferredAgentLabel
   • function resolveAgentsServerUrl
   • function resolveProfileImageUrl
   • function resolvePlaceholderImageUrl
   • function shouldFetchAgentProfile
   • function resolveAgentProfileFallback
   • function loadAgentProfile
   • function messagesToHtml
   • function messagesToJson
   • function messagesToMarkdown
   • function messagesToText
   • const DEFAULT_SIMPLIFIED_CITATION_ID
   • type CitationMarker
   • function createCitationMarkerRegex
   • function parseCitationMarker
   • function parseCitationMarkersFromContent
   • function replaceCitationMarkers
   • function normalizeCitationMarkersToFullNotation
   • type ParsedCitation
   • function parseCitationsFromContent
   • function stripCitationsFromContent
   • function dedupeCitationsBySource
   • function extractCitationsFromMessage
   • type ImagePromptSegment
   • type ImagePromptTextSegment
   • type ImagePromptImageSegment
   • function splitMessageContentByImagePrompts
   • type MessageQuickButton
   • type ActionQuickButton
   • type MessageButton
   • function parseMessageButtons
   • function resolveChatMessageReplyPreviewText
   • function resolveChatMessageReplySenderLabel
   • function resolveCitationUrl
   • function resolveToolCallFromChatMessages
   • function resolveToolCallState
   • type StreamingFeatureBoundary
   • function getLatestStreamingFeatureBoundary
   • function sanitizeStreamingMessageContent
   • type ChatTextSegment
   • type ChatMapSegment
   • type ChatCodeSegment
   • type ChatMessageContentSegment
   • function splitMessageContentIntoSegments
   • function normalizeThinkingMessageVariants
   • function getRandomThinkingMessageDelayMs
   • function getRandomThinkingMessageVariant
   • type TimeoutToolCallAction
   • type TimeoutToolCallPresentation
   • function isTimeoutToolCallName
   • function resolveTimeoutToolCallPresentation
   • function buildTimeoutToolCallChipLabel
   • function buildTimeoutToolPrimarySentence
   • function buildTimeoutToolScheduleSentence
   • function extractSearchResults
   • function getToolCallResultDate
   • function getToolCallTimestamp
   • function parseRunBrowserToolResult
   • function parseTeamToolResult
   • function parseToolCallArguments
   • function parseToolCallResult
   • function resolveRunBrowserArtifactUrl
   • type RunBrowserToolArtifact
   • type RunBrowserToolAction
   • type RunBrowserToolError
   • type RunBrowserToolResult
   • type TeamToolResult
   • const WALLET_CREDENTIAL_TOOL_CALL_NAME
   • type WalletCredentialToolCallResult
   • function parseWalletCredentialToolCallResult
   • function createWalletCredentialToolCall
   • function createDeduplicatedWalletCredentialToolCalls
   • function AboutIcon
   • function ArrowIcon
   • function AttachmentIcon
   • function CameraIcon
   • function CloseIcon
   • function DownloadIcon
   • function EmailIcon
   • function ExitFullscreenIcon
   • function FullscreenIcon
   • function MenuIcon
   • const MicIcon
   • const PauseIcon
   • const PlayIcon
   • const ResetIcon
   • function SaveIcon
   • const SendIcon
   • function SolidArrowButton
   • const StopIcon
   • function TeacherIcon
   • const TemplateIcon
   • type PromptbookAgentIntegrationProps
   • function PromptbookAgentIntegration
   • function PromptbookAgentSeamlessIntegration
   • function BrandedQrCode
   • function GenericQrCode
   • function PromptbookQrCode
   • type QrCodeOptions
   • function useQrCode
   • function $runPromptbookCli
   • function $initializeBoilerplateCommand
   • function $initializeAboutCommand
   • function $initializeAgentCommand
   • const AGENT_BOOK_FILE_PATH
   • const AGENT_MESSAGES_DIRECTORY_PATH
   • const AGENT_QUEUED_MESSAGES_DIRECTORY_PATH
   • const AGENT_FINISHED_MESSAGES_DIRECTORY_PATH
   • const AGENT_KNOWLEDGE_DIRECTORY_PATH
   • const AGENT_DOCS_DIRECTORY_PATH
   • const AGENT_BOOK_LANGUAGE_MANUAL_FILE_PATH
   • function getDefaultAgentBookContent
   • function getDefaultBookLanguageManualContent
   • type AgentRunCliOptions
   • function createAgentRunOptionsFromCliOptions
   • function $initializeAgentInitCommand
   • type AgentInitializationSummary
   • function initializeAgentProjectConfiguration
   • function printAgentInitializationSummary
   • function $initializeAgentRunCommand
   • function $initializeAgentTickCommand
   • function $initializeCoderCommand
   • const AGENT_CODING_FILE_PATH
   • function getDefaultCoderAgentCodingFileContent
   • const AGENTS_FILE_PATH
   • function getDefaultCoderAgentsFileContent
   • function appendBlock
   • const PROMPTS_DIRECTORY_PATH
   • const PROMPTS_DONE_DIRECTORY_PATH
   • const PROMPTS_TEMPLATES_DIRECTORY_PATH
   • type InitializationStatus
   • type BuiltInCoderPromptTemplate
   • type CoderPromptTemplateDefinition
   • type EnsuredCoderPromptTemplateFile
   • type ResolvedCoderPromptTemplate
   • function getDefaultCoderPromptTemplateDefinitions
   • function getDefaultCoderProjectPromptTemplateDefinitions
   • function getDefaultCoderPromptTemplateDefinition
   • function ensureDefaultCoderPromptTemplateFiles
   • function resolveCoderPromptTemplate
   • function ensureCoderEnvFile
   • function ensureCoderGitignoreFile
   • function ensureCoderMarkdownFile
   • function ensureCoderPackageJsonFile
   • function ensureCoderVscodeSettingsFile
   • function ensureDirectory
   • function $initializeCoderFindFreshEmojiTagCommand
   • function $initializeCoderFindRefactorCandidatesCommand
   • function formatDisplayPath
   • function $initializeCoderGenerateBoilerplatesCommand
   • function generatePromptBoilerplate
   • function getDefaultCoderPackageJsonScripts
   • function getDefaultCoderVscodeSettings
   • function getTypescriptModule
   • function normalizeImportedTypescriptModule
   • function $initializeCoderInitCommand
   • type CoderInitializationSummary
   • function initializeCoderProjectConfiguration
   • function mergeStringRecordJsonFile
   • function printInitializationSummary
   • function readTextFileIfExists
   • function $initializeCoderRunCommand
   • const THINKING_LEVEL_VALUES
   • type ThinkingLevel
   • function parseThinkingLevel
   • function $initializeCoderVerifyCommand
   • function handleActionErrors
   • const PROMPT_RUNNER_AGENT_NAMES
   • type PromptRunnerAgentName
   • type PromptRunnerCliOptions
   • type NormalizedPromptRunnerCliOptions
   • const PROMPT_RUNNER_DESCRIPTION
   • const PROMPT_RUNNER_AGENT_OPTION_DESCRIPTION
   • const PROMPT_RUNNER_MODEL_OPTION_DESCRIPTION
   • function addPromptRunnerSelectionOptions
   • function addPromptRunnerExecutionOptions
   • function normalizePromptRunnerCliOptions
   • function $initializeHelloCommand
   • function $initializeListModelsCommand
   • function $initializeListScrapersCommand
   • function $initializeLoginCommand
   • function $initializeMakeCommand
   • function $initializePrettifyCommand
   • function $initializeRunCommand
   • function runInteractiveChatbot
   • function $initializeStartAgentsServerCommand
   • function $initializeStartPipelinesServerCommand
   • function $initializeTestCommand
   • function $addGlobalOptionsToCommand
   • function $provideLlmToolsForCli
   • const _CLI
   • function promptbookCli
   • type AgentCollection
   • class AgentCollectionInSupabase
   • type AgentCollectionInSupabaseOptions
   • type Json
   • type AgentsDatabaseSchema
   • type Tables
   • type TablesInsert
   • type TablesUpdate
   • type Enums
   • type CompositeTypes
   • type CreateAgentPersistenceRecordsOptions
   • type CreateAgentPersistenceRecordsResult
   • function createAgentPersistenceRecords
   • type PreparedAgentSourceForPersistence
   • function prepareAgentSourceForPersistence
   • const CREATE_AGENT_VISIBILITY_VALUES
   • type CreateAgentVisibility
   • type CreateAgentInput
   • const CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH
   • function parseCreateAgentInput
   • function createCreateAgentInputToolParametersSchema
   • function createPipelineCollectionFromDirectory
   • function createPipelineCollectionFromJson
   • function createPipelineCollectionFromPromise
   • function createPipelineCollectionFromUrl
   • function createPipelineSubcollection
   • type PipelineCollection
   • function pipelineCollectionToJson
   • class SimplePipelineCollection
   • type BoilerplateCommand
   • const boilerplateCommandParser
   • function getParserForCommand
   • function parseCommand
   • function stringifyCommand
   • type Command
   • type CommandBase
   • type CommandParser
   • type CommonCommandParser
   • type PipelineBothCommandParser
   • type PipelineHeadCommandParser
   • type PipelineTaskCommandParser
   • type $TaskJson
   • type $PipelineJson
   • type CommandParserInput
   • type CommandType
   • type CommandUsagePlace
   • const CommandUsagePlaces
   • type BookVersionCommand
   • const bookVersionCommandParser
   • type ExpectCommand
   • const expectCommandParser
   • type ForeachCommand
   • const foreachCommandParser
   • type ForeachJson
   • type FormatCommand
   • const formatCommandParser
   • type FormfactorCommand
   • const formfactorCommandParser
   • const COMMANDS
   • type JokerCommand
   • const jokerCommandParser
   • type KnowledgeCommand
   • const knowledgeCommandParser
   • function knowledgeSourceContentToName
   • type ModelCommand
   • const modelCommandParser
   • type ParameterCommand
   • const parameterCommandParser
   • type PersonaCommand
   • const personaCommandParser
   • type PostprocessCommand
   • const postprocessCommandParser
   • type SectionCommand
   • const sectionCommandParser
   • type UrlCommand
   • const urlCommandParser
   • type ActionCommand
   • const actionCommandParser
   • type InstrumentCommand
   • const instrumentCommandParser
   • class BaseCommitmentDefinition
   • type BookCommitment
   • type CommitmentDefinition
   • function createEmptyAgentModelRequirements
   • function createBasicAgentModelRequirements
   • function formatOptionalInstructionBlock
   • class NotYetImplementedCommitmentDefinition
   • type ParsedCommitment
   • type CommitmentToolFunctions
   • function collectCommitmentToolFunctions
   • function createToolFunctionsProxy
   • function createSerpSearchToolFunction
   • function createWritingSampleSection
   • function createWritingRulesSection
   • function getAllCommitmentDefinitions
   • function getAllCommitmentsToolFunctionsForBrowser
   • function getAllCommitmentsToolFunctionsForNode
   • function getAllCommitmentsToolTitles
   • function getAllCommitmentTypes
   • function getCommitmentDefinition
   • type CommitmentNoticeMetadata
   • function formatCommitmentReplacementText
   • function isLowVisibilityCommitmentNotice
   • function getCommitmentNoticeMetadata
   • function getGroupedCommitmentDefinitions
   • function isCommitmentSupported
   • function sortCommitmentDefinitions
   • const TEAM_INTERNAL_AGENT_ACCESS_HEADER
   • type TeamInternalAgentAccessHeadersOptions
   • function resolveTeamInternalAgentAccessToken
   • function createTeamInternalAgentAccessHeaders
   • function isTeamInternalAgentAccessToken
   • function createToolExecutionEnvelope
   • function parseToolExecutionEnvelope
   • const TOOL_RUNTIME_CONTEXT_PARAMETER
   • const TOOL_RUNTIME_CONTEXT_ARGUMENT
   • const TOOL_PROGRESS_TOKEN_PARAMETER
   • const TOOL_PROGRESS_TOKEN_ARGUMENT
   • type ToolCallProgressUpdate
   • type UserLocationRuntimeContext
   • type ToolRuntimeContext
   • function parseToolRuntimeContext
   • function readToolRuntimeContextFromToolArgs
   • function readToolProgressTokenFromToolArgs
   • function serializeToolRuntimeContext
   • function registerToolCallProgressListener
   • function unregisterToolCallProgressListener
   • function emitToolCallProgressFromToolArgs
   • class ActionCommitmentDefinition
   • class ClosedCommitmentDefinition
   • class ComponentCommitmentDefinition
   • class DeleteCommitmentDefinition
   • class DictionaryCommitmentDefinition
   • class FormatCommitmentDefinition
   • class FromCommitmentDefinition
   • class GoalCommitmentDefinition
   • class ImportCommitmentDefinition
   • const COMMITMENT_REGISTRY
   • class KnowledgeCommitmentDefinition
   • class LanguageCommitmentDefinition
   • function createMemorySystemMessage
   • function createMemoryToolFunctions
   • function createMemoryTools
   • function getMemoryCommitmentDocumentation
   • function getMemoryToolRuntimeAdapterOrDisabledResult
   • function getMemoryToolTitles
   • class MemoryCommitmentDefinition
   • const MemoryToolNames
   • type RetrieveMemoryToolArgs
   • type StoreMemoryToolArgs
   • type UpdateMemoryToolArgs
   • type DeleteMemoryToolArgs
   • type MemoryToolRecord
   • type MemoryToolRuntimeContext
   • type RetrieveMemoryToolResult
   • type StoreMemoryToolResult
   • type UpdateMemoryToolResult
   • type DeleteMemoryToolResult
   • type MemoryToolAction
   • type MemoryToolResult
   • type MemoryToolRuntimeAdapter
   • const parseMemoryToolArgs
   • function resolveMemoryRuntimeContext
   • function setMemoryToolRuntimeAdapter
   • function getMemoryToolRuntimeAdapter
   • class MessageSuffixCommitmentDefinition
   • class AgentMessageCommitmentDefinition
   • class InitialMessageCommitmentDefinition
   • class InternalMessageCommitmentDefinition
   • class MessageCommitmentDefinition
   • class UserMessageCommitmentDefinition
   • class MetaAvatarCommitmentDefinition
   • class MetaColorCommitmentDefinition
   • class MetaDisclaimerCommitmentDefinition
   • class MetaDomainCommitmentDefinition
   • class MetaFontCommitmentDefinition
   • class MetaImageCommitmentDefinition
   • class MetaInputPlaceholderCommitmentDefinition
   • class MetaLinkCommitmentDefinition
   • class MetaVoiceCommitmentDefinition
   • class MetaDescriptionCommitmentDefinition
   • class MetaCommitmentDefinition
   • class ModelCommitmentDefinition
   • class NoteCommitmentDefinition
   • class OpenCommitmentDefinition
   • class PersonaCommitmentDefinition
   • class RuleCommitmentDefinition
   • class SampleCommitmentDefinition
   • class ScenarioCommitmentDefinition
   • class StyleCommitmentDefinition
   • class TeamCommitmentDefinition
   • class TemplateCommitmentDefinition
   • function fetchUrlContent
   • function fetchUrlContentViaBrowser
   • function resolveRunBrowserToolForNode
   • class UseBrowserCommitmentDefinition
   • const DEFAULT_GOOGLE_CALENDAR_SCOPES
   • type CalendarProviderType
   • type CalendarReference
   • type ParsedUseCalendarCommitmentContent
   • function parseGoogleCalendarReference
   • function parseUseCalendarCommitmentContent
   • function extractUseCalendarReferencesFromCommitments
   • function parseGoogleCalendarIdFromUrl
   • function callGoogleCalendarApi
   • function createUseCalendarToolFunctions
   • function createUseCalendarTools
   • function getUseCalendarToolTitles
   • type ConfiguredCalendar
   • function normalizeConfiguredCalendars
   • type UseCalendarToolArgsBase
   • type UseCalendarToolRuntimeResolution
   • function resolveUseCalendarToolRuntimeOrWalletCredentialResult
   • class UseCalendarCommitmentDefinition
   • const UseCalendarToolNames
   • const UseCalendarWallet
   • class UseDeepSearchCommitmentDefinition
   • type ParsedUseEmailCommitmentContent
   • function parseUseEmailCommitmentContent
   • function resolveSendEmailToolForNode
   • function sendEmailViaBrowser
   • class UseEmailCommitmentDefinition
   • class UseImageGeneratorCommitmentDefinition
   • class UseMcpCommitmentDefinition
   • class UsePopupCommitmentDefinition
   • class UsePrivacyCommitmentDefinition
   • type UseProjectGitHubContentsItem
   • type UseProjectGitHubGitRefResponse
   • type UseProjectGitHubRepositoryResponse
   • type UseProjectGitHubPullRequestResponse
   • function callGitHubApi
   • function createUseProjectToolFunctions
   • function createUseProjectTools
   • function getUseProjectToolTitles
   • type UseProjectConfiguredProjectReference
   • function normalizeConfiguredProjects
   • function normalizeOptionalToolText
   • function normalizeRequiredToolText
   • type GitHubRepositoryReference
   • type ParsedUseProjectCommitmentContent
   • function parseGitHubRepositoryReference
   • function parseUseProjectCommitmentContent
   • function extractUseProjectRepositoryUrlsFromCommitments
   • type UseProjectToolArgsBase
   • type UseProjectToolRuntimeResolution
   • function resolveUseProjectToolRuntimeOrWalletCredentialResult
   • class UseProjectCommitmentDefinition
   • const UseProjectToolNames
   • const UseProjectWallet
   • class UseSearchEngineCommitmentDefinition
   • function resolveSpawnAgentToolForNode
   • function spawnAgentViaBrowser
   • class UseSpawnCommitmentDefinition
   • class UseTimeCommitmentDefinition
   • function createTimeoutSystemMessage
   • function createTimeoutToolFunctions
   • function createTimeoutTools
   • function getTimeoutToolRuntimeAdapterOrDisabledResult
   • const parseTimeoutToolArgs
   • function resolveTimeoutRuntimeContext
   • function setTimeoutToolRuntimeAdapter
   • function getTimeoutToolRuntimeAdapter
   • const TimeoutToolNames
   • type SetTimeoutToolArgs
   • type CancelTimeoutToolArgs
   • type UpdateTimeoutToolArgs
   • type ListTimeoutsToolArgs
   • type TimeoutToolRuntimeContext
   • type TimeoutToolListItemStatus
   • type TimeoutToolListItem
   • type SetTimeoutToolResult
   • type CancelTimeoutToolResult
   • type UpdateTimeoutToolResult
   • type ListTimeoutsToolResult
   • type TimeoutToolAction
   • type TimeoutToolResult
   • type TimeoutToolRuntimeAdapter
   • class UseTimeoutCommitmentDefinition
   • class UseUserLocationCommitmentDefinition
   • function appendAggregatedUseCommitmentPlaceholder
   • function aggregateUseCommitmentSystemMessages
   • function createWalletSystemMessage
   • function createWalletToolFunctions
   • function createWalletTools
   • function getWalletCommitmentDocumentation
   • function resolveWalletDisabledMessage
   • function getWalletToolRuntimeAdapterOrDisabledResult
   • function getWalletToolTitles
   • const parseWalletToolArgs
   • function resolveWalletRuntimeContext
   • function setWalletToolRuntimeAdapter
   • function getWalletToolRuntimeAdapter
   • class WalletCommitmentDefinition
   • const WalletToolNames
   • type WalletRecordType
   • type WalletToolRecord
   • type WalletToolRuntimeContext
   • type WalletToolRuntimeAdapter
   • type RetrieveWalletRecordsToolArgs
   • type StoreWalletRecordToolArgs
   • type UpdateWalletRecordToolArgs
   • type DeleteWalletRecordToolArgs
   • type RequestWalletRecordToolArgs
   • type WalletRequestRecord
   • type WalletRuntimeToolAction
   • type WalletDisabledToolResult
   • class WritingRulesCommitmentDefinition
   • class WritingSampleCommitmentDefinition
   • const GENERATOR_WARNING
   • const NAME
   • const ADMIN_EMAIL
   • const PROMPTBOOK_LEGAL_ENTITY
   • const ADMIN_GITHUB_NAME
   • const CLAIM
   • const PROMPTBOOK_COLOR
   • const PROMPTBOOK_SYNTAX_COLORS
   • const PROMPTBOOK_CHAT_COLOR
   • const USER_CHAT_COLOR
   • const DEFAULT_BOOK_TITLE
   • const DEFAULT_TASK_TITLE
   • const DEFAULT_PROMPT_TASK_TITLE
   • const DEFAULT_BOOK_OUTPUT_PARAMETER_NAME
   • const DEFAULT_MAX_FILE_SIZE
   • const BIG_DATASET_TRESHOLD
   • const FAILED_VALUE_PLACEHOLDER
   • const PENDING_VALUE_PLACEHOLDER
   • const GENERATOR_WARNING_BY_PROMPTBOOK_CLI
   • const GENERATOR_WARNING_IN_ENV
   • const LOOP_LIMIT
   • const CHARACTER_LOOP_LIMIT
   • const VALUE_STRINGS
   • const SMALL_NUMBER
   • const CONNECTION_TIMEOUT_MS
   • const CONNECTION_RETRIES_LIMIT
   • const IMMEDIATE_TIME
   • const MAX_FILENAME_LENGTH
   • const DEFAULT_INTERMEDIATE_FILES_STRATEGY
   • const DEFAULT_MAX_PARALLEL_COUNT
   • const DEFAULT_MAX_CONCURRENT_UPLOADS
   • const DEFAULT_MAX_RECURSION
   • const DEFAULT_MAX_EXECUTION_ATTEMPTS
   • const DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_DEPTH
   • const DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_TOTAL
   • const DEFAULT_BOOKS_DIRNAME
   • const DEFAULT_AGENTS_DIRNAME
   • const DEFAULT_DOWNLOAD_CACHE_DIRNAME
   • const DEFAULT_EXECUTION_CACHE_DIRNAME
   • const DEFAULT_SCRAPE_CACHE_DIRNAME
   • const CLI_APP_ID
   • const PLAYGROUND_APP_ID
   • const DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME
   • const MOMENT_ARG_THRESHOLDS
   • const DEFAULT_REMOTE_SERVER_URL
   • const DEFAULT_CSV_SETTINGS
   • let DEFAULT_IS_VERBOSE
   • function SET_IS_VERBOSE
   • const DEFAULT_IS_AUTO_INSTALLED
   • const DEFAULT_TASK_SIMULATED_DURATION_MS
   • const DEFAULT_GET_PIPELINE_COLLECTION_FUNCTION_NAME
   • const DEFAULT_MAX_REQUESTS_PER_MINUTE
   • const API_REQUEST_TIMEOUT
   • const PROMPTBOOK_LOGO_URL
   • const IS_PIPELINE_LOGIC_VALIDATED
   • const IS_COST_PREVENTED
   • const MODEL_TRUST_LEVELS
   • const MODEL_ORDERS
   • const ORDER_OF_PIPELINE_JSON
   • const REPLACING_NONCE
   • const SALT_NONCE
   • const RESERVED_PARAMETER_MISSING_VALUE
   • const RESERVED_PARAMETER_RESTRICTED
   • const RESERVED_PARAMETER_NAMES
   • const PROMPT_PARAMETER_SELF_LEARNING_ENABLED
   • const LIMITS
   • const TIME_INTERVALS
   • const NETWORK_LIMITS
   • const COLOR_CONSTANTS
   • const HTTP_STATUS_CODES
   • const CHAT_STREAM_KEEP_ALIVE_TOKEN
   • const CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS
   • function loadArchive
   • function saveArchive
   • function compilePipeline
   • function compilePipelineOnRemoteServer
   • function parsePipeline
   • function pipelineJsonToString
   • type PrettifyOptions
   • function prettifyPipelineString
   • type renderPipelineMermaidOptions
   • function renderPromptbookMermaid
   • function extractParameterNamesFromTask
   • function importPipelineWithoutPreparation
   • function importPipelineJson
   • function validatePipeline
   • function validatePipeline_InnerFunction
   • class CallbackInterfaceTools
   • type CallbackInterfaceToolsOptions
   • class SimplePromptInterfaceTools
   • class BoilerplateError
   • const PROMPTBOOK_ERRORS
   • const COMMON_JAVASCRIPT_ERRORS
   • const ALL_ERRORS
   • class AbstractFormatError
   • function assertsError
   • class AuthenticationError
   • class CollectionError
   • class ConflictError
   • class DatabaseError
   • class EnvironmentMismatchError
   • class ExpectError
   • class KnowledgeScrapeError
   • class LimitReachedError
   • class MissingToolsError
   • class NotAllowed
   • class NotFoundError
   • class NotYetImplementedError
   • class ParseError
   • class PipelineExecutionError
   • class PipelineLogicError
   • class PipelineUrlError
   • class PromptbookFetchError
   • class UnexpectedError
   • function deserializeError
   • type ErrorJson
   • function getErrorReportUrl
   • function serializeError
   • class WrappedError
   • function $provideExecutablesForNode
   • function locateLibreoffice
   • function locatePandoc
   • function locateVscode
   • function locateBrowser
   • function locateChrome
   • function locateDefaultSystemBrowser
   • function locateEdge
   • function locateFirefox
   • function locateInternetExplorer
   • function locateSafari
   • type LocateAppOptions
   • function locateApp
   • function locateAppOnLinux
   • function locateAppOnMacOs
   • function locateAppOnWindows
   • type AbstractTaskResult
   • function assertsTaskSuccessful
   • type AvailableModel
   • type CommonToolsOptions
   • type $OngoingTaskResult
   • function createPipelineExecutor
   • type CreatePipelineExecutorOptions
   • function executePipeline
   • function executeTask
   • function executeFormatSubvalues
   • type ExecuteAttemptsOptions
   • function executeAttempts
   • function computeCosineSimilarity
   • function filterJustOutputParameters
   • function getContextForTask
   • function getExamplesForTask
   • function getKnowledgeForTask
   • function getReservedParametersForTask
   • function knowledgePiecesToString
   • type EmbeddingVector
   • function embeddingVectorToString
   • type Executables
   • function countWorkingDuration
   • type ExecutionPromptReportJson
   • type ExecutionReportJson
   • function executionReportJsonToString
   • type ExecutionReportString
   • type ExecutionReportStringOptions
   • const ExecutionReportStringOptionsDefaults
   • function createTask
   • type ExecutionTask
   • type PreparationTask
   • type task_status
   • type AbstractTask
   • type Task
   • type ExecutionTools
   • type FilesystemTools
   • type CallChatModelStreamOptions
   • type LlmExecutionTools
   • type LlmExecutionToolsConstructor
   • type PipelineExecutor
   • type PipelineExecutorResult
   • type PromptbookFetch
   • type PromptResult
   • type CompletionPromptResult
   • type ChatPromptResult
   • type ImagePromptResult
   • type EmbeddingPromptResult
   • type CommonPromptResult
   • type ScriptExecutionTools
   • type ScriptExecutionToolsExecuteOptions
   • type AutomaticTranslator
   • class DebugAutomaticTranslator
   • class FakeAutomaticTranslator
   • class LindatAutomaticTranslator
   • type TranslatorOptions
   • function extractMultiplicatedOccurrence
   • function translateMessages
   • type UncertainNumber
   • type Usage
   • type UsageCounts
   • type UserInterfaceTools
   • type UserInterfaceToolsPromptDialogOptions
   • function $provideExecutionToolsForNode
   • function addUsage
   • function checkExpectations
   • function isPassingExpectations
   • function computeUsageCounts
   • function forEachAsync
   • function uncertainNumber
   • const ZERO_VALUE
   • const UNCERTAIN_ZERO_VALUE
   • const ZERO_USAGE
   • const UNCERTAIN_USAGE
   • function usageToHuman
   • function usageToWorktime
   • type ValidatePromptResultOptions
   • type ValidatePromptResultResult
   • function validatePromptResult
   • type FileSecurityChecker
   • type FileSecurityCheckResult
   • class VirusTotalFileSecurityChecker
   • type FormatParser
   • type FormatSubvalueParser
   • type FormatSubvalueParserMapValuesOptions
   • class CsvFormatError
   • const CsvFormatParser
   • type CsvSettings
   • const MANDATORY_CSV_SETTINGS
   • function csvParse
   • function isValidCsvString
   • const FORMAT_DEFINITIONS
   • const JsonFormatParser
   • function isValidJsonString
   • function jsonParse
   • const TextFormatParser
   • function isValidXmlString
   • const XmlFormatParser
   • const BoilerplateFormfactorDefinition
   • type AbstractFormfactorDefinition
   • type FormfactorDefinition
   • type string_formfactor_name
   • const ChatbotFormfactorDefinition
   • const CompletionFormfactorDefinition
   • const GeneratorFormfactorDefinition
   • const GenericFormfactorDefinition
   • const ImageGeneratorFormfactorDefinition
   • const FORMFACTOR_DEFINITIONS
   • const MatcherFormfactorDefinition
   • const SheetsFormfactorDefinition
   • const TranslatorFormfactorDefinition
   • default string
   • type SyncHighLevelAbstraction
   • const ImplicitFormfactorHla
   • const HIGH_LEVEL_ABSTRACTIONS
   • const QuickChatbotHla
   • const $fileImportPlugins
   • const AgentFileImportPlugin
   • type FileImportPlugin
   • const JsonFileImportPlugin
   • const TextFileImportPlugin
   • function filterModels
   • const $llmToolsMetadataRegister
   • const $llmToolsRegister
   • function $provideEnvFilename
   • function $provideLlmToolsConfigurationFromEnv
   • function $provideLlmToolsForTestingAndScriptsAndPlayground
   • function $provideLlmToolsForWizardOrCli
   • function $provideLlmToolsFromEnv
   • function $setUsedEnvFilename
   • function $registeredLlmToolsMessage
   • type CreateLlmToolsFromConfigurationOptions
   • function createLlmToolsFromConfiguration
   • type LlmToolsConfiguration
   • type LlmToolsMetadata
   • type LlmToolsOptions
   • function assertUniqueModels
   • type CacheItem
   • function cacheLlmTools
   • type CacheLlmToolsOptions
   • function countUsage
   • function limitTotalUsage
   • type LlmExecutionToolsWithTotalUsage
   • function pricing
   • function parseUnsupportedParameterError
   • function removeUnsupportedModelRequirement
   • function isUnsupportedParameterError
   • function getSingleLlmExecutionTools
   • function joinLlmExecutionTools
   • class MultipleLlmExecutionTools
   • class Agent
   • class AgentLlmExecutionTools
   • type AgentOptions
   • const createAgentLlmExecutionTools
   • type CreateAgentLlmExecutionToolsOptions
   • const _AgentMetadata
   • const _AgentRegistration
   • class RemoteAgent
   • type RemoteAgentOptions
   • class SelfLearningManager
   • const ANTHROPIC_CLAUDE_MODELS
   • class AnthropicClaudeExecutionTools
   • type AnthropicClaudeExecutionToolsOptions
   • type AnthropicClaudeExecutionToolsNonProxiedOptions
   • type AnthropicClaudeExecutionToolsProxiedOptions
   • function computeAnthropicClaudeUsage
   • const createAnthropicClaudeExecutionTools
   • const _AnthropicClaudeMetadataRegistration
   • const _AnthropicClaudeRegistration
   • class AzureOpenAiExecutionTools
   • type AzureOpenAiExecutionToolsOptions
   • const createAzureOpenAiExecutionTools
   • const _AzureOpenAiMetadataRegistration
   • const _AzureOpenAiRegistration
   • const createDeepseekExecutionTools
   • const DEEPSEEK_MODELS
   • type DeepseekExecutionToolsOptions
   • const _DeepseekMetadataRegistration
   • const _DeepseekRegistration
   • const createGoogleExecutionTools
   • const GOOGLE_MODELS
   • type GoogleExecutionToolsOptions
   • const _GoogleMetadataRegistration
   • const _GoogleRegistration
   • function $fakeTextToExpectations
   • class MockedEchoLlmExecutionTools
   • class MockedFackedLlmExecutionTools
   • const createOllamaExecutionTools
   • const OLLAMA_MODELS
   • class OllamaExecutionTools
   • const DEFAULT_OLLAMA_BASE_URL
   • type OllamaExecutionToolsOptions
   • const _OllamaMetadataRegistration
   • const _OllamaRegistration
   • function computeOpenAiUsage
   • const createOpenAiAssistantExecutionTools
   • const createOpenAiCompatibleExecutionTools
   • class HardcodedOpenAiCompatibleExecutionTools
   • const createOpenAiExecutionTools
   • const OPENAI_MODELS
   • type AgentOutputType
   • function mapResponseFormatToAgentOutputType
   • class OpenAiAgentKitExecutionTools
   • type OpenAiAgentKitExecutionToolsOptions
   • class OpenAiAssistantExecutionTools
   • type OpenAiAssistantExecutionToolsOptions
   • class OpenAiCompatibleExecutionTools
   • type OpenAiCompatibleExecutionToolsOptions
   • type OpenAiCompatibleExecutionToolsNonProxiedOptions
   • type OpenAiCompatibleExecutionToolsProxiedOptions
   • class OpenAiExecutionTools
   • type OpenAiExecutionToolsOptions
   • type OpenAiVectorStoreHandlerOptions
   • class OpenAiVectorStoreHandler
   • const _OpenAiMetadataRegistration
   • const _OpenAiAssistantMetadataRegistration
   • const _OpenAiCompatibleMetadataRegistration
   • const _OpenAiRegistration
   • const _OpenAiAssistantRegistration
   • const _OpenAiCompatibleRegistration
   • function buildToolInvocationScript
   • function callOpenAiCompatibleChatModel
   • function mapToolsToOpenAi
   • class OpenAiCompatibleUnsupportedParameterRetrier
   • function uploadFilesToOpenAi
   • class RemoteLlmExecutionTools
   • function createExecutionToolsFromVercelProvider
   • type VercelExecutionToolsOptions
   • type VercelProvider
   • function migratePipeline
   • let pipelines
   • function getBookTemplates
   • function getTemplatesPipelineCollection
   • function preparePersona
   • function book
   • function isValidPipelineString
   • const GENERIC_PIPELINE_INTERFACE
   • function getPipelineInterface
   • type IsPipelineImplementingInterfaceOptions
   • function isPipelineImplementingInterface
   • function isPipelineInterfacesEqual
   • type PipelineInterface
   • type CommonTaskJson
   • type DialogTaskJson
   • type Expectations
   • type ExpectationUnit
   • const EXPECTATION_UNITS
   • type ExpectationAmount
   • type KnowledgePiecePreparedJson
   • type KnowledgeSourceJson
   • type KnowledgeSourcePreparedJson
   • type ParameterJson
   • type InputParameterJson
   • type IntermediateParameterJson
   • type OutputParameterJson
   • type CommonParameterJson
   • type PersonaJson
   • type PersonaPreparedJson
   • type PipelineJson
   • type PreparationJson
   • type PromptTaskJson
   • type ScriptTaskJson
   • type SimpleTaskJson
   • type TaskJson
   • type PipelineString
   • class PromptString
   • function prompt
   • const promptTemplate
   • const ParameterEscaping
   • const ParameterNaming
   • const ParameterSection
   • function validatePipelineString
   • function extractBlock
   • function extractJsonBlock
   • function isPipelinePrepared
   • type PrepareAndScrapeOptions
   • function preparePipeline
   • function preparePipelineOnRemoteServer
   • function prepareTasks
   • function unpreparePipeline
   • function createRemoteClient
   • type paths
   • type webhooks
   • type components
   • type $defs
   • type operations
   • const openapiJson
   • type RemoteServer
   • type PromptbookServer_Error
   • type Identification
   • type ApplicationModeIdentification
   • type AnonymousModeIdentification
   • function identificationToPromptbookToken
   • function promptbookTokenToIdentification
   • type PromptbookServer_ListModels_Request
   • type PromptbookServer_ListModels_Response
   • type PromptbookServer_PreparePipeline_Request
   • type PromptbookServer_PreparePipeline_Response
   • type PromptbookServer_Prompt_Request
   • type PromptbookServer_Prompt_Response
   • function startAgentServer
   • function startRemoteServer
   • type RemoteClientOptions
   • type RemoteServerOptions
   • type AnonymousRemoteServerOptions
   • type ApplicationRemoteServerOptions
   • type ApplicationRemoteServerClientOptions
   • type LoginRequest
   • type LoginResponse
   • function renderServerIndexHtml
   • function HtmlDoc
   • type ServerInfo
   • class BoilerplateScraper
   • const createBoilerplateScraper
   • const _BoilerplateScraperRegistration
   • const boilerplateScraperMetadata
   • const _BoilerplateScraperMetadataRegistration
   • type Converter
   • function prepareKnowledgePieces
   • function $provideFilesystemForNode
   • function $provideScrapersForBrowser
   • function $provideScrapersForNode
   • function $provideScriptingForNode
   • function $registeredScrapersMessage
   • const $scrapersMetadataRegister
   • const $scrapersRegister
   • type ScraperAndConverterMetadata
   • type ScraperConstructor
   • type Scraper
   • type ScraperSourceHandler
   • type ScraperIntermediateSource
   • function getScraperIntermediateSource
   • function makeKnowledgeSourceHandler
   • const promptbookFetch
   • const createLegacyDocumentScraper
   • class LegacyDocumentScraper
   • const _LegacyDocumentScraperRegistration
   • const legacyDocumentScraperMetadata
   • const _LegacyDocumentScraperMetadataRegistration
   • const createDocumentScraper
   • class DocumentScraper
   • const _DocumentScraperRegistration
   • const documentScraperMetadata
   • const _DocumentScraperMetadataRegistration
   • const createMarkdownScraper
   • class MarkdownScraper
   • const _MarkdownScraperRegistration
   • const markdownScraperMetadata
   • const _MarkdownScraperMetadataRegistration
   • const createMarkitdownScraper
   • class MarkitdownScraper
   • const _MarkitdownScraperRegistration
   • const markitdownScraperMetadata
   • const _MarkitdownScraperMetadataRegistration
   • const createPdfScraper
   • class PdfScraper
   • const _PdfScraperRegistration
   • const pdfScraperMetadata
   • const _PdfScraperMetadataRegistration
   • const createWebsiteScraper
   • const _WebsiteScraperRegistration
   • const websiteScraperMetadata
   • const _WebsiteScraperMetadataRegistration
   • function createShowdownConverter
   • class WebsiteScraper
   • class JavascriptEvalExecutionTools
   • const JavascriptExecutionTools
   • type JavascriptExecutionToolsOptions
   • type PostprocessingFunction
   • type ToolFunction
   • const POSTPROCESSING_FUNCTIONS
   • function extractVariablesFromJavascript
   • class PythonExecutionTools
   • class TypescriptExecutionTools
   • class BingSearchEngine
   • class DummySearchEngine
   • class GoogleSearchEngine
   • type SearchEngine
   • type SearchResult
   • class SerpSearchEngine
   • class BrowserSpeechRecognition
   • type OpenAiSpeechRecognitionOptions
   • class OpenAiSpeechRecognition
   • function resolveOpenAiSpeechRecognitionPreferredRecordingFormat
   • function resolveOpenAiSpeechRecognitionAudioFileDescriptor
   • type PromptbookStorage
   • class BlackholeStorage
   • class $EnvStorage
   • class FileCacheStorage
   • type FileCacheStorageOptions
   • function nameToSubfolderPath
   • function getIndexedDbStorage
   • function getLocalStorage
   • function getSessionStorage
   • type IndexedDbStorageOptions
   • function makePromptbookStorageFromIndexedDb
   • function makePromptbookStorageFromWebStorage
   • class MemoryStorage
   • class PrefixStorage
   • type BookTranspiler
   • type BookTranspilerOptions
   • function createTranspiledTeamExportForContext
   • function extractTranspiledTeamTeammates
   • function createTranspiledTeamAgentModelRequirements
   • function createTranspiledTeamAwareToolFunctions
   • function createTranspiledTeamRuntimeSection
   • function createZodSchemaSource
   • function createZodShapeSource
   • function formatUsedToolFunctions
   • type PreparedSdkTranspilerContext
   • function prepareSdkTranspilerContext
   • const $bookTranspilersRegister
   • function resolveClaudeModelName
   • type TranspiledTeamAgentModelRequirements
   • type TranspiledTeamTeammate
   • type TranspiledTeamAgent
   • type TranspiledTeamExport
   • const AgentOsTranspiler
   • const _AgentOsTranspilerRegistration
   • const AnthropicClaudeManagedTranspiler
   • const _AnthropicClaudeManagedTranspilerRegistration
   • const AnthropicClaudeSdkTranspiler
   • const _AnthropicClaudeSdkTranspilerRegistration
   • const E2BTranspiler
   • const _E2BTranspilerRegistration
   • const FormattedBookInMarkdownTranspiler
   • const _FormattedBookInMarkdownTranspilerRegistration
   • const OpenAiAgentsTranspiler
   • const _OpenAiAgentsTranspilerRegistration
   • const OpenAiSdkTranspiler
   • const _OpenAiSdkTranspilerRegistration
   • type Arrayable
   • type InputParameters_private
   • type IntermediateFilesStrategy
   • type LlmCall
   • type LlmToolDefinition
   • type Message
   • type ModelRequirements
   • type CompletionModelRequirements
   • type ChatModelRequirements
   • type ImageGenerationModelRequirements
   • type EmbeddingModelRequirements
   • type CommonModelRequirements
   • type ModelVariant
   • const MODEL_VARIANTS
   • type NonEmptyArray
   • type NonEmptyReadonlyArray
   • type number_bytes
   • type number_kilobytes
   • type number_megabytes
   • type number_gigabytes
   • type number_terabytes
   • type number_id
   • type number_linecol_number
   • type number_tokens
   • type number_likeness
   • type number_milliseconds
   • type number_seconds
   • type number_minutes
   • type number_hours
   • type number_days
   • type number_weeks
   • type number_months
   • type number_years
   • type number_percent
   • type number_model_temperature
   • type number_seed
   • type number_positive
   • type number_negative
   • type number_integer
   • type number_port
   • type number_usd
   • type Parameters_private
   • type Parameters
   • type InputParameters
   • type ReservedParameters
   • type Prompt
   • type CompletionPrompt
   • type ChatPrompt
   • type ImagePrompt
   • type EmbeddingPrompt
   • type CommonPrompt
   • type ReservedParameters_private
   • type ScriptLanguage
   • const SUPPORTED_SCRIPT_LANGUAGES
   • type SectionType
   • const NonTaskSectionTypes
   • const SectionTypes
   • type SpeechRecognitionErrorCode
   • type SpeechRecognition
   • type SpeechRecognitionStartOptions
   • type SpeechRecognitionState
   • type SpeechRecognitionEvent
   • type string_agent_hash_private
   • type string_agent_name_in_book_private
   • type string_agent_name_private
   • type string_agent_name
   • type string_agent_name_in_book
   • type string_agent_hash
   • type string_agent_permanent_id
   • type string_agent_permanent_id_private
   • type string_agent_url_private
   • type string_agent_url
   • type string_base_url_private
   • type string_base_url
   • type string_base64_private
   • type string_data_url_private
   • type string_base64
   • type string_data_url
   • type string_business_category_name_private
   • type string_business_category_name
   • type string_char_private
   • type string_chat_prompt_private
   • type string_completion_prompt_private
   • type string_email_private
   • type string_emails_private
   • type string_email
   • type string_emails
   • type string_absolute_filename
   • type string_relative_filename
   • type string_filename
   • type string_absolute_dirname
   • type string_relative_dirname
   • type string_dirname
   • type string_executable_path
   • type string_domain_private
   • type string_origin_private
   • type string_tdl_private
   • type string_hostname_private
   • type string_host_private
   • type string_protocol_private
   • type string_ip_address_private
   • type string_domain
   • type string_origin
   • type string_tdl
   • type string_hostname
   • type string_host
   • type string_protocol
   • type string_ip_address
   • type string_href_private
   • type string_uri_private
   • type string_uri_part_private
   • type string_href
   • type string_uri
   • type string_uri_part
   • type string_knowledge_source_content
   • type string_knowledge_source_link
   • type string_html
   • type string_xml
   • type string_markdown
   • type string_markdown_section
   • type string_markdown_section_content
   • type string_markdown_text
   • type string_markdown_codeblock_language
   • type string_promptbook_documentation_url
   • type string_css
   • type string_svg
   • type string_script
   • type string_javascript
   • type string_typescript
   • type string_json
   • type string_css_class
   • type string_css_property
   • type string_fonts
   • type string_css_value
   • type string_css_selector
   • type string_mime_type_private
   • type string_mime_type_with_wildcard_private
   • type string_mime_type
   • type string_mime_type_with_wildcard
   • type string_model_description_private
   • type string_model_name_private
   • type string_model_name
   • type string_name_private
   • type string_name
   • type string_parameter_name
   • type string_parameter_value
   • type string_reserved_parameter_name
   • type string_page_private
   • type string_page
   • type string_char
   • type string_parameter_value_private
   • type string_person_fullname
   • type string_person_firstname
   • type string_person_lastname
   • type string_person_profile
   • type string_license
   • type string_legal_entity
   • type string_attribute
   • type string_attribute_value_scope
   • type string_color
   • type string_translate_name
   • type string_translate_name_not_normalized
   • type string_translate_language
   • type string_javascript_name
   • type string_postprocessing_function_name
   • type string_persona_description_private
   • type string_persona_description
   • type string_model_description
   • type string_pipeline_root_url_private
   • type string_pipeline_root_url
   • type string_pipeline_url_private
   • type string_pipeline_url_with_task_hash_private
   • type string_pipeline_url
   • type string_pipeline_url_with_task_hash
   • type string_prompt_image_private
   • type string_prompt_private
   • type string_prompt
   • type string_prompt_image
   • type string_template
   • type string_text_prompt
   • type string_chat_prompt
   • type string_system_message
   • type string_completion_prompt
   • type string_promptbook_server_url_private
   • type string_promptbook_server_url
   • type string_reserved_parameter_name_private
   • type string_uuid
   • type string_sha256
   • type string_base_58
   • type string_semantic_version
   • type string_version_dependency
   • type string_file_extension
   • type string_system_message_private
   • type string_template_private
   • type string_text_prompt_private
   • type string_title_private
   • type string_title
   • type id
   • type task_id
   • type string_token
   • type string_promptbook_token
   • type string_license_token
   • type string_password
   • type string_ssh_key
   • type string_pgp_key
   • type string_language
   • type string_date_iso8601
   • type string_app_id
   • type string_user_id
   • type string_url_image_private
   • type string_url_image
   • type string_url_private
   • type string_url
   • type TaskType
   • const TaskTypes
   • type ToolCallState
   • type ToolCallLogLevel
   • type ToolCallLogEntry
   • type ToolCall
   • type SelfLearningCommitmentTypeCounts
   • type SelfLearningTeacherSummary
   • type SelfLearningToolCallResult
   • const ASSISTANT_PREPARATION_TOOL_CALL_NAME
   • function isAssistantPreparationToolCall
   • type string_char_emoji
   • type Updatable
   • function asUpdatableSubject
   • type ResolveAgentAvatarOptions
   • type ResolveAgentAvatarImageUrlOptions
   • const DEFAULT_AGENT_AVATAR_VISUAL_ID
   • type ResolvedAgentAvatar
   • function resolveAgentAvatarVisualId
   • function resolveAgentAvatarFallbackUrl
   • function resolveAgentAvatar
   • function resolveAgentAvatarImageUrl
   • type ChatAttachment
   • type ResolvedChatAttachmentContent
   • type ResolveChatAttachmentOptions
   • function appendChatAttachmentContext
   • function appendChatAttachmentContextWithContent
   • function appendChatContextSections
   • function formatChatAttachmentContentContext
   • function formatChatAttachmentContext
   • function normalizeChatAttachments
   • function resolveChatAttachmentContent
   • function resolveChatAttachmentContents
   • const CHAT_STREAM_WHITESPACE_ENCODERS
   • const CHAT_STREAM_WHITESPACE_DECODERS
   • function decodeChatStreamWhitespaceFromTransport
   • function encodeChatStreamWhitespaceForTransport
   • function escapeRegExp
   • const CLIENT_VERSION_HEADER
   • const CLIENT_LATEST_VERSION
   • function isClientVersionCompatible
   • function formatClientVersionMismatchMessage
   • class ClientVersionMismatchError
   • function attachClientVersionHeader
   • function getClientVersionFromHeaders
   • function $randomColor
   • class Color
   • const CSS_COLORS
   • function checkChannelValue
   • function hslToRgb
   • function rgbToHsl
   • type ColorTransformer
   • function darken
   • function furthest
   • const textColor
   • function grayscale
   • function lighten
   • function mixWithColor
   • function nearest
   • function negative
   • function negativeLightness
   • function saturate
   • function withAlpha
   • type ColorChannelSet
   • function parseHexColor
   • function parseHslColor
   • function parseRgbColor
   • function parseRgbaColor
   • function areColorsEqual
   • function colorDistance
   • function colorDistanceSquared
   • function colorHue
   • function colorHueDistance
   • function colorLuminance
   • function colorSatulightion
   • function colorSaturation
   • function colorToDataUrl
   • function mixColors
   • type UniqueConstraintTranslation
   • function translateSupabaseUniqueConstraintError
   • const DEFAULT_THINKING_MESSAGES
   • type ThinkingMessageVariant
   • function addPipelineCommand
   • function deflatePipeline
   • function removePipelineCommand
   • type PipelineEditableSerialized
   • function isFlatPipeline
   • function renamePipelineParameter
   • function stringifyPipelineJson
   • function $detectRuntimeEnvironment
   • function $getGlobalScope
   • function $isRunningInBrowser
   • function $isRunningInJest
   • function $isRunningInNode
   • function $isRunningInWebWorker
   • function $execCommand
   • function $execCommandNormalizeOptions
   • function $execCommands
   • type ExecCommandOptions
   • type ExecCommandOptionsAdvanced
   • const CHARACTERS_PER_STANDARD_LINE
   • const LINES_PER_STANDARD_PAGE
   • function countCharacters
   • function countLines
   • function countPages
   • function countParagraphs
   • function splitIntoSentences
   • function countSentences
   • function countWords
   • const CountUtils
   • function $induceBookDownload
   • function $induceFileDownload
   • type DecodeAttachmentAsTextInput
   • type DecodeAttachmentAsTextOptions
   • type DecodeAttachmentAsTextResult
   • const DEFAULT_ATTACHMENT_TEXT_DECODE_BYTES
   • function decodeAttachmentAsText
   • function extensionToMimeType
   • function getFileExtension
   • function isDirectoryExisting
   • function isExecutable
   • function isFileExisting
   • function listAllFiles
   • function mimeTypeToExtension
   • class ObjectUrl
   • function readResponseBytes
   • type InlineKnowledgeSourceFile
   • type InlineKnowledgeSourceUploader
   • function createInlineKnowledgeSourceFile
   • function isDataUrlKnowledgeSource
   • function inlineKnowledgeSourceToDataUrl
   • function parseDataUrlKnowledgeSource
   • function simplifyKnowledgeLabel
   • function isHumanOrID
   • function parseSpeechRecognitionLanguageFromAcceptLanguageHeader
   • function getBrowserPreferredSpeechRecognitionLanguage
   • function resolveSpeechRecognitionLanguage
   • function linguisticHash
   • type LinguisticHashLanguage
   • type LinguisticHashLanguageConfig
   • const DEFAULT_LINGUISTIC_HASH_LANGUAGE
   • const LINGUISTIC_HASH_LANGUAGES
   • function normalizeLinguisticHashLanguage
   • function getLinguisticHashLanguageConfig
   • type LinguisticHashWordKind
   • type LinguisticHashWordLists
   • const MIN_LINGUISTIC_HASH_WORD_COUNT
   • const DEFAULT_LINGUISTIC_HASH_WORD_COUNT
   • function normalizeLinguisticHashWordCount
   • const linguisticHashWordCount
   • const LINGUISTIC_HASH_WORD_LISTS_CS
   • const LINGUISTIC_HASH_WORD_LISTS_EN
   • const MAX_LINGUISTIC_HASH_WORD_COUNT
   • function createLinguisticHashWords
   • const linguisticHashWordSelection
   • function addAutoGeneratedSection
   • function createMarkdownChart
   • function createMarkdownTable
   • function escapeMarkdownBlock
   • type MarkdownCodeBlock
   • function extractAllBlocksFromMarkdown
   • function extractAllListItemsFromMarkdown
   • function extractOneBlockFromMarkdown
   • function flattenMarkdown
   • function humanizeAiText
   • function humanizeAiTextEllipsis
   • function humanizeAiTextEmdashed
   • function humanizeAiTextQuotes
   • function humanizeAiTextSources
   • function humanizeAiTextWhitespace
   • type MarkdownSection
   • function parseMarkdownSection
   • function prettifyMarkdown
   • function prettifyMarkdownAsync
   • function promptbookifyAiText
   • function removeMarkdownComments
   • function removeMarkdownFormatting
   • function removeMarkdownLinks
   • function splitMarkdownIntoSections
   • function trimCodeBlock
   • function trimEndOfCodeBlock
   • function $getCurrentDate
   • type Registered
   • type Registration
   • class $Register
   • type AboutPromptbookInformationOptions
   • function aboutPromptbookInformation
   • function arrayableToArray
   • function computeHash
   • function debounce
   • const EMOJIS_IN_CATEGORIES
   • const EMOJIS
   • type FromtoItems
   • type InjectCssModuleIntoShadowRootOptions
   • function injectCssModuleIntoShadowRoot
   • function parseNumber
   • function AboutPromptbookInformation
   • function capitalize
   • function constructImageFilename
   • function decapitalize
   • const DIACRITIC_VARIANTS_LETTERS
   • type string_keyword
   • type Keywords
   • function isValidKeyword
   • function nameToUriPart
   • function nameToUriParts
   • type string_kebab_case
   • function normalizeToKebabCase
   • function normalizeMessageText
   • type string_camelCase
   • function normalizeTo_camelCase
   • type string_PascalCase
   • function normalizeTo_PascalCase
   • type string_SCREAMING_CASE
   • function normalizeTo_SCREAMING_CASE
   • type string_snake_case
   • function normalizeTo_snake_case
   • function normalizeWhitespaces
   • type OrderJsonOptions
   • function orderJson
   • function parseKeywords
   • function parseKeywordsFromString
   • function removeDiacritics
   • function removeEmojis
   • function removeQuotes
   • function searchKeywords
   • function suffixUrl
   • function titleToName
   • function unwrapResult
   • type ___and___
   • type ___or___
   • type $side_effect
   • function $sideEffect
   • type empty_object
   • type just_empty_object
   • function just
   • function keepImported
   • function keepTypeImported
   • function keepUnused
   • function $preserve
   • function __DO_NOT_USE_getPreserved
   • type chococake
   • type really_any
   • type really_unknown
   • const spaceTrim
   • type TODO_any
   • type TODO_narrow
   • type TODO_object
   • type TODO_remove_as
   • type TODO_string
   • type TODO_unknown
   • function TODO_USE
   • function extractParameterNames
   • function mapAvailableToExpectedParameters
   • function numberToString
   • function templateParameters
   • function valueToString
   • function $generateBookBoilerplate
   • function $randomAgentPersona
   • function $randomAgentRule
   • function $randomBase58
   • type RandomFullnameWithColorResult
   • function $randomFullnameWithColor
   • function $randomItem
   • function $randomSeed
   • function $randomToken
   • const CzechNamePool
   • function generateDeterministicEnglishName
   • const EnglishNamePool
   • function getNamePool
   • type GenerateNameResult
   • type NamePool
   • function $deepFreeze
   • function asSerializable
   • type CheckSerializableAsJsonOptions
   • function checkSerializableAsJson
   • function clonePipeline
   • function deepClone
   • type ExportJsonOptions
   • function exportJson
   • function isSerializableAsJson
   • function jsonStringsToJsons
   • function serializeToPromptbookJavascript
   • function difference
   • function intersection
   • function union
   • class TakeChain
   • type WithTake
   • type ITakeChain
   • type Takeable
   • function take
   • function getToolCallIdentity
   • function mergeToolCalls
   • function resolveToolCallIdempotencyKey
   • function isValidEmail
   • function isRootPath
   • function isValidFilePath
   • function isValidJavascriptName
   • function validateParameterName
   • function isValidPromptbookVersion
   • function isValidSemanticVersion
   • function extractUrlsFromText
   • type IsHostnameOnPrivateNetworkOptions
   • function isHostnameOnPrivateNetwork
   • type IsUrlOnPrivateNetworkOptions
   • function isUrlOnPrivateNetwork
   • function isValidAgentUrl
   • function isValidPipelineUrl
   • function isValidUrl
   • function normalizeDomainForMatching
   • function isValidUuid
   • const BOOK_LANGUAGE_VERSION
   • const PROMPTBOOK_ENGINE_VERSION
   • type string_promptbook_version
   • function $getCompiledBook
   • const wizard
   • const CORE_AGENTS_SERVER
   • const CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES
   • const PUBLIC_AGENTS_SERVERS

📋 Available entities ↑

📁 src/book-components/Chat/Chat/ChatInputArea.test.tsx
   • type ChatInputAreaProps

📁 src/book-components/Chat/Chat/ChatMessageItem.tsx
   • type ParsedCitation
   • type MessageButton

📁 src/book-components/Chat/Chat/ChatMessageRichContent.tsx
   • type StreamingFeaturePlaceholderKind

📁 src/book-components/Chat/Chat/ChatToolCallModalContent.tsx
   • type TeamToolCallSummary
   • type TransitiveToolCall

📁 src/book-components/Chat/Chat/createChatMessageToolCallRenderModel.ts
   • type TransitiveCitation
   • type TransitiveToolCall
   • type ToolCallChipletInfo

📁 src/book-components/Chat/Chat/TeamToolCallModalContent.tsx
   • type TeamToolCallSummary
   • type TransitiveToolCall

📁 src/book-components/Chat/Chat/useChatInputAreaDictation.ts
   • type DictationRefinementSettings

📁 src/book-components/Chat/Chat/useChatInputAreaDictationPersistence.ts
   • type DictationDictionary
   • type DictationRefinementSettings

📁 src/book-components/Chat/Chat/useChatInputAreaDictationSupport.ts
   • type DictationUiState
   • type SpeechRecognitionUiDescriptor

📁 src/book-components/Chat/Chat/useChatToolCallModalState.ts
   • type TeamToolCallSummary
   • type TransitiveToolCall
   • type AgentProfileData
   • type TeamToolResult

📁 src/book-components/Chat/CodeBlock/CodeBlock.tsx
   • type MonacoCodeBlockLanguage

📁 src/book-components/Chat/hooks/useChatAutoScroll.test.tsx
   • type ChatAutoScrollConfig

📁 src/book-components/Chat/utils/collectTeamToolCallSummary.ts
   • type ToolCall
   • type TeamToolResult

📁 src/book-components/Chat/utils/createCitationFootnoteRenderModel.ts
   • type ParsedCitation

📁 src/book-components/Chat/utils/getToolCallChipletInfo.ts
   • type ToolCall

📁 src/cli/cli-commands/agent/run.test.ts
   • runAgentMessages
   • tickAgentMessages

📁 src/cli/cli-commands/agent/run.ts
   • type AgentRunCliOptions

📁 src/cli/cli-commands/agent/tick.ts
   • type AgentRunCliOptions

📁 src/cli/cli-commands/coder/find-refactor-candidates.test.ts
   • findRefactorCandidates

📁 src/cli/cli-commands/coder/find-refactor-candidates.ts
   • DEFAULT_REFACTOR_CANDIDATE_LEVEL
   • REFACTOR_CANDIDATE_LEVEL_VALUES
   • getRefactorCandidateLevelDescription
   • type RefactorCandidateLevel

📁 src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts
   • type EnsuredCoderPromptTemplateFile
   • type InitializationStatus

📁 src/cli/cli-commands/coder/run.test.ts
   • runCodexPrompts

📁 src/cli/cli-commands/coder/run.ts
   • type PromptRunnerCliOptions

📁 src/cli/cli-commands/coder/verify.test.ts
   • verifyPrompts

📁 src/cli/cli-commands/common/promptRunnerCliOptions.ts
   • type ThinkingLevel

📁 src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase.ts
   • type CreateAgentPersistenceRecordsOptions

📁 src/commitments/_common/getAllCommitmentsToolFunctionsForNode.ts
   • type CommitmentToolFunctions

📁 src/commitments/MEMORY/MEMORY.test.ts
   • type MemoryToolRuntimeAdapter

📁 src/commitments/TEAM/TEAM.ts
   • type TeamTeammate
   • type PseudoAgentKind
   • type ToolRuntimeContext

📁 src/commitments/USE_CALENDAR/createUseCalendarToolFunctions.ts
   • type UseCalendarToolArgsBase
   • type UseCalendarToolRuntimeResolution

📁 src/commitments/USE_CALENDAR/resolveUseCalendarToolRuntimeOrWalletCredentialResult.ts
   • type CalendarReference

📁 src/commitments/USE_CALENDAR/USE_CALENDAR.ts
   • type CalendarReference

📁 src/commitments/USE_PROJECT/createUseProjectToolFunctions.ts
   • type UseProjectGitHubContentsItem
   • type UseProjectGitHubGitRefResponse
   • type UseProjectGitHubPullRequestResponse
   • type UseProjectGitHubRepositoryResponse
   • type UseProjectToolArgsBase
   • type UseProjectToolRuntimeResolution

📁 src/commitments/USE_PROJECT/resolveUseProjectToolRuntimeOrWalletCredentialResult.ts
   • type GitHubRepositoryReference

📁 src/commitments/USE_PROJECT/USE_PROJECT.ts
   • type GitHubRepositoryReference

📁 src/commitments/USE_TIMEOUT/USE_TIMEOUT.test.ts
   • type TimeoutToolRuntimeAdapter

📁 src/commitments/USE_USER_LOCATION/USE_USER_LOCATION.ts
   • type UserLocationRuntimeContext

📁 src/commitments/WALLET/WALLET.test.ts
   • type WalletToolRuntimeAdapter

📁 src/conversion/parsePipeline.ts
   • type MarkdownSection

📁 src/llm-providers/openai/OpenAiAgentKitExecutionTools.ts
   • type ToolCallProgressUpdate

📁 src/llm-providers/openai/OpenAiAssistantExecutionTools.ts
   • type ToolCallProgressUpdate

📁 src/llm-providers/openai/utils/callOpenAiCompatibleChatModel.ts
   • type ToolCallProgressUpdate

📁 src/utils/toolCalls/mergeToolCalls.ts
   • type ToolCall
   • type ToolCallState

📁 src/utils/validators/url/isUrlOnPrivateNetwork.ts
   • type IsHostnameOnPrivateNetworkOptions
Error in repair-imports.ts
Error: Cannot repair imports: 69 entities not found in project.
    at repairImports (C:\Users\me\work\ai\promptbook\scripts\repair-imports\repair-imports.ts:204:15)

```
