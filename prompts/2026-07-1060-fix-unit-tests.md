[x] (2 attempts) by OpenAI Codex `gpt-5.6-terra` (ChatGPT account) - Implementation ~$0.4906 13 minutes; Testing 5 minutes; Fixing ~$0.5068 an hour; Testing 5 minutes

[✨💢] Fix the unit tests

-   The unit tests are working on a Windows machine but failing on this Apple Mac machine. 
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.

```console
  MockedEchoLlmExecutionTools.ts       |   94.44 |       60 |      70 |   94.44 | 39,55             
  MockedFackedLlmExecutionTools.ts     |   61.76 |       50 |      30 |   61.76 | 38-58,154-185     
 promptbook/src/llm-providers/ollama   |      60 |        0 |    7.69 |      60 |                   
  OllamaExecutionTools.ts              |   38.88 |      100 |       0 |   38.88 | 35-104            
  OllamaExecutionToolsOptions.ts       |     100 |      100 |     100 |     100 |                   
  createOllamaExecutionTools.ts        |   57.14 |        0 |       0 |   57.14 | 15-19             
  ollama-models.ts                     |     100 |      100 |     100 |     100 |                   
  register-configuration.ts            |   77.77 |        0 |      50 |   77.77 | 28,41             
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
 promptbook/src/llm-providers/openai   |   17.79 |      3.4 |     9.3 |   17.92 |                   
  OpenAiAgentKitExecutionTools.ts      |   19.29 |     2.47 |   16.66 |   19.29 | 75,87-441,459-476 
  ...tKitExecutionToolsInputBuilder.ts |    5.45 |        0 |       0 |    5.45 | 34-194            
  ...ExecutionToolsOutputTypeMapper.ts |    5.26 |        0 |       0 |    5.26 | 76-191            
  ...ntKitExecutionToolsToolBuilder.ts |   29.31 |     7.14 |   25.92 |   29.31 | ...91-393,420-489 
  OpenAiAssistantExecutionTools.ts     |   14.89 |        0 |    5.55 |   14.89 | 42-470            
  ...ExecutionToolsProgressReporter.ts |      40 |        0 |       0 |      40 | 22-123            
  ...antExecutionToolsPromptBuilder.ts |      20 |        0 |       0 |   23.07 | 16-75             
  ...tantExecutionToolsStreamRunner.ts |    7.93 |        0 |       0 |    7.93 | 37-264            
  ...istantExecutionToolsToolRunner.ts |   10.18 |        0 |       0 |   10.47 | 77-135,148-584    
  OpenAiCompatibleExecutionTools.ts    |   30.55 |      100 |     7.4 |   30.55 | ...4,57-66,82-160 
  OpenAiCompatibleModelCatalog.ts      |   19.04 |        0 |    9.09 |   19.04 | 26-35,55-97       
  ...iCompatibleNonChatPromptCaller.ts |    9.48 |        0 |    7.69 |    9.64 | 41,58-378         
  OpenAiCompatibleRequestManager.ts    |   29.09 |       15 |   22.22 |   30.76 | 49-140            
  OpenAiExecutionTools.ts              |   42.85 |      100 |   11.11 |   42.85 | 28-45,57-78       
  OpenAiVectorStoreFileBatchHandler.ts |    4.87 |        0 |       0 |    4.93 | 64-93,106-424     
  OpenAiVectorStoreFileBatchPoller.ts  |    3.35 |        0 |       0 |    3.37 | 71-80,102-739     
  OpenAiVectorStoreHandler.ts          |   19.04 |        0 |       0 |   19.04 | 75-223            
  ...orStoreKnowledgeSourcePreparer.ts |    5.63 |        0 |       0 |    5.71 | 35-247            
  computeOpenAiUsage.ts                |      72 |    57.14 |   66.66 |   73.91 | 39,43,54-56,63    
  ...eOpenAiAssistantExecutionTools.ts |   57.14 |        0 |       0 |   57.14 | 16-20             
  ...OpenAiCompatibleExecutionTools.ts |      36 |        0 |       0 |      36 | 39-63,86-150      
  createOpenAiExecutionTools.ts        |      80 |       40 |     100 |      80 | 18,22             
  openai-models.ts                     |     100 |      100 |     100 |     100 |                   
  register-configuration.ts            |   76.47 |      100 |      50 |   76.47 | 31,55,78,132      
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
 ...ook/src/llm-providers/openai/utils |   17.45 |        0 |       0 |   17.53 |                   
  ...CompatibleChatProgressReporter.ts |    23.8 |        0 |       0 |    23.8 | 30-237            
  OpenAiCompatibleChatPromptBuilder.ts |    6.66 |        0 |       0 |    6.66 | 24-163            
  OpenAiCompatibleChatToolCaller.ts    |   16.98 |        0 |       0 |   16.98 | 51-281            
  ...bleUnsupportedParameterRetrier.ts |   15.15 |        0 |       0 |   15.15 | 31-46,60-137      
  buildToolInvocationScript.ts         |      50 |      100 |       0 |      50 | 17-19             
  callOpenAiCompatibleChatModel.ts     |   19.35 |        0 |       0 |   19.35 | 62-236            
  mapToolsToOpenAi.ts                  |   33.33 |      100 |       0 |      50 | 12                
  uploadFilesToOpenAi.ts               |   16.66 |      100 |       0 |   16.66 | 9-25              
 promptbook/src/llm-providers/remote   |    15.9 |        0 |       0 |    15.9 |                   
  RemoteLlmExecutionTools.ts           |    15.9 |        0 |       0 |    15.9 | 49-164            
 promptbook/src/llm-providers/vercel   |   22.22 |        0 |       0 |   23.07 |                   
  ...ecutionToolsFromVercelProvider.ts |   22.22 |        0 |       0 |   23.07 | 36-188            
 promptbook/src/migrations             |    6.66 |        0 |       0 |    6.66 |                   
  migratePipeline.ts                   |    6.66 |        0 |       0 |    6.66 | 30-72             
 promptbook/src/personas               |   28.57 |        0 |       0 |   28.57 |                   
  preparePersona.ts                    |   28.57 |        0 |       0 |   28.57 | 27-93             
 promptbook/src/pipeline               |   84.84 |    76.47 |   84.21 |   84.37 |                   
  book-notation.ts                     |   83.33 |        0 |     100 |   83.33 | 28,41             
  isValidPipelineString.ts             |      75 |      100 |     100 |      75 | 19-21             
  prompt-notation.ts                   |   89.06 |       92 |   81.25 |   88.52 | 38-45,134-141     
  validatePipelineString.ts            |   73.33 |    42.85 |     100 |   73.33 | 22,24,26,28       
 ...ook/src/pipeline/PipelineInterface |   94.44 |    66.66 |     100 |   94.11 |                   
  constants.ts                         |     100 |      100 |     100 |     100 |                   
  getPipelineInterface.ts              |     100 |      100 |     100 |     100 |                   
  isPipelineImplementingInterface.ts   |     100 |      100 |     100 |     100 |                   
  isPipelineInterfacesEqual.ts         |    87.5 |       50 |     100 |   86.66 | 34,38             
 promptbook/src/pipeline/PipelineJson  |     100 |      100 |     100 |     100 |                   
  Expectations.ts                      |     100 |      100 |     100 |     100 |                   
 ...c/pipeline/prompt-notation/helpers |   79.71 |       80 |   81.81 |   81.53 |                   
  ParameterEscaping.ts                 |   93.33 |    66.66 |     100 |   93.33 | 70                
  ParameterNaming.ts                   |   69.76 |    66.66 |   63.63 |   71.79 | 56-93,158,172     
  ParameterSection.ts                  |     100 |      100 |     100 |     100 |                   
 promptbook/src/postprocessing/utils   |   88.23 |      100 |   66.66 |   88.23 |                   
  extractBlock.ts                      |      50 |      100 |       0 |      50 | 20-22             
  extractJsonBlock.ts                  |     100 |      100 |     100 |     100 |                   
 promptbook/src/prepare                |      50 |    23.07 |   53.33 |   49.46 |                   
  isPipelinePrepared.ts                |   81.81 |    66.66 |     100 |      80 | 19,33             
  preparePipeline.ts                   |   33.33 |        0 |       0 |   34.69 | 41-197            
  prepareTasks.ts                      |   27.77 |        0 |       0 |   27.77 | 43-90             
  unpreparePipeline.ts                 |     100 |      100 |     100 |     100 |                   
 promptbook/src/remote-server          |   40.74 |        0 |       0 |   40.74 |                   
  createRemoteClient.ts                |   26.31 |        0 |       0 |   26.31 | 18-64             
  openapi.ts                           |     100 |      100 |     100 |     100 |                   
  startAgentServer.ts                  |      30 |        0 |       0 |      30 | 32-43             
  startRemoteServer.ts                 |   54.16 |      100 |       0 |   54.16 | 37-60             
 ...mote-server/socket-types/_subtypes |      20 |        0 |       0 |      20 |                   
  identificationToPromptbookToken.ts   |      25 |      100 |       0 |      25 | 15-17             
  promptbookTokenToIdentification.ts   |   16.66 |        0 |       0 |   16.66 | 14-26             
 ...rc/remote-server/startRemoteServer |   23.85 |        0 |       0 |   24.33 |                   
  createRemoteServerExpressApp.ts      |      25 |      100 |       0 |      25 | 10-23             
  createRemoteServerHandle.ts          |    8.33 |        0 |       0 |    8.33 | 14-43             
  createSocketServer.ts                |   66.66 |      100 |       0 |   66.66 | 10                
  ...ecutionToolsFromIdentification.ts |   24.24 |        0 |       0 |   24.24 | 22-109            
  registerBookRoutes.ts                |   11.53 |        0 |       0 |      12 | 13-69             
  registerExecutionRoutes.ts           |   13.95 |        0 |       0 |   13.95 | 16-154            
  registerListModelsSocketHandler.ts   |   33.33 |        0 |       0 |   36.36 | 20-39             
  registerLoginRoute.ts                |      20 |        0 |       0 |      20 | 15-55             
  registerNotFoundRoute.ts             |   33.33 |      100 |       0 |   33.33 | 12-13             
  ...CompatibleChatCompletionsRoute.ts |   14.28 |        0 |       0 |      15 | 13-92             
  registerOpenApiRoutes.ts             |   44.44 |        0 |       0 |   44.44 | 13-36             
  ...erPreparePipelineSocketHandler.ts |   38.46 |        0 |       0 |   41.66 | 21-40             
  registerPromptSocketHandler.ts       |   16.66 |        0 |       0 |   17.24 | 23-101            
  registerRemoteServerHttpRoutes.ts    |   53.33 |      100 |       0 |   53.33 | 16-25             
  ...sterRemoteServerSocketHandlers.ts |   35.71 |        0 |       0 |   35.71 | 17-29             
  registerServerIndexRoute.ts          |      20 |        0 |       0 |   20.83 | 15-116            
  ...StartRemoteServerConfiguration.ts |      50 |        0 |       0 |      50 | 23-32             
  respondToSocketRequest.ts            |   33.33 |      100 |       0 |   33.33 | 16-24             
  startListening.ts                    |   33.33 |        0 |       0 |   33.33 | 14-19             
 promptbook/src/remote-server/ui       |   30.76 |        0 |       0 |   33.33 |                   
  renderServerIndexHtml.ts             |   30.76 |        0 |       0 |   33.33 | 15-120,144        
 promptbook/src/scrapers/_boilerplate  |   49.15 |        0 |       0 |   49.15 |                   
  BoilerplateScraper.ts                |   34.09 |        0 |       0 |   34.09 | 35-161            
  createBoilerplateScraper.ts          |   83.33 |      100 |       0 |   83.33 | 17                
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
  register-metadata.ts                 |     100 |      100 |     100 |     100 |                   
 promptbook/src/scrapers/_common       |   37.83 |       40 |   14.28 |   38.88 |                   
  prepareKnowledgePieces.ts            |   37.83 |       40 |   14.28 |   38.88 | 34-119            
 ...book/src/scrapers/_common/register |    34.4 |     6.81 |    7.14 |   35.16 |                   
  $provideFilesystemForNode.ts         |    90.9 |       75 |     100 |    90.9 | 17                
  $provideScrapersForNode.ts           |      35 |        0 |       0 |      35 | 22-48             
  $provideScriptingForNode.ts          |   53.84 |        0 |       0 |   53.84 | 18-29             
  $registeredScrapersMessage.ts        |    8.88 |        0 |       0 |     9.3 | 24-140            
  $scrapersMetadataRegister.ts         |     100 |      100 |     100 |     100 |                   
  $scrapersRegister.ts                 |     100 |      100 |     100 |     100 |                   
 promptbook/src/scrapers/_common/utils |    45.2 |    17.46 |   23.07 |   44.44 |                   
  getScraperIntermediateSource.ts      |   74.19 |       25 |      50 |   73.33 | 98-109,117-128    
  makeKnowledgeSourceHandler.ts        |   35.64 |     15.9 |      15 |   35.64 | ...47,381,399-415 
  promptbookFetch.ts                   |      50 |        0 |      50 |   46.15 | 19-31             
 promptbook/src/scrapers/document      |   72.88 |       50 |    37.5 |   72.88 |                   
  DocumentScraper.ts                   |    65.9 |       50 |   42.85 |    65.9 | ...00-118,129-157 
  createDocumentScraper.ts             |   83.33 |      100 |       0 |   83.33 | 17                
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
  register-metadata.ts                 |     100 |      100 |     100 |     100 |                   
 ...tbook/src/scrapers/document-legacy |   65.71 |    43.75 |   33.33 |   65.71 |                   
  LegacyDocumentScraper.ts             |   58.18 |    43.75 |    37.5 |   58.18 | ...13-157,168-197 
  createLegacyDocumentScraper.ts       |   83.33 |      100 |       0 |   83.33 | 18                
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
  register-metadata.ts                 |     100 |      100 |     100 |     100 |                   
 promptbook/src/scrapers/markdown      |   87.83 |    35.71 |   71.42 |   87.83 |                   
  MarkdownScraper.ts                   |   86.44 |    35.71 |   83.33 |   86.44 | ...45,151,173-178 
  createMarkdownScraper.ts             |   83.33 |      100 |       0 |   83.33 | 17                
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
  register-metadata.ts                 |     100 |      100 |     100 |     100 |                   
 promptbook/src/scrapers/markitdown    |   45.76 |        0 |       0 |   45.76 |                   
  MarkitdownScraper.ts                 |   29.54 |        0 |       0 |   29.54 | 37-176            
  createMarkitdownScraper.ts           |   83.33 |      100 |       0 |   83.33 | 18                
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
  register-metadata.ts                 |     100 |      100 |     100 |     100 |                   
 promptbook/src/scrapers/pdf           |   63.33 |      100 |       0 |   63.33 |                   
  PdfScraper.ts                        |   33.33 |      100 |       0 |   33.33 | 28-69             
  createPdfScraper.ts                  |   83.33 |      100 |       0 |   83.33 | 18                
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
  register-metadata.ts                 |     100 |      100 |     100 |     100 |                   
 promptbook/src/scrapers/website       |   42.37 |        0 |       0 |    43.1 |                   
  WebsiteScraper.ts                    |      25 |        0 |       0 |   25.58 | 35-170            
  createWebsiteScraper.ts              |   83.33 |      100 |       0 |   83.33 | 18                
  register-constructor.ts              |     100 |      100 |     100 |     100 |                   
  register-metadata.ts                 |     100 |      100 |     100 |     100 |                   
 promptbook/src/scrapers/website/utils |     100 |      100 |     100 |     100 |                   
  createShowdownConverter.ts           |     100 |      100 |     100 |     100 |                   
 promptbook/src/scripting/javascript   |   92.08 |       80 |   55.55 |   94.77 |                   
  JavascriptEvalExecutionTools.ts      |   92.72 |       80 |   66.66 |   94.39 | ...19,233-243,281 
  JavascriptExecutionTools.ts          |     100 |      100 |     100 |     100 |                   
  postprocessing-functions.ts          |   88.88 |      100 |       0 |      96 | 27                
 ...ook/src/scripting/javascript/utils |   76.66 |     37.5 |   33.33 |   75.86 |                   
  extractVariablesFromJavascript.ts    |   76.66 |     37.5 |   33.33 |   75.86 | 28,44,51,62-72    
 promptbook/src/search-engines/serp    |    4.76 |        0 |       0 |       5 |                   
  SerpSearchEngine.ts                  |    4.76 |        0 |       0 |       5 | 14-52             
 promptbook/src/speech-recognition     |   13.46 |    10.15 |   13.63 |   13.65 |                   
  BrowserSpeechRecognition.ts          |    1.92 |        0 |       0 |       2 | 15-116            
  OpenAiSpeechRecognition.ts           |   15.91 |    12.38 |   18.75 |   16.04 | ...07,611,639-651 
 promptbook/src/storage/blackhole      |   22.22 |      100 |       0 |   22.22 |                   
  BlackholeStorage.ts                  |   22.22 |      100 |       0 |   22.22 | 14-50             
 promptbook/src/storage/env-storage    |   25.64 |        0 |       0 |   25.64 |                   
  $EnvStorage.ts                       |   25.64 |        0 |       0 |   25.64 | 22-110            
 ...ook/src/storage/file-cache-storage |   65.85 |     7.69 |      60 |   65.85 |                   
  FileCacheStorage.ts                  |   65.85 |     7.69 |      60 |   65.85 | 34,65,81-121      
 ...c/storage/file-cache-storage/utils |     100 |      100 |     100 |     100 |                   
  nameToSubfolderPath.ts               |     100 |      100 |     100 |     100 |                   
 promptbook/src/storage/memory         |    12.5 |        0 |       0 |    12.5 |                   
  MemoryStorage.ts                     |    12.5 |        0 |       0 |    12.5 | 9-50              
 promptbook/src/storage/utils          |   14.28 |        0 |       0 |   14.28 |                   
  PrefixStorage.ts                     |   14.28 |        0 |       0 |   14.28 | 10-33             
 promptbook/src/transpilers/_common    |   86.07 |    66.66 |   93.33 |   86.09 |                   
  ...teTranspiledTeamRuntimeSection.ts |   95.55 |    73.46 |     100 |   95.45 | 98,109            
  createZodSchemaSource.ts             |   63.04 |    46.34 |   77.77 |   63.63 | ...,92,96,103-113 
  formatUsedToolFunctions.ts           |   92.85 |    74.07 |     100 |   92.85 | 87,105            
  prepareSdkTranspilerContext.ts       |     100 |    80.95 |     100 |     100 | 78-80,93          
  resolveClaudeModelName.ts            |      80 |    66.66 |     100 |      80 | 21                
 ...k/src/transpilers/_common/register |     100 |      100 |     100 |     100 |                   
  $bookTranspilersRegister.ts          |     100 |      100 |     100 |     100 |                   
 promptbook/src/transpilers/agent-os   |      95 |      100 |   92.85 |      95 |                   
  AgentOsTranspiler.ts                 |   94.59 |      100 |   92.85 |   94.59 | 389-390           
  register.ts                          |     100 |      100 |     100 |     100 |                   
 ...anspilers/anthropic-claude-managed |     100 |      100 |     100 |     100 |                   
  AnthropicClaudeManagedTranspiler.ts  |     100 |      100 |     100 |     100 |                   
  register.ts                          |     100 |      100 |     100 |     100 |                   
 ...c/transpilers/anthropic-claude-sdk |     100 |    84.61 |     100 |     100 |                   
  AnthropicClaudeSdkTranspiler.ts      |     100 |    84.61 |     100 |     100 | 152               
  register.ts                          |     100 |      100 |     100 |     100 |                   
 promptbook/src/transpilers/e2b        |    87.5 |        0 |   85.71 |    87.5 |                   
  E2BTranspiler.ts                     |   85.71 |        0 |   85.71 |   85.71 | 171,175,189       
  register.ts                          |     100 |      100 |     100 |     100 |                   
 ...spilers/formatted-book-in-markdown |    23.8 |        0 |       0 |   26.31 |                   
  FormattedBookInMarkdownTranspiler.ts |   11.11 |        0 |       0 |    12.5 | 19-43             
  register.ts                          |     100 |      100 |     100 |     100 |                   
 ...book/src/transpilers/openai-agents |   97.67 |    95.65 |     100 |   97.67 |                   
  OpenAiAgentsTranspiler.ts            |    97.5 |    95.65 |     100 |    97.5 | 330               
  register.ts                          |     100 |      100 |     100 |     100 |                   
 promptbook/src/transpilers/openai-sdk |     100 |    84.61 |     100 |     100 |                   
  OpenAiSdkTranspiler.ts               |     100 |    84.61 |     100 |     100 | 146               
  register.ts                          |     100 |      100 |     100 |     100 |                   
 promptbook/src/types                  |      64 |       50 |      75 |      64 |                   
  ModelVariant.ts                      |     100 |      100 |     100 |     100 |                   
  ScriptLanguage.ts                    |     100 |      100 |     100 |     100 |                   
  SectionType.ts                       |     100 |      100 |     100 |     100 |                   
  TaskType.ts                          |     100 |      100 |     100 |     100 |                   
  ToolCall.ts                          |     100 |      100 |     100 |     100 |                   
  Updatable.ts                         |      40 |       50 |      50 |      40 | 23-36             
 promptbook/src/utils                  |   56.25 |    28.57 |   33.33 |   56.25 |                   
  DEFAULT_THINKING_MESSAGES.ts         |     100 |      100 |     100 |     100 |                   
  clientVersion.ts                     |   45.45 |    23.52 |      20 |   45.45 | ...40,60-63,93-98 
  isTimingSafeEqualString.ts           |   77.77 |       50 |     100 |   77.77 | 32,39             
 ...ok/src/utils/agent-message-runtime |   95.55 |     90.9 |     100 |   95.55 |                   
  agentMessageRuntimePaths.ts          |     100 |      100 |     100 |     100 |                   
  ...lveAgentMessageRuntimeActivity.ts |   93.93 |     90.9 |     100 |   93.93 | 77,82             
 promptbook/src/utils/agents           |   78.57 |     64.7 |   78.94 |   78.31 |                   
  resolveAgentAvatarImageUrl.ts        |   82.35 |    67.39 |     100 |   82.35 | ...58,185,215,234 
  terminalAgentAvatarVisual.ts         |   72.72 |       40 |   63.63 |   71.87 | 190-229,263       
 promptbook/src/utils/ascii-art        |   11.47 |        0 |       0 |   11.86 |                   
  $detectTerminalAnsiColorDepth.ts     |    5.88 |        0 |       0 |    5.88 | 17-44             
  convertImageDataToAsciiArt.ts        |   12.38 |        0 |       0 |   12.87 | 175-395           
 promptbook/src/utils/chat             |   96.55 |        0 |      40 |   95.45 |                   
  chatAttachments.ts                   |     100 |      100 |   14.28 |     100 |                   
  constants.ts                         |     100 |      100 |     100 |     100 |                   
  ...tStreamWhitespaceFromTransport.ts |    87.5 |        0 |     100 |    87.5 | 12                
  escapeRegExp.ts                      |     100 |      100 |     100 |     100 |                   
 ...ook/src/utils/chat/chatAttachments |   88.74 |    76.13 |   92.59 |   89.26 |                   
  appendChatAttachmentContext.ts       |     100 |      100 |     100 |     100 |                   
  ...atAttachmentContextWithContent.ts |    92.3 |      100 |     100 |    92.3 | 35                
  appendChatContextSections.ts         |     100 |    66.66 |     100 |     100 | 15                
  ...atChatAttachmentContentContext.ts |   95.45 |    66.66 |     100 |   95.23 | 74                
  formatChatAttachmentContext.ts       |     100 |      100 |     100 |     100 |                   
  normalizeChatAttachments.ts          |    92.3 |     91.3 |     100 |    92.3 | 41,56,62          
  resolveChatAttachmentContent.ts      |      70 |    68.88 |      60 |   71.79 | ...13,138,157-165 
  resolveChatAttachmentContents.ts     |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/color            |   75.67 |    61.53 |   58.06 |   75.67 |                   
  $randomColor.ts                      |   66.66 |      100 |       0 |   66.66 | 9                 
  Color.ts                             |   73.68 |    56.52 |   68.75 |   73.68 | ...92,201,205,236 
  ColorValue.ts                        |   65.38 |       40 |   41.66 |   65.38 | 58-82,98-106      
  css-colors.ts                        |     100 |      100 |     100 |     100 |                   
  isHexColorString.ts                  |     100 |      100 |     100 |     100 |                   
  parseColorString.ts                  |    90.9 |    77.77 |     100 |    90.9 | 49,51             
 ...ook/src/utils/color/internal-utils |   80.35 |     62.5 |     100 |   78.43 |                   
  checkChannelValue.ts                 |   54.54 |        0 |     100 |   54.54 | 16,19,23,27,31    
  hslToRgb.ts                          |   86.95 |    88.88 |     100 |   83.33 | 25-27             
  rgbToHsl.ts                          |   86.36 |       70 |     100 |   86.36 | 41-42,47          
 promptbook/src/utils/color/operators  |   82.66 |      100 |   72.22 |   82.43 |                   
  darken.ts                            |     100 |      100 |     100 |     100 |                   
  furthest.ts                          |     100 |      100 |     100 |     100 |                   
  grayscale.ts                         |     100 |      100 |     100 |     100 |                   
  lighten.ts                           |     100 |      100 |     100 |     100 |                   
  mixWithColor.ts                      |      25 |      100 |       0 |      25 | 14-19             
  nearest.ts                           |     100 |      100 |     100 |     100 |                   
  negative.ts                          |     100 |      100 |     100 |     100 |                   
  negativeLightness.ts                 |   44.44 |      100 |       0 |   44.44 | 11-18             
  saturate.ts                          |     100 |      100 |     100 |     100 |                   
  withAlpha.ts                         |      50 |      100 |       0 |      50 | 12-13             
 promptbook/src/utils/color/parsers    |   40.24 |    17.07 |      60 |   40.24 |                   
  parseHexColor.ts                     |      75 |       50 |      75 |      75 | 24,45,53,58,71,76 
  parseHslColor.ts                     |    5.71 |        0 |       0 |    5.71 | 18-69             
  parseRgbColor.ts                     |   56.52 |       20 |      75 |   56.52 | ...62-63,74-75,83 
 promptbook/src/utils/color/utils      |   64.19 |    64.28 |    37.5 |   67.53 |                   
  areColorsEqual.ts                    |      50 |        0 |       0 |      50 | 13                
  colorDistance.ts                     |      55 |      100 |      50 |      55 | 14-23             
  colorHue.ts                          |     100 |      100 |     100 |     100 |                   
  colorHueDistance.ts                  |     100 |      100 |     100 |     100 |                   
  colorLuminance.ts                    |   33.33 |      100 |       0 |   33.33 | 11-12             
  colorSatulightion.ts                 |      75 |      100 |       0 |      75 | 16                
  colorSaturation.ts                   |    12.5 |        0 |       0 |    12.5 | 11-18             
  colorToDataUrl.ts                    |     100 |      100 |     100 |     100 |                   
  mixColors.ts                         |   18.18 |      100 |       0 |   28.57 | 13-17             
 ...tils/editable/edit-pipeline-string |     100 |    96.15 |     100 |     100 |                   
  addPipelineCommand.ts                |     100 |    85.71 |     100 |     100 | 42                
  deflatePipeline.ts                   |     100 |      100 |     100 |     100 |                   
  removePipelineCommand.ts             |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/editable/utils   |   80.43 |    91.66 |      80 |   81.81 |                   
  isFlatPipeline.ts                    |     100 |      100 |     100 |     100 |                   
  renamePipelineParameter.ts           |     100 |      100 |     100 |     100 |                   
  stringifyPipelineJson.ts             |      40 |        0 |       0 |   42.85 | 17-42             
 promptbook/src/utils/environment      |   79.16 |    76.92 |   83.33 |   79.16 |                   
  $detectRuntimeEnvironment.ts         |   83.33 |      100 |       0 |   83.33 | 14                
  $getGlobalScope.ts                   |     100 |      100 |     100 |     100 |                   
  $isRunningInBrowser.ts               |      75 |       50 |     100 |      75 | 12                
  $isRunningInJest.ts                  |      75 |    83.33 |     100 |      75 | 12                
  $isRunningInNode.ts                  |      75 |      100 |     100 |      75 | 12                
  $isRunningInWebWorker.ts             |      75 |       50 |     100 |      75 | 17                
 promptbook/src/utils/execCommand      |   73.49 |    61.22 |   66.66 |   73.49 |                   
  $execCommand.ts                      |   61.11 |    26.08 |   55.55 |   61.11 | ...03,114,117-129 
  $execCommandNormalizeOptions.ts      |   96.55 |     92.3 |     100 |   96.55 | 72                
 ...ook/src/utils/expectation-counters |     100 |      100 |     100 |     100 |                   
  constants.ts                         |     100 |      100 |     100 |     100 |                   
  countCharacters.ts                   |     100 |      100 |     100 |     100 |                   
  countLines.ts                        |     100 |      100 |     100 |     100 |                   
  countPages.ts                        |     100 |      100 |     100 |     100 |                   
  countParagraphs.ts                   |     100 |      100 |     100 |     100 |                   
  countSentences.ts                    |     100 |      100 |     100 |     100 |                   
  countWords.ts                        |     100 |      100 |     100 |     100 |                   
  index.ts                             |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/files            |   83.51 |    68.02 |   90.38 |   83.21 |                   
  decodeAttachmentAsText.ts            |   80.09 |    67.42 |   93.54 |   79.79 | ...25-727,789,839 
  extensionToMimeType.ts               |     100 |      100 |     100 |     100 |                   
  getFileExtension.ts                  |     100 |      100 |     100 |     100 |                   
  isDirectoryExisting.ts               |      90 |      100 |      80 |      90 | 22                
  isExecutable.ts                      |     100 |      100 |     100 |     100 |                   
  isFileExisting.ts                    |      90 |      100 |      80 |      90 | 22                
  listAllFiles.ts                      |   93.75 |       50 |     100 |   92.85 | 21                
  mimeTypeToExtension.ts               |     100 |      100 |     100 |     100 |                   
  readResponseBytes.ts                 |   89.28 |    58.33 |      50 |   89.28 | 25-26,43          
 promptbook/src/utils/filesystem       |     100 |      100 |     100 |     100 |                   
  promptbookTemporaryPath.ts           |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/knowledge        |   87.05 |    71.23 |     100 |   86.86 |                   
  inlineKnowledgeSource.ts             |   88.13 |     62.5 |     100 |   87.93 | ...31,145,158,175 
  simplifyKnowledgeLabel.ts            |   86.25 |    73.68 |     100 |   86.07 | ...56,193-194,262 
 promptbook/src/utils/language         |   71.79 |    46.66 |     100 |   71.79 |                   
  ...erredSpeechRecognitionLanguage.ts |   71.79 |    46.66 |     100 |   71.79 | ...88,100,105,113 
 promptbook/src/utils/linguistic-hash  |   98.63 |    85.71 |   55.55 |   98.61 |                   
  LinguisticHashLanguage.ts            |   94.11 |    66.66 |     100 |   94.11 | 74                
  linguisticHash.ts                    |     100 |      100 |    12.5 |     100 |                   
  linguisticHashWordCount.ts           |     100 |      100 |      50 |     100 |                   
  linguisticHashWordSelection.ts       |     100 |      100 |     100 |     100 |                   
  linguisticHashWords.cs.ts            |     100 |      100 |     100 |     100 |                   
  linguisticHashWords.en.ts            |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/markdown         |   98.03 |    93.15 |   94.73 |   97.99 |                   
  addAutoGeneratedSection.ts           |      85 |      100 |      75 |      85 | 58-63             
  createMarkdownChart.ts               |     100 |      100 |     100 |     100 |                   
  createMarkdownTable.ts               |     100 |      100 |     100 |     100 |                   
  escapeMarkdownBlock.ts               |     100 |      100 |     100 |     100 |                   
  extractAllBlocksFromMarkdown.ts      |     100 |     92.3 |     100 |     100 | 79,98             
  extractAllListItemsFromMarkdown.ts   |     100 |      100 |     100 |     100 |                   
  extractOneBlockFromMarkdown.ts       |     100 |      100 |     100 |     100 |                   
  flattenMarkdown.ts                   |     100 |      100 |     100 |     100 |                   
  humanizeAiText.ts                    |     100 |      100 |     100 |     100 |                   
  humanizeAiTextEllipsis.ts            |     100 |      100 |     100 |     100 |                   
  humanizeAiTextEmdashed.ts            |     100 |      100 |     100 |     100 |                   
  humanizeAiTextQuotes.ts              |     100 |      100 |     100 |     100 |                   
  humanizeAiTextSources.ts             |     100 |      100 |     100 |     100 |                   
  humanizeAiTextWhitespace.ts          |     100 |      100 |     100 |     100 |                   
  parseMarkdownSection.ts              |   91.66 |       75 |     100 |   91.66 | 51                
  prettifyMarkdown.ts                  |      75 |      100 |      50 |      75 | 26                
  promptbookifyAiText.ts               |     100 |      100 |     100 |     100 |                   
  removeMarkdownComments.ts            |     100 |      100 |     100 |     100 |                   
  removeMarkdownFormatting.ts          |     100 |      100 |     100 |     100 |                   
  removeMarkdownLinks.ts               |     100 |      100 |     100 |     100 |                   
  splitMarkdownIntoSections.ts         |     100 |      100 |     100 |     100 |                   
  trimCodeBlock.ts                     |     100 |      100 |     100 |     100 |                   
  trimEndOfCodeBlock.ts                |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/misc             |   77.58 |    65.78 |      50 |   78.94 |                   
  $Register.ts                         |   72.41 |    44.44 |   66.66 |   72.41 | ...78,82-85,93-96 
  $getCurrentDate.ts                   |     100 |      100 |     100 |     100 |                   
  aboutPromptbookInformation.ts        |      60 |    16.66 |      20 |      60 | 58-70,74-93       
  arrayableToArray.ts                  |     100 |      100 |     100 |     100 |                   
  computeHash.ts                       |     100 |      100 |     100 |     100 |                   
  debounce.ts                          |   14.28 |        0 |       0 |      20 | 9-12              
  parseNumber.ts                       |   95.12 |       90 |     100 |   95.12 | 27,89             
 promptbook/src/utils/normalization    |   98.72 |    94.11 |     100 |   98.69 |                   
  DIACRITIC_VARIANTS_LETTERS.ts        |     100 |      100 |     100 |     100 |                   
  capitalize.ts                        |     100 |      100 |     100 |     100 |                   
  constructImageFilename.ts            |     100 |      100 |     100 |     100 |                   
  decapitalize.ts                      |     100 |      100 |     100 |     100 |                   
  isValidKeyword.ts                    |     100 |      100 |     100 |     100 |                   
  nameToUriPart.ts                     |     100 |      100 |     100 |     100 |                   
  nameToUriParts.ts                    |     100 |      100 |     100 |     100 |                   
  normalize-to-kebab-case.ts           |     100 |      100 |     100 |     100 |                   
  normalizeMessageText.ts              |     100 |      100 |     100 |     100 |                   
  normalizeTo_PascalCase.ts            |     100 |      100 |     100 |     100 |                   
  normalizeTo_SCREAMING_CASE.ts        |     100 |      100 |     100 |     100 |                   
  normalizeTo_camelCase.ts             |     100 |      100 |     100 |     100 |                   
  normalizeTo_snake_case.ts            |     100 |      100 |     100 |     100 |                   
  normalizeWhitespaces.ts              |     100 |      100 |     100 |     100 |                   
  orderJson.ts                         |     100 |       50 |     100 |     100 | 30                
  parseKeywords.ts                     |     100 |      100 |     100 |     100 |                   
  parseKeywordsFromString.ts           |     100 |      100 |     100 |     100 |                   
  removeDiacritics.ts                  |     100 |      100 |     100 |     100 |                   
  removeEmojis.ts                      |     100 |      100 |     100 |     100 |                   
  removeQuotes.ts                      |     100 |      100 |     100 |     100 |                   
  searchKeywords.ts                    |     100 |      100 |     100 |     100 |                   
  suffixUrl.ts                         |     100 |       50 |     100 |     100 | 9                 
  titleToName.ts                       |     100 |      100 |     100 |     100 |                   
  unwrapResult.ts                      |    92.5 |    83.87 |     100 |    92.5 | 80,113,117        
 promptbook/src/utils/organization     |    91.3 |        0 |   85.71 |    91.3 |                   
  $sideEffect.ts                       |     100 |      100 |     100 |     100 |                   
  TODO_USE.ts                          |     100 |      100 |     100 |     100 |                   
  just.ts                              |      75 |        0 |     100 |      75 | 19                
  keepTypeImported.ts                  |     100 |      100 |     100 |     100 |                   
  keepUnused.ts                        |     100 |      100 |     100 |     100 |                   
  preserve.ts                          |      80 |      100 |      50 |      80 | 31                
  spaceTrim.ts                         |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/parameters       |   85.71 |    75.47 |     100 |   85.47 |                   
  extractParameterNames.ts             |     100 |      100 |     100 |     100 |                   
  mapAvailableToExpectedParameters.ts  |     100 |      100 |     100 |     100 |                   
  numberToString.ts                    |   76.47 |     62.5 |     100 |      75 | 13,15,17,29       
  templateParameters.ts                |   84.61 |     64.7 |     100 |   84.61 | 31,34,47,55,59,69 
  valueToString.ts                     |      72 |    73.33 |     100 |      72 | 34,39-50          
 promptbook/src/utils/random           |   55.26 |     8.57 |    37.5 |   53.63 |                   
  $generateBookBoilerplate.ts          |      25 |        0 |       0 |      25 | 45-86             
  $randomAgentPersona.ts               |      50 |        0 |       0 |      50 | 48-50             
  $randomAgentRule.ts                  |      50 |        0 |       0 |      50 | 35-37             
  $randomBase58.ts                     |     100 |      100 |     100 |     100 |                   
  $randomItem.ts                       |      25 |        0 |       0 |      25 | 7-10              
  $randomToken.ts                      |     100 |      100 |     100 |     100 |                   
  CzechNamePool.ts                     |      50 |        0 |      50 |   46.15 | 44-52,205-220     
  EnglishNamePool.ts                   |   83.33 |       50 |   66.66 |   83.33 | 100-103           
  getNamePool.ts                       |   42.85 |        0 |       0 |   42.85 | 14-21             
 promptbook/src/utils/serialization    |   92.85 |    87.34 |    93.1 |   92.61 |                   
  $deepFreeze.ts                       |     100 |      100 |     100 |     100 |                   
  asSerializable.ts                    |   91.66 |    88.88 |     100 |   91.66 | 21                
  checkSerializableAsJson.ts           |   94.11 |     86.2 |    92.3 |      94 | 222-226           
  clonePipeline.ts                     |   33.33 |      100 |       0 |   33.33 | 30-32             
  deepClone.ts                         |     100 |      100 |     100 |     100 |                   
  exportJson.ts                        |     100 |      100 |     100 |     100 |                   
  isSerializableAsJson.ts              |     100 |      100 |     100 |     100 |                   
  jsonStringsToJsons.ts                |     100 |      100 |     100 |     100 |                   
  serializeToPromptbookJavascript.ts   |   88.63 |    82.14 |     100 |    87.8 | 42,50-51,76,80    
 promptbook/src/utils/sets             |     100 |      100 |     100 |     100 |                   
  difference.ts                        |     100 |      100 |     100 |     100 |                   
  intersection.ts                      |     100 |      100 |     100 |     100 |                   
  union.ts                             |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/take             |      90 |       80 |     100 |      90 |                   
  take.ts                              |      90 |       80 |     100 |      90 | 26                
 promptbook/src/utils/take/classes     |     100 |      100 |     100 |     100 |                   
  TakeChain.ts                         |     100 |      100 |     100 |     100 |                   
 promptbook/src/utils/toolCalls        |   48.86 |    28.57 |   41.66 |   48.27 |                   
  getToolCallIdentity.ts               |      50 |      100 |       0 |      50 | 13-14             
  mergeToolCalls.ts                    |   39.34 |    20.37 |      25 |   38.33 | 24,41-51,67-178   
  resolveToolCallIdempotencyKey.ts     |   73.91 |    56.25 |     100 |   73.91 | 18,31,38,61-64    
 promptbook/src/utils/validators/email |   83.33 |       50 |     100 |   83.33 |                   
  isValidEmail.ts                      |   83.33 |       50 |     100 |   83.33 | 11                
 ...book/src/utils/validators/filePath |      96 |    92.85 |     100 |      96 |                   
  isRootPath.ts                        |     100 |      100 |     100 |     100 |                   
  isValidFilePath.ts                   |   94.73 |    91.66 |     100 |   94.73 | 13                
 ...rc/utils/validators/javascriptName |      75 |        0 |     100 |      75 |                   
  isValidJavascriptName.ts             |      75 |        0 |     100 |      75 | 14                
 ...src/utils/validators/parameterName |   90.62 |    82.35 |     100 |   90.62 |                   
  validateParameterName.ts             |   90.62 |    82.35 |     100 |   90.62 | 52,56,84          
 ...c/utils/validators/semanticVersion |    92.3 |    83.33 |     100 |    92.3 |                   
  isValidPromptbookVersion.ts          |     100 |      100 |     100 |     100 |                   
  isValidSemanticVersion.ts            |   83.33 |       50 |     100 |   83.33 | 15                
 promptbook/src/utils/validators/url   |   91.26 |    72.54 |     100 |   91.17 |                   
  extractUrlsFromText.ts               |   91.66 |       50 |     100 |   91.66 | 27,42,46,69       
  isHostnameOnPrivateNetwork.ts        |      80 |    80.95 |     100 |   77.77 | 43-44             
  isUrlOnPrivateNetwork.ts             |     100 |      100 |     100 |     100 |                   
  isValidAgentUrl.ts                   |   77.77 |       40 |     100 |   77.77 | 26,31             
  isValidPipelineUrl.ts                |   88.88 |       60 |     100 |   88.88 | 21                
  isValidUrl.ts                        |     100 |      100 |     100 |     100 |                   
  normalizeDomainForMatching.ts        |     100 |    85.71 |     100 |     100 | 23                
 promptbook/src/utils/validators/uuid  |      75 |        0 |     100 |      75 |                   
  isValidUuid.ts                       |      75 |        0 |     100 |      75 | 13                
 promptbook/src/wizard                 |    27.1 |        0 |      10 |   27.88 |                   
  $getCompiledBook.ts                  |   22.05 |        0 |       0 |   23.07 | 33-198            
  wizard.ts                            |   35.89 |        0 |      25 |   35.89 | 67-98,111-162     
---------------------------------------|---------|----------|---------|---------|-------------------

Summary of all failing tests
 FAIL  scripts/run-agent-messages/main/runMultipleAgentMessages.test.ts (6.743 s)
  ● runMultipleAgentMessages › runs one queued message from a direct child repository and restores the root working directory afterwards

    expect(received).toBe(expected) // Object.is equality

    Expected: "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-4DFVP5"
    Received: "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-4DFVP5"

      133 |         expect(tickAgentMessages).toHaveBeenCalledTimes(1);
      134 |         expect(synchronizeGithubAgentRunnerRepositories).not.toHaveBeenCalled();
    > 135 |         expect(process.cwd()).toBe(temporaryRootDirectory);
          |                               ^
      136 |         expect((tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls[0]?.[0]).toEqual(
      137 |             expect.objectContaining({
      138 |                 agentName: 'github-copilot',

      at Object.<anonymous> (scripts/run-agent-messages/main/runMultipleAgentMessages.test.ts:135:31)

  ● runMultipleAgentMessages › runs one queued message per direct child repository in parallel within one watch iteration

    expect(received).toEqual(expected) // deep equality

    - Expected  - 2
    + Received  + 2

      Array [
    -   "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-NmoAha/agent-a",
    -   "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-NmoAha/agent-b",
    +   "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-NmoAha/agent-a",
    +   "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-NmoAha/agent-b",
      ]

      176 |                 (call) => call[1]?.projectPath,
      177 |             ),
    > 178 |         ).toEqual([join(temporaryRootDirectory, 'agent-a'), join(temporaryRootDirectory, 'agent-b')]);
          |           ^
      179 |     });
      180 |
      181 |     it('starts another same-project queued message before the previous harness finishes when parallelism allows it', async () => {

      at Object.<anonymous> (scripts/run-agent-messages/main/runMultipleAgentMessages.test.ts:178:11)

  ● runMultipleAgentMessages › ignores local repositories by agent name, normalized agent name, and agent id

    expect(received).toEqual(expected) // deep equality

    - Expected  -  2
    + Received  + 10

    - ObjectContaining {
    -   "projectPath": "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-A2eAkW/agent-active",
    + Object {
    +   "isQuietWhenIdle": true,
    +   "projectPath": "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-A2eAkW/agent-active",
    +   "queuedMessage": Object {
    +     "absolutePath": "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-A2eAkW/agent-active/messages/queued/question.book",
    +     "fileName": "question.book",
    +     "relativePath": "messages/queued/question.book",
    +   },
    +   "uiHandle": undefined,
    +   "uiPresentation": undefined,
      }

      270 |
      271 |         expect(tickAgentMessages).toHaveBeenCalledTimes(1);
    > 272 |         expect((tickAgentMessages as jest.MockedFunction<typeof tickAgentMessages>).mock.calls[0]?.[1]).toEqual(
          |                                                                                                         ^
      273 |             expect.objectContaining({
      274 |                 projectPath: join(temporaryRootDirectory, 'agent-active'),
      275 |             }),

      at Object.<anonymous> (scripts/run-agent-messages/main/runMultipleAgentMessages.test.ts:272:105)

  ● runMultipleAgentMessages › keeps synchronizing GitHub while waiting for the first local agent repository and starts watching the cloned repository

    expect(received).toBe(expected) // Object.is equality

    Expected: "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-9ZIDzd"
    Received: "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-9ZIDzd"

      317 |         expect(synchronizeGithubAgentRunnerRepositories).toHaveBeenCalledTimes(2);
      318 |         expect(tickAgentMessages).toHaveBeenCalledTimes(1);
    > 319 |         expect(process.cwd()).toBe(temporaryRootDirectory);
          |                               ^
      320 |     });
      321 |
      322 |     it('periodically pulls watched child repositories and then processes newly queued work without pulling twice', async () => {

      at Object.<anonymous> (scripts/run-agent-messages/main/runMultipleAgentMessages.test.ts:319:31)

  ● runMultipleAgentMessages › periodically pulls watched child repositories and then processes newly queued work without pulling twice

    expect(received).toEqual(expected) // deep equality

    - Expected  - 2
    + Received  + 2

      Array [
    -   "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-a2sKFY/agent-a",
    -   "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-a2sKFY/agent-b",
    +   "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-a2sKFY/agent-a",
    +   "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-multiple-run-a2sKFY/agent-b",
      ]

      352 |         });
      353 |
    > 354 |         expect(pulledProjectPaths.sort()).toEqual([
          |                                           ^
      355 |             join(temporaryRootDirectory, 'agent-a'),
      356 |             join(temporaryRootDirectory, 'agent-b'),
      357 |         ]);

      at Object.<anonymous> (scripts/run-agent-messages/main/runMultipleAgentMessages.test.ts:354:43)

 FAIL  src/scrapers/document-legacy/LegacyDocumentScraper.test.ts
  ● how creating knowledge from docx works › should scrape simple information from a (legacy) .doc file

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: /bin/sh: /Contents/MacOS/LibreOffice: No such file or directory]

      46 |         mockMarkdownScrapingToReturnConvertedContent();
      47 |
    > 48 |         return expect(
         |                      ^
      49 |             Promise.all([
      50 |                 legacyDocumentScraperPromise,
      51 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document-legacy/LegacyDocumentScraper.test.ts:48:22)

  ● how creating knowledge from docx works › should scrape simple information from a .rtf file

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: /bin/sh: /Contents/MacOS/LibreOffice: No such file or directory]

      70 |         mockMarkdownScrapingToReturnConvertedContent();
      71 |
    > 72 |         return expect(
         |                      ^
      73 |             Promise.all([
      74 |                 legacyDocumentScraperPromise,
      75 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document-legacy/LegacyDocumentScraper.test.ts:72:22)

  ● how creating knowledge from docx works › should NOT scrape irrelevant information

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: /bin/sh: /Contents/MacOS/LibreOffice: No such file or directory]

      94 |         mockMarkdownScrapingToReturnConvertedContent();
      95 |
    > 96 |         return expect(
         |                      ^
      97 |             Promise.all([
      98 |                 legacyDocumentScraperPromise,
      99 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document-legacy/LegacyDocumentScraper.test.ts:96:22)

 FAIL  src/scrapers/document/DocumentScraper.test.ts
  ● how creating knowledge from docx works › should scrape simple information from a .docx file

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: /bin/sh: /Contents/MacOS/Pandoc: No such file or directory]

      46 |         mockMarkdownScrapingToReturnConvertedContent();
      47 |
    > 48 |         return expect(
         |                      ^
      49 |             Promise.all([
      50 |                 documentScraperPromise,
      51 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document/DocumentScraper.test.ts:48:22)

  ● how creating knowledge from docx works › should scrape simple information from a .odt file

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: /bin/sh: /Contents/MacOS/Pandoc: No such file or directory]

      70 |         mockMarkdownScrapingToReturnConvertedContent();
      71 |
    > 72 |         return expect(
         |                      ^
      73 |             Promise.all([
      74 |                 documentScraperPromise,
      75 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document/DocumentScraper.test.ts:72:22)

  ● how creating knowledge from docx works › should NOT scrape irrelevant information

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: /bin/sh: /Contents/MacOS/Pandoc: No such file or directory]

      94 |         mockMarkdownScrapingToReturnConvertedContent();
      95 |
    > 96 |         return expect(
         |                      ^
      97 |             Promise.all([
      98 |                 documentScraperPromise,
      99 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document/DocumentScraper.test.ts:96:22)

 FAIL  scripts/repair-imports/utils/repairImportUtils.test.ts
  ● resolveImportEntity › prefers the entity exported from the currently imported module when names are duplicated elsewhere

    expect(received).toEqual(expected) // deep equality

    Expected: ObjectContaining {"filename": "C:\\repo\\scripts\\run-agent-messages\\main\\runAgentMessages.ts"}
    Received: undefined

      60 |                 ],
      61 |             }),
    > 62 |         ).toEqual(
         |           ^
      63 |             expect.objectContaining({
      64 |                 filename: 'C:\\repo\\scripts\\run-agent-messages\\main\\runAgentMessages.ts',
      65 |             }),

      at Object.<anonymous> (scripts/repair-imports/utils/repairImportUtils.test.ts:62:11)

  ● resolveImportEntity › prefers entities from src when a src barrel import collides with a script export of the same name

    expect(received).toEqual(expected) // deep equality

    Expected: ObjectContaining {"filename": "C:\\repo\\src\\version.ts"}
    Received: undefined

       98 |                 ],
       99 |             }),
    > 100 |         ).toEqual(
          |           ^
      101 |             expect.objectContaining({
      102 |                 filename: 'C:\\repo\\src\\version.ts',
      103 |             }),

      at Object.<anonymous> (scripts/repair-imports/utils/repairImportUtils.test.ts:100:11)

 FAIL  scripts/run-agent-messages/main/tickAgentMessages.test.ts
  ● tickAgentMessages › delegates pre-message auto-pull through the shared helper

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    - Expected
    + Received

      Object {
        "logMessage": "Pulling latest changes before answering the next message...",
    -   "projectPath": "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-hJIald",
    -   "runOptions": ObjectContaining {
    +   "projectPath": "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-hJIald",
    +   "runOptions": Object {
    +     "agentName": "github-copilot",
    +     "allowCredits": false,
    +     "autoClone": false,
          "autoPull": true,
    +     "autoPush": false,
    +     "ignoreGitChanges": false,
    +     "model": "gpt-5.4",
    +     "noCommit": false,
    +     "noUi": true,
    +     "normalizeLineEndings": false,
    +     "thinkingLevel": undefined,
        },
      },

    Number of calls: 1

      184 |
      185 |         expect(result.autoPullTimestamp).toBe(123_456);
    > 186 |         expect(pullLatestChangesForAgentQueueIfEnabled).toHaveBeenCalledWith({
          |                                                         ^
      187 |             projectPath: temporaryProjectPath,
      188 |             runOptions: expect.objectContaining({ autoPull: true }),
      189 |             logMessage: 'Pulling latest changes before answering the next message...',

      at Object.<anonymous> (scripts/run-agent-messages/main/tickAgentMessages.test.ts:186:57)

  ● tickAgentMessages › answers one queued message, moves it to finished, and commits only that message

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    - Expected
    + Received

      "Answering message question.book",
    @@ -2,7 +2,7 @@
        "autoPush": true,
        "includePaths": Array [
          "messages/finished/question.book",
          "messages/finished/question.book.report.json",
        ],
    -   "projectPath": "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-eoxzts",
    +   "projectPath": "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-eoxzts",
      },

    Number of calls: 1

      250 |             usage: UNCERTAIN_USAGE,
      251 |         });
    > 252 |         expect(commitChanges).toHaveBeenCalledWith('Answering message question.book', {
          |                               ^
      253 |             autoPush: true,
      254 |             includePaths: ['messages/finished/question.book', 'messages/finished/question.book.report.json'],
      255 |             projectPath: temporaryProjectPath,

      at Object.<anonymous> (scripts/run-agent-messages/main/tickAgentMessages.test.ts:252:31)

  ● tickAgentMessages › includes the queued source path in the commit when the original message was tracked

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    - Expected
    + Received

      "Answering message tracked.book",
    @@ -3,7 +3,7 @@
        "includePaths": Array [
          "messages/queued/tracked.book",
          "messages/finished/tracked.book",
          "messages/finished/tracked.book.report.json",
        ],
    -   "projectPath": "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-cCMGkH",
    +   "projectPath": "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/ptbk-agent-cCMGkH",
      },

    Number of calls: 1

      317 |         await tickAgentMessages(createAgentRunOptions());
      318 |
    > 319 |         expect(commitChanges).toHaveBeenCalledWith('Answering message tracked.book', {
          |                               ^
      320 |             autoPush: false,
      321 |             includePaths: [
      322 |                 'messages/queued/tracked.book',

      at Object.<anonymous> (scripts/run-agent-messages/main/tickAgentMessages.test.ts:319:31)

 FAIL  scripts/run-codex-prompts/ui/buildCoderRunUiFrame.test.ts
  ● buildCoderRunUiFrame › renders the active temporary shell script as a clickable Session link

    expect(received).toContain(expected) // indexOf

    Expected substring: "Script   .promptbook/coder-prompts/feature.sh"
    Received string:    "                               ▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄  ▄▄ ▄▄   ▄▄  ▄▄▄·
                                   ██▄█▀  ██   ██▄██ ██▄█▀   ██ ██▀██
                                   ██     ██   ██▄█▀ ██ ██ ▄ ██ ▀███▀·
    ┌ Session ─────────────────────────────────────────────────────────────────────────────────────┐
    │ State     WAITING  Ready to start the first task                                             │
    │ Runner   GitHub Copilot  ·  gpt-5.4  ·  thinking xhigh                                       │
    │ Context  AGENTS.md                                                                           │
    │ Server   http://localhost:4441                                                               │
    │ Test     npm test                                                                            │
    │ Script   /Users/hejny/work/promptbook/.promptbook/coder-prompts/feature.sh                   │
    │ This run Task 3/5  ·  2 done  ·  3 left                                                      │
    │ Backlog  Repo 18 total  ·  12 prompts outside priority scope                                 │
    │ Scope    Priority ≥1  ·  Write 1 prompt first                                                │
    │ Timing   Elapsed 2m  ·  Total 8m  ·  ETA Today 9:45                                          │
    │ Progress ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25% complete (2/5 done) │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘
    ┌ Current task ────────────────────────────────────────────────────────────────────────────────┐
    │ prompts/001-task.md > Refresh the coder UI                                                   │
    │ Attempt 1/3  ·  Ready to start the first task                                                │
    │ • Improve the boxed layout and stop duplicated tail prompts.                                 │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘
    ┌ Live output ─────────────────────────────────────────────────────────────────────────────────┐
    │ › assistant: Drafting an improved terminal frame                                             │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘
    ┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
    │  ENTER  Start   P  Pause   S  Skip current waiting   X  End with this prompt   CTRL+C  Exit  │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘"

      234 |         const output = lines.map(stripAnsi).join('\n');
      235 |
    > 236 |         expect(output).toContain('Script   .promptbook/coder-prompts/feature.sh');
          |                        ^
      237 |         expect(lines.join('\n')).toContain('file:///');
      238 |     });
      239 |

      at Object.<anonymous> (scripts/run-codex-prompts/ui/buildCoderRunUiFrame.test.ts:236:24)

 FAIL  src/cli/cli-commands/agents-server/buildAgentsServer.test.ts
  ● Agents Server build cache › materializes packaged app sources outside node_modules for Next builds

    expect(received).toBe(expected) // Object.is equality

    Expected: "/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/promptbook-agents-server-packaged-aQTIQD/.promptbook/agents-server/runtime/apps/agents-server"
    Received: "/private/var/folders/t2/98zdc_ms40sfp5j2518g191h0000gn/T/promptbook-agents-server-packaged-aQTIQD/.promptbook/agents-server/runtime/apps/agents-server"

      178 |         const nodeModulesLinkStats = await lstat(join(materializedRuntimeRootPath, 'node_modules'));
      179 |
    > 180 |         expect(materializedAppPath).toBe(join(materializedRuntimeRootPath, 'apps', 'agents-server'));
          |                                     ^
      181 |         expect(nodeModulesLinkStats.isSymbolicLink() || nodeModulesLinkStats.isDirectory()).toBe(true);
      182 |     });
      183 |

      at Object.<anonymous> (src/cli/cli-commands/agents-server/buildAgentsServer.test.ts:180:37)

 FAIL  scripts/run-codex-prompts/git/commitChanges.test.ts
  ● commitChanges › unstages excluded temporary files before creating the commit

    expect(received).toBeGreaterThan(expected)

    Expected: > 0
    Received:   -1

      123 |
      124 |         expect(gitAddIndex).toBeGreaterThanOrEqual(0);
    > 125 |         expect(gitResetIndex).toBeGreaterThan(gitAddIndex);
          |                               ^
      126 |         expect(gitCommitIndex).toBeGreaterThan(gitResetIndex);
      127 |     });
      128 |

      at Object.<anonymous> (scripts/run-codex-prompts/git/commitChanges.test.ts:125:31)

 FAIL  src/executables/browsers/locateEdge.test.ts
  ● locating the Edge browser › should locate Edge browser

    Edge is not available on macOS.

      56 |             return locateAppOnMacOs({ macOsName });
      57 |         } else {
    > 58 |             throw new Error(`${appName} is not available on macOS.`);
         |                   ^
      59 |         }
      60 |     } else {
      61 |         if (linuxWhich) {

      at locateApp (src/executables/locateApp.ts:58:19)
      at locateEdge (src/executables/browsers/locateEdge.ts:10:21)
      at Object.<anonymous> (src/executables/browsers/locateEdge.test.ts:9:36)

 FAIL  scripts/run-agent-messages/ui/buildAgentRunUiFrame.test.ts
  ● buildAgentRunUiFrame › renders active temporary shell scripts in the Session box

    expect(received).toContain(expected) // indexOf

    Expected substring: "Script   agent-a/.promptbook/agent-messages/question.sh"
    Received string:    "                                  ╭──────────────────────────╮
                                      │ GitHub Copilot Support   │
                                      ╰──────────────────────────╯·
    ┌ Session ─────────────────────────────────────────────────────────────────────────────────────┐
    │ State     RUNNING  Running                                                                   │
    │ Agent    GitHub Copilot Support                                                              │
    │ Runner   github-copilot  ·  gpt-5.4  ·  thinking high                                        │
    │ Script   /Users/hejny/work/promptbook/agent-a/.promptbook/agent-messages/question.sh         │
    │ Status   0 idle  ·  1 answering                                                              │
    │ Messages 3 answered total  ·  2 waiting                                                      │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘
    ┌ Agents ──────────────────────────────────────────────────────────────────────────────────────┐
    │ Status      Agent name                                         URL                           │
    │ ──────────────────────────────────────────────────────────────────                           │
    │ Answering   GitHub Copilot Support                             .                             │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘
    ┌ Current task ────────────────────────────────────────────────────────────────────────────────┐
    │ ⠋ messages/queued/message-0008.book                                                          │
    │ Attempt 1/3  ·  Running                                                                      │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘
    ┌ User message ────────────────────────────────────────────────────────────────────────────────┐
    │ Please summarize the latest PR feedback.                                                     │
    │ Keep the answer concise and mention blockers.                                                │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘
    ┌ Live output ─────────────────────────────────────────────────────────────────────────────────┐
    │ › assistant: Reviewing the queued message                                                    │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    │                                                                                              │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘
    ┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
    │  P  Pause   CTRL+C  Exit                                                                     │
    └──────────────────────────────────────────────────────────────────────────────────────────────┘"

      200 |         const output = lines.map(stripAnsi).join('\n');
      201 |
    > 202 |         expect(output).toContain('Script   agent-a/.promptbook/agent-messages/question.sh');
          |                        ^
      203 |         expect(lines.join('\n')).toContain('file:///');
      204 |     });
      205 | });

      at Object.<anonymous> (scripts/run-agent-messages/ui/buildAgentRunUiFrame.test.ts:202:24)


Test Suites: 10 failed, 618 passed, 628 total
Tests:       21 failed, 7 todo, 2627 passed, 2655 total
Snapshots:   0 total
Time:        201.402 s, estimated 299 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
hejny@Pavols-MacBook-Air promptbook % 
```


