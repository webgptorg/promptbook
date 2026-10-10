[x] ~$2.37 21 minutes by OpenAI Codex `gpt-5.4`

[✨♟] Fix Vercel build of Agents Server

-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

```log
15:11:12.110 Warning: You're seeing the last 10000 lines of logs. Any lines before that were automatically truncated.
15:11:12.110       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.110       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.110       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.110       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.110       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.110     },
15:11:12.110     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.110     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.110     nextChunkId: 26,
15:11:12.110     pendingChunks: 0,
15:11:12.110     hints: Set(16) {
15:11:12.110       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.110       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.110     },
15:11:12.110     abortableTasks: Set(0) {},
15:11:12.110     pingedTasks: [],
15:11:12.110     completedImportChunks: [],
15:11:12.110     completedHintChunks: [],
15:11:12.110     completedRegularChunks: [],
15:11:12.110     completedErrorChunks: [],
15:11:12.110     writtenSymbols: Map(2) {
15:11:12.110       Symbol(react.fragment) => 1,
15:11:12.110       Symbol(react.suspense) => 24
15:11:12.110     },
15:11:12.110     writtenClientReferences: Map(7) {
15:11:12.110       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.110       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.110       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.110       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.110       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.110       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.110       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.110     },
15:11:12.110     writtenServerReferences: Map(0) {},
15:11:12.110     writtenObjects: WeakMap { <items unknown> },
15:11:12.110     temporaryReferences: undefined,
15:11:12.110     identifierPrefix: '',
15:11:12.110     identifierCount: 1,
15:11:12.110     taintCleanupQueue: [],
15:11:12.110     onError: [Function (anonymous)],
15:11:12.110     onPostpone: [Function: X],
15:11:12.110     onAllReady: [Function: X],
15:11:12.110     onFatalError: [Function: X]
15:11:12.110   },
15:11:12.110   [Symbol(kResourceStore)]: undefined,
15:11:12.110   [Symbol(kResourceStore)]: {
15:11:12.110     type: 'prerender-legacy',
15:11:12.110     phase: 'render',
15:11:12.110     rootParams: {},
15:11:12.110     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.110     revalidate: 0,
15:11:12.110     expire: 4294967294,
15:11:12.110     stale: 4294967294,
15:11:12.110     tags: [
15:11:12.110       '_N_T_/layout',
15:11:12.110       '_N_T_/admin/layout',
15:11:12.110       '_N_T_/admin/api-tokens/layout',
15:11:12.110       '_N_T_/admin/api-tokens/page',
15:11:12.110       '_N_T_/admin/api-tokens'
15:11:12.110     ]
15:11:12.110   }
15:11:12.110 }
15:11:12.110 Unhandled rejection Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.110     at r (.next/server/chunks/657.js:12:54555)
15:11:12.110     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.110     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.110     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.110     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.110     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.117     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.117     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.117   description: "Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.117   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.117 } Promise {
15:11:12.117   <rejected> Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.117       at r (.next/server/chunks/657.js:12:54555)
15:11:12.117       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.117       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.117       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.117       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.117       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.117       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.117       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.117     description: "Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.117     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.117   },
15:11:12.117   [Symbol(async_id_symbol)]: 1164,
15:11:12.117   [Symbol(trigger_async_id_symbol)]: 1115,
15:11:12.117   [Symbol(kResourceStore)]: undefined,
15:11:12.117   [Symbol(kResourceStore)]: {
15:11:12.117     isStaticGeneration: true,
15:11:12.117     page: '/admin/api-tokens/page',
15:11:12.117     fallbackRouteParams: null,
15:11:12.117     route: '/admin/api-tokens',
15:11:12.117     incrementalCache: IncrementalCache {
15:11:12.117       locks: Map(0) {},
15:11:12.117       hasCustomCacheHandler: false,
15:11:12.117       dev: false,
15:11:12.117       disableForTestmode: false,
15:11:12.117       minimalMode: true,
15:11:12.117       requestHeaders: {},
15:11:12.117       allowedRevalidateHeaderKeys: undefined,
15:11:12.117       prerenderManifest: [Object],
15:11:12.117       cacheControls: [SharedCacheControls],
15:11:12.117       fetchCacheKeyPrefix: '',
15:11:12.117       cacheHandler: [FileSystemCache]
15:11:12.117     },
15:11:12.117     cacheLifeProfiles: {
15:11:12.117       default: [Object],
15:11:12.118       seconds: [Object],
15:11:12.118       minutes: [Object],
15:11:12.118       hours: [Object],
15:11:12.118       days: [Object],
15:11:12.118       weeks: [Object],
15:11:12.118       max: [Object]
15:11:12.118     },
15:11:12.118     isRevalidate: true,
15:11:12.118     isBuildTimePrerendering: true,
15:11:12.118     hasReadableErrorStacks: false,
15:11:12.118     fetchCache: undefined,
15:11:12.118     isOnDemandRevalidate: undefined,
15:11:12.118     isDraftMode: undefined,
15:11:12.118     requestEndedState: { ended: false },
15:11:12.118     isPrefetchRequest: false,
15:11:12.118     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.118     reactLoadableManifest: {
15:11:12.118       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.118       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.118       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.118       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.118       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.118       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.118       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.118       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.118       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.118       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.118       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.118       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.118       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.118       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.118       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.118     },
15:11:12.118     assetPrefix: '',
15:11:12.118     afterContext: eJ {
15:11:12.118       workUnitStores: Set(0) {},
15:11:12.118       waitUntil: [Function: bound ],
15:11:12.118       onClose: [Function: bound onClose],
15:11:12.118       onTaskError: [Function: onTaskError],
15:11:12.118       callbackQueue: [o]
15:11:12.118     },
15:11:12.118     dynamicIOEnabled: false,
15:11:12.118     dev: false,
15:11:12.118     previouslyRevalidatedTags: [],
15:11:12.118     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.118     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.118     fetchMetrics: [],
15:11:12.118     dynamicUsageDescription: 'cookies',
15:11:12.119     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.119       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.119       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.119       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.119       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.119       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.119       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.119       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.119       '    at stringify (<anonymous>)\n' +
15:11:12.119       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.119       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.119   },
15:11:12.119   [Symbol(kResourceStore)]: eg {
15:11:12.119     type: 20,
15:11:12.119     status: 14,
15:11:12.119     flushScheduled: false,
15:11:12.119     fatalError: null,
15:11:12.119     destination: null,
15:11:12.119     bundlerConfig: {
15:11:12.119       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.119       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.119       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.119       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.119       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.120       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.120       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.120       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.120       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.131       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.131       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.131       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.131       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.131       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.135       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.135       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.135     },
15:11:12.135     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.135     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.135     nextChunkId: 26,
15:11:12.135     pendingChunks: 0,
15:11:12.135     hints: Set(16) {
15:11:12.135       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.135       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.136       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.136     },
15:11:12.136     abortableTasks: Set(0) {},
15:11:12.136     pingedTasks: [],
15:11:12.136     completedImportChunks: [],
15:11:12.136     completedHintChunks: [],
15:11:12.136     completedRegularChunks: [],
15:11:12.136     completedErrorChunks: [],
15:11:12.136     writtenSymbols: Map(2) {
15:11:12.136       Symbol(react.fragment) => 1,
15:11:12.136       Symbol(react.suspense) => 24
15:11:12.136     },
15:11:12.136     writtenClientReferences: Map(7) {
15:11:12.136       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.136       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.136       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.136       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.136       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.136       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.136       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.136     },
15:11:12.136     writtenServerReferences: Map(0) {},
15:11:12.136     writtenObjects: WeakMap { <items unknown> },
15:11:12.136     temporaryReferences: undefined,
15:11:12.136     identifierPrefix: '',
15:11:12.136     identifierCount: 1,
15:11:12.136     taintCleanupQueue: [],
15:11:12.136     onError: [Function (anonymous)],
15:11:12.136     onPostpone: [Function: X],
15:11:12.136     onAllReady: [Function: X],
15:11:12.136     onFatalError: [Function: X]
15:11:12.136   },
15:11:12.136   [Symbol(kResourceStore)]: undefined,
15:11:12.136   [Symbol(kResourceStore)]: {
15:11:12.136     type: 'prerender-legacy',
15:11:12.136     phase: 'render',
15:11:12.136     rootParams: {},
15:11:12.136     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.136     revalidate: 0,
15:11:12.136     expire: 4294967294,
15:11:12.136     stale: 4294967294,
15:11:12.136     tags: [
15:11:12.136       '_N_T_/layout',
15:11:12.136       '_N_T_/admin/layout',
15:11:12.136       '_N_T_/admin/api-tokens/layout',
15:11:12.136       '_N_T_/admin/api-tokens/page',
15:11:12.136       '_N_T_/admin/api-tokens'
15:11:12.136     ]
15:11:12.136   }
15:11:12.136 }
15:11:12.136 Unhandled rejection Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.136     at r (.next/server/chunks/657.js:12:54555)
15:11:12.136     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.136     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.136     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.136     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.136     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.136     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.136     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.137   description: "Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.137   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.137 } Promise {
15:11:12.137   <rejected> Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.137       at r (.next/server/chunks/657.js:12:54555)
15:11:12.137       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.137       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.137       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.137       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.137       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.137       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.137       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.137     description: "Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.137     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.137   },
15:11:12.137   [Symbol(async_id_symbol)]: 1153,
15:11:12.137   [Symbol(trigger_async_id_symbol)]: 1115,
15:11:12.137   [Symbol(kResourceStore)]: undefined,
15:11:12.137   [Symbol(kResourceStore)]: {
15:11:12.137     isStaticGeneration: true,
15:11:12.137     page: '/admin/api-tokens/page',
15:11:12.137     fallbackRouteParams: null,
15:11:12.137     route: '/admin/api-tokens',
15:11:12.137     incrementalCache: IncrementalCache {
15:11:12.137       locks: Map(0) {},
15:11:12.137       hasCustomCacheHandler: false,
15:11:12.137       dev: false,
15:11:12.137       disableForTestmode: false,
15:11:12.137       minimalMode: true,
15:11:12.137       requestHeaders: {},
15:11:12.137       allowedRevalidateHeaderKeys: undefined,
15:11:12.137       prerenderManifest: [Object],
15:11:12.137       cacheControls: [SharedCacheControls],
15:11:12.137       fetchCacheKeyPrefix: '',
15:11:12.137       cacheHandler: [FileSystemCache]
15:11:12.137     },
15:11:12.137     cacheLifeProfiles: {
15:11:12.137       default: [Object],
15:11:12.137       seconds: [Object],
15:11:12.137       minutes: [Object],
15:11:12.137       hours: [Object],
15:11:12.137       days: [Object],
15:11:12.137       weeks: [Object],
15:11:12.137       max: [Object]
15:11:12.137     },
15:11:12.137     isRevalidate: true,
15:11:12.137     isBuildTimePrerendering: true,
15:11:12.137     hasReadableErrorStacks: false,
15:11:12.137     fetchCache: undefined,
15:11:12.137     isOnDemandRevalidate: undefined,
15:11:12.137     isDraftMode: undefined,
15:11:12.137     requestEndedState: { ended: false },
15:11:12.137     isPrefetchRequest: false,
15:11:12.137     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.137     reactLoadableManifest: {
15:11:12.137       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.137       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.137       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.137       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.137       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.137       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.137       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.137       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.138       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.138       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.138       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.138       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.138       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.138       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.138       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.138     },
15:11:12.138     assetPrefix: '',
15:11:12.138     afterContext: eJ {
15:11:12.138       workUnitStores: Set(0) {},
15:11:12.138       waitUntil: [Function: bound ],
15:11:12.138       onClose: [Function: bound onClose],
15:11:12.138       onTaskError: [Function: onTaskError],
15:11:12.138       callbackQueue: [o]
15:11:12.138     },
15:11:12.138     dynamicIOEnabled: false,
15:11:12.138     dev: false,
15:11:12.138     previouslyRevalidatedTags: [],
15:11:12.138     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.138     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.138     fetchMetrics: [],
15:11:12.138     dynamicUsageDescription: 'cookies',
15:11:12.138     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.138       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.138       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.138       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.138       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.138       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.138       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.138       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.138       '    at stringify (<anonymous>)\n' +
15:11:12.138       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.138       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.138   },
15:11:12.138   [Symbol(kResourceStore)]: eg {
15:11:12.138     type: 20,
15:11:12.138     status: 14,
15:11:12.138     flushScheduled: false,
15:11:12.138     fatalError: null,
15:11:12.138     destination: null,
15:11:12.138     bundlerConfig: {
15:11:12.138       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.138       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.146       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.147       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.147       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.147       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.147       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.147       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.147       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.147       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.147       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.147       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.148       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.148       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.148       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.148     },
15:11:12.148     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.148     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.148     nextChunkId: 26,
15:11:12.148     pendingChunks: 0,
15:11:12.148     hints: Set(16) {
15:11:12.148       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.148       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.148       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.148       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.148       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.149       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.149     },
15:11:12.149     abortableTasks: Set(0) {},
15:11:12.149     pingedTasks: [],
15:11:12.149     completedImportChunks: [],
15:11:12.149     completedHintChunks: [],
15:11:12.149     completedRegularChunks: [],
15:11:12.149     completedErrorChunks: [],
15:11:12.149     writtenSymbols: Map(2) {
15:11:12.149       Symbol(react.fragment) => 1,
15:11:12.149       Symbol(react.suspense) => 24
15:11:12.149     },
15:11:12.149     writtenClientReferences: Map(7) {
15:11:12.149       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.149       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.149       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.149       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.149       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.149       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.149       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.149     },
15:11:12.149     writtenServerReferences: Map(0) {},
15:11:12.149     writtenObjects: WeakMap { <items unknown> },
15:11:12.149     temporaryReferences: undefined,
15:11:12.149     identifierPrefix: '',
15:11:12.149     identifierCount: 1,
15:11:12.149     taintCleanupQueue: [],
15:11:12.149     onError: [Function (anonymous)],
15:11:12.149     onPostpone: [Function: X],
15:11:12.149     onAllReady: [Function: X],
15:11:12.149     onFatalError: [Function: X]
15:11:12.149   },
15:11:12.149   [Symbol(kResourceStore)]: undefined,
15:11:12.149   [Symbol(kResourceStore)]: {
15:11:12.149     type: 'prerender-legacy',
15:11:12.149     phase: 'render',
15:11:12.149     rootParams: {},
15:11:12.150     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.150     revalidate: 0,
15:11:12.150     expire: 4294967294,
15:11:12.150     stale: 4294967294,
15:11:12.150     tags: [
15:11:12.150       '_N_T_/layout',
15:11:12.150       '_N_T_/admin/layout',
15:11:12.150       '_N_T_/admin/api-tokens/layout',
15:11:12.150       '_N_T_/admin/api-tokens/page',
15:11:12.150       '_N_T_/admin/api-tokens'
15:11:12.150     ]
15:11:12.150   }
15:11:12.150 }
15:11:12.150 Unhandled rejection Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.150     at r (.next/server/chunks/657.js:12:54555)
15:11:12.150     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.150     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.150     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.150     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.150     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.150     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.150   description: "Route /admin/api-tokens couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.150   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.150 } Promise {
15:11:12.150   <rejected> Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.150       at r (.next/server/chunks/657.js:12:54555)
15:11:12.150       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.150       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.150       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.150       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.150       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.150       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.150     description: "Route /admin/api-tokens couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.150     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.150   },
15:11:12.150   [Symbol(async_id_symbol)]: 1159,
15:11:12.150   [Symbol(trigger_async_id_symbol)]: 1138,
15:11:12.150   [Symbol(kResourceStore)]: undefined,
15:11:12.150   [Symbol(kResourceStore)]: {
15:11:12.150     isStaticGeneration: true,
15:11:12.150     page: '/admin/api-tokens/page',
15:11:12.156     fallbackRouteParams: null,
15:11:12.156     route: '/admin/api-tokens',
15:11:12.157     incrementalCache: IncrementalCache {
15:11:12.157       locks: Map(0) {},
15:11:12.157       hasCustomCacheHandler: false,
15:11:12.157       dev: false,
15:11:12.157       disableForTestmode: false,
15:11:12.157       minimalMode: true,
15:11:12.157       requestHeaders: {},
15:11:12.157       allowedRevalidateHeaderKeys: undefined,
15:11:12.157       prerenderManifest: [Object],
15:11:12.157       cacheControls: [SharedCacheControls],
15:11:12.157       fetchCacheKeyPrefix: '',
15:11:12.157       cacheHandler: [FileSystemCache]
15:11:12.157     },
15:11:12.157     cacheLifeProfiles: {
15:11:12.157       default: [Object],
15:11:12.157       seconds: [Object],
15:11:12.157       minutes: [Object],
15:11:12.157       hours: [Object],
15:11:12.157       days: [Object],
15:11:12.157       weeks: [Object],
15:11:12.157       max: [Object]
15:11:12.157     },
15:11:12.157     isRevalidate: true,
15:11:12.157     isBuildTimePrerendering: true,
15:11:12.157     hasReadableErrorStacks: false,
15:11:12.157     fetchCache: undefined,
15:11:12.157     isOnDemandRevalidate: undefined,
15:11:12.157     isDraftMode: undefined,
15:11:12.157     requestEndedState: { ended: false },
15:11:12.158     isPrefetchRequest: false,
15:11:12.158     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.158     reactLoadableManifest: {
15:11:12.158       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.158       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.158       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.158       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.158       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.158       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.158       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.158       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.158       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.158       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.158       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.158       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.158       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.158       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.158       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.158     },
15:11:12.158     assetPrefix: '',
15:11:12.158     afterContext: eJ {
15:11:12.158       workUnitStores: Set(0) {},
15:11:12.158       waitUntil: [Function: bound ],
15:11:12.158       onClose: [Function: bound onClose],
15:11:12.158       onTaskError: [Function: onTaskError],
15:11:12.158       callbackQueue: [o]
15:11:12.158     },
15:11:12.158     dynamicIOEnabled: false,
15:11:12.158     dev: false,
15:11:12.158     previouslyRevalidatedTags: [],
15:11:12.158     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.158     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.158     fetchMetrics: [],
15:11:12.158     dynamicUsageDescription: 'cookies',
15:11:12.158     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.158       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.158       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.158       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.158       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.158       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.158       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.158       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.158       '    at stringify (<anonymous>)\n' +
15:11:12.158       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.158       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.158   },
15:11:12.158   [Symbol(kResourceStore)]: eg {
15:11:12.158     type: 20,
15:11:12.158     status: 14,
15:11:12.159     flushScheduled: false,
15:11:12.159     fatalError: null,
15:11:12.159     destination: null,
15:11:12.159     bundlerConfig: {
15:11:12.159       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.159       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.159       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.160       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.160       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.160       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.160     },
15:11:12.160     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.160     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.160     nextChunkId: 26,
15:11:12.160     pendingChunks: 0,
15:11:12.160     hints: Set(16) {
15:11:12.160       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.160       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.161     },
15:11:12.161     abortableTasks: Set(0) {},
15:11:12.161     pingedTasks: [],
15:11:12.161     completedImportChunks: [],
15:11:12.161     completedHintChunks: [],
15:11:12.161     completedRegularChunks: [],
15:11:12.161     completedErrorChunks: [],
15:11:12.161     writtenSymbols: Map(2) {
15:11:12.161       Symbol(react.fragment) => 1,
15:11:12.161       Symbol(react.suspense) => 24
15:11:12.161     },
15:11:12.161     writtenClientReferences: Map(7) {
15:11:12.161       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.161       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.161       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.161       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.161       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.161       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.161       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.161     },
15:11:12.161     writtenServerReferences: Map(0) {},
15:11:12.161     writtenObjects: WeakMap { <items unknown> },
15:11:12.161     temporaryReferences: undefined,
15:11:12.161     identifierPrefix: '',
15:11:12.161     identifierCount: 1,
15:11:12.161     taintCleanupQueue: [],
15:11:12.161     onError: [Function (anonymous)],
15:11:12.161     onPostpone: [Function: X],
15:11:12.161     onAllReady: [Function: X],
15:11:12.179     onFatalError: [Function: X]
15:11:12.179   },
15:11:12.179   [Symbol(kResourceStore)]: undefined,
15:11:12.183   [Symbol(kResourceStore)]: {
15:11:12.183     type: 'prerender-legacy',
15:11:12.183     phase: 'render',
15:11:12.183     rootParams: {},
15:11:12.183     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.183     revalidate: 0,
15:11:12.183     expire: 4294967294,
15:11:12.183     stale: 4294967294,
15:11:12.183     tags: [
15:11:12.183       '_N_T_/layout',
15:11:12.183       '_N_T_/admin/layout',
15:11:12.183       '_N_T_/admin/api-tokens/layout',
15:11:12.183       '_N_T_/admin/api-tokens/page',
15:11:12.183       '_N_T_/admin/api-tokens'
15:11:12.183     ]
15:11:12.183   }
15:11:12.183 }
15:11:12.183 Unhandled rejection Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.183     at r (.next/server/chunks/657.js:12:54555)
15:11:12.183     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.183     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.183     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.183     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.183     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.183     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.183     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.183   description: "Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.183   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.183 } Promise {
15:11:12.183   <rejected> Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.183       at r (.next/server/chunks/657.js:12:54555)
15:11:12.183       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.183       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.183       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.183       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.183       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.183       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.183       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.183     description: "Route /admin/api-tokens couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.183     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.183   },
15:11:12.183   [Symbol(async_id_symbol)]: 1146,
15:11:12.183   [Symbol(trigger_async_id_symbol)]: 1115,
15:11:12.184   [Symbol(kResourceStore)]: undefined,
15:11:12.184   [Symbol(kResourceStore)]: {
15:11:12.184     isStaticGeneration: true,
15:11:12.184     page: '/admin/api-tokens/page',
15:11:12.184     fallbackRouteParams: null,
15:11:12.184     route: '/admin/api-tokens',
15:11:12.184     incrementalCache: IncrementalCache {
15:11:12.184       locks: Map(0) {},
15:11:12.184       hasCustomCacheHandler: false,
15:11:12.184       dev: false,
15:11:12.184       disableForTestmode: false,
15:11:12.184       minimalMode: true,
15:11:12.184       requestHeaders: {},
15:11:12.184       allowedRevalidateHeaderKeys: undefined,
15:11:12.184       prerenderManifest: [Object],
15:11:12.184       cacheControls: [SharedCacheControls],
15:11:12.184       fetchCacheKeyPrefix: '',
15:11:12.184       cacheHandler: [FileSystemCache]
15:11:12.184     },
15:11:12.184     cacheLifeProfiles: {
15:11:12.184       default: [Object],
15:11:12.184       seconds: [Object],
15:11:12.184       minutes: [Object],
15:11:12.184       hours: [Object],
15:11:12.184       days: [Object],
15:11:12.184       weeks: [Object],
15:11:12.184       max: [Object]
15:11:12.184     },
15:11:12.184     isRevalidate: true,
15:11:12.184     isBuildTimePrerendering: true,
15:11:12.184     hasReadableErrorStacks: false,
15:11:12.184     fetchCache: undefined,
15:11:12.184     isOnDemandRevalidate: undefined,
15:11:12.184     isDraftMode: undefined,
15:11:12.184     requestEndedState: { ended: false },
15:11:12.184     isPrefetchRequest: false,
15:11:12.184     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.184     reactLoadableManifest: {
15:11:12.184       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.184       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.184       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.184       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.184       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.184       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.184       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.184       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.185       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.185       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.185       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.185       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.185       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.185       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.185       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.185     },
15:11:12.185     assetPrefix: '',
15:11:12.185     afterContext: eJ {
15:11:12.185       workUnitStores: Set(0) {},
15:11:12.185       waitUntil: [Function: bound ],
15:11:12.185       onClose: [Function: bound onClose],
15:11:12.185       onTaskError: [Function: onTaskError],
15:11:12.185       callbackQueue: [o]
15:11:12.185     },
15:11:12.185     dynamicIOEnabled: false,
15:11:12.185     dev: false,
15:11:12.185     previouslyRevalidatedTags: [],
15:11:12.185     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.185     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.185     fetchMetrics: [],
15:11:12.185     dynamicUsageDescription: 'cookies',
15:11:12.185     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/api-tokens couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.185       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.185       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.185       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.185       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.185       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.185       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.185       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.185       '    at stringify (<anonymous>)\n' +
15:11:12.185       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.185       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.185   },
15:11:12.185   [Symbol(kResourceStore)]: eg {
15:11:12.185     type: 20,
15:11:12.185     status: 14,
15:11:12.185     flushScheduled: false,
15:11:12.185     fatalError: null,
15:11:12.185     destination: null,
15:11:12.185     bundlerConfig: {
15:11:12.185       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.185       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.185       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.186       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.186       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.186       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.186       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.186       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.186       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.186       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.187       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.187       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.187       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.187       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.187       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.187     },
15:11:12.187     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.187     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.187     nextChunkId: 26,
15:11:12.187     pendingChunks: 0,
15:11:12.187     hints: Set(16) {
15:11:12.187       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.187       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.187     },
15:11:12.187     abortableTasks: Set(0) {},
15:11:12.187     pingedTasks: [],
15:11:12.187     completedImportChunks: [],
15:11:12.187     completedHintChunks: [],
15:11:12.187     completedRegularChunks: [],
15:11:12.187     completedErrorChunks: [],
15:11:12.187     writtenSymbols: Map(2) {
15:11:12.187       Symbol(react.fragment) => 1,
15:11:12.187       Symbol(react.suspense) => 24
15:11:12.187     },
15:11:12.187     writtenClientReferences: Map(7) {
15:11:12.187       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.187       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.187       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.187       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.187       '/vercel/path0/apps/agents-server/src/app/global-eFailed to load custom JavaScript Error: Dynamic server usage: Route /system/user-wallet couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.187     at r (.next/server/chunks/657.js:12:54555)
15:11:12.187     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.187     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.187     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.187     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.187     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.187     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.187     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.187   description: "Route /system/user-wallet couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.187   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.187 }
15:11:12.187 Failed to load custom stylesheet CSS Error: Dynamic server usage: Route /system/utilities/mocked-chats couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.187     at r (.next/server/chunks/657.js:12:54555)
15:11:12.187     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.187     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.187     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.187     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.188     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.188     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.188     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.188   description: "Route /system/utilities/mocked-chats couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.188   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.188 }
15:11:12.188 Failed to load custom JavaScript Error: Dynamic server usage: Route /system/utilities/mocked-chats couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.188     at r (.next/server/chunks/657.js:12:54555)
15:11:12.188     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.188     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.188     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.188     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.188     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.188     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.188     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.188   description: "Route /system/utilities/mocked-chats couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.188   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.188 }
15:11:12.188 Failed to load custom stylesheet CSS Error: Dynamic server usage: Route /system/utilities/mocked-chats/view couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.188     at r (.next/server/chunks/657.js:12:54555)
15:11:12.188     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.188     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.188     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.188     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.188     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.188     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.188     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.188   description: "Route /system/utilities/mocked-chats/view couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.188   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.188 }
15:11:12.188 Failed to load custom JavaScript Error: Dynamic server usage: Route /system/utilities/mocked-chats/view couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.188     at r (.next/server/chunks/657.js:12:54555)
15:11:12.188     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.188     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.188     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.188     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.188     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.188     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.188     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.188   description: "Route /system/utilities/mocked-chats/view couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.188   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.188 }
15:11:12.188 Failed to load custom stylesheet CSS Error: Dynamic server usage: Route /system/utilities couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.188     at r (.next/server/chunks/657.js:12:54555)
15:11:12.188     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.188     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.188     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.188     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.188     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.188     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.188     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.188   description: "Route /system/utilities couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.188   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.188 }
15:11:12.188 Failed to load custom JavaScript Error: Dynamic server usage: Route /system/utilities couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.188     at r (.next/server/chunks/657.js:12:54555)
15:11:12.188     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.188     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.188     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.188     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.188     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.188     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.188     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.188   description: "Route /system/utilities couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.188   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.189 }
15:11:12.189 Failed to load custom stylesheet CSS Error: Dynamic server usage: Route /test/og-image couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.189     at r (.next/server/chunks/657.js:12:54555)
15:11:12.189     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.189     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.189     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.189     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.189     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.189     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.189     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.189   description: "Route /test/og-image couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.189   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.189 }
15:11:12.189 Failed to load custom JavaScript Error: Dynamic server usage: Route /test/og-image couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.189     at r (.next/server/chunks/657.js:12:54555)
15:11:12.189     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.189     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.189     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.189     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.189     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.189     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.189     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.189   description: "Route /test/og-image couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.189   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.189 }
15:11:12.189 Failed to load custom stylesheet CSS Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.189     at r (.next/server/chunks/657.js:12:54555)
15:11:12.189     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.189     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.189     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.189     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.189     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.189     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.189     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.189   description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.189   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.189 }
15:11:12.189 Failed to load custom JavaScript Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.189     at r (.next/server/chunks/657.js:12:54555)
15:11:12.189     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.189     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.189     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.189     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.189     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.189     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.189     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.189   description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.189   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.189 }
15:11:12.189 Unhandled rejection Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.189     at r (.next/server/chunks/657.js:12:54555)
15:11:12.189     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.189     at <unknown> (.next/server/chunks/10.js:1:2563)
15:11:12.189     at n (.next/server/chunks/10.js:1:2620)
15:11:12.189     at <unknown> (.next/server/chunks/10.js:205:307)
15:11:12.189     at j (.next/server/chunks/10.js:205:953)
15:11:12.189     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.189   description: "Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.189   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.189 } Promise {
15:11:12.189   <rejected> Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.189       at r (.next/server/chunks/657.js:12:54555)
15:11:12.189       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.189       at <unknown> (.next/server/chunks/10.js:1:2563)
15:11:12.189       at n (.next/server/chunks/10.js:1:2620)
15:11:12.190       at <unknown> (.next/server/chunks/10.js:205:307)
15:11:12.190       at j (.next/server/chunks/10.js:205:953)
15:11:12.190       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.190     description: "Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.190     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.190   },
15:11:12.190   [Symbol(async_id_symbol)]: 24138,
15:11:12.190   [Symbol(trigger_async_id_symbol)]: 24120,
15:11:12.190   [Symbol(kResourceStore)]: {
15:11:12.190     isStaticGeneration: true,
15:11:12.190     page: '/embed/page',
15:11:12.190     fallbackRouteParams: null,
15:11:12.190     route: '/embed',
15:11:12.190     incrementalCache: IncrementalCache {
15:11:12.190       locks: Map(0) {},
15:11:12.190       hasCustomCacheHandler: false,
15:11:12.190       dev: false,
15:11:12.190       disableForTestmode: false,
15:11:12.190       minimalMode: true,
15:11:12.190       requestHeaders: {},
15:11:12.190       allowedRevalidateHeaderKeys: undefined,
15:11:12.190       prerenderManifest: [Object],
15:11:12.190       cacheControls: [SharedCacheControls],
15:11:12.190       fetchCacheKeyPrefix: '',
15:11:12.190       cacheHandler: [FileSystemCache]
15:11:12.190     },
15:11:12.190     cacheLifeProfiles: {
15:11:12.190       default: [Object],
15:11:12.190       seconds: [Object],
15:11:12.190       minutes: [Object],
15:11:12.190       hours: [Object],
15:11:12.190       days: [Object],
15:11:12.190       weeks: [Object],
15:11:12.190       max: [Object]
15:11:12.190     },
15:11:12.190     isRevalidate: true,
15:11:12.190     isBuildTimePrerendering: true,
15:11:12.190     hasReadableErrorStacks: false,
15:11:12.190     fetchCache: undefined,
15:11:12.190     isOnDemandRevalidate: undefined,
15:11:12.190     isDraftMode: undefined,
15:11:12.190     requestEndedState: { ended: false },
15:11:12.190     isPrefetchRequest: false,
15:11:12.190     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.190     reactLoadableManifest: {
15:11:12.190       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.190       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.190       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.190       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.190       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.190       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.190       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.190       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.190       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.190       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.190       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.190       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.190       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.193       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.193       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.193     },
15:11:12.193     assetPrefix: '',
15:11:12.193     afterContext: eJ {
15:11:12.193       workUnitStores: Set(0) {},
15:11:12.194       waitUntil: [Function: bound ],
15:11:12.194       onClose: [Function: bound onClose],
15:11:12.194       onTaskError: [Function: onTaskError],
15:11:12.194       callbackQueue: [o]
15:11:12.194     },
15:11:12.194     dynamicIOEnabled: false,
15:11:12.194     dev: false,
15:11:12.194     previouslyRevalidatedTags: [],
15:11:12.194     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.194     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.194     fetchMetrics: [],
15:11:12.194     dynamicUsageDescription: 'cookies',
15:11:12.194     dynamicUsageStack: "Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.194       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.194       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.194       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.194       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.194       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.194       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.194       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.194       '    at stringify (<anonymous>)\n' +
15:11:12.194       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.194       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.194   },
15:11:12.194   [Symbol(kResourceStore)]: eg {
15:11:12.194     type: 20,
15:11:12.194     status: 14,
15:11:12.194     flushScheduled: false,
15:11:12.194     fatalError: null,
15:11:12.194     destination: null,
15:11:12.194     bundlerConfig: {
15:11:12.194       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.194       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.195       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.195       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.196       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.196       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.196       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.196     },
15:11:12.196     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.196     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.196     nextChunkId: 30,
15:11:12.196     pendingChunks: 0,
15:11:12.196     hints: Set(16) {
15:11:12.196       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.196       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.197       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.197       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.197       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.197     },
15:11:12.197     abortableTasks: Set(0) {},
15:11:12.197     pingedTasks: [],
15:11:12.197     completedImportChunks: [],
15:11:12.197     completedHintChunks: [],
15:11:12.197     completedRegularChunks: [],
15:11:12.197     completedErrorChunks: [],
15:11:12.197     writtenSymbols: Map(2) {
15:11:12.197       Symbol(react.fragment) => 1,
15:11:12.197       Symbol(react.suspense) => 28
15:11:12.197     },
15:11:12.197     writtenClientReferences: Map(9) {
15:11:12.197       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.197       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.197       '/vercel/path0/node_modules/next/dist/client/components/client-page.js#ClientPageRoot' => 5,
15:11:12.197       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx#default' => 6,
15:11:12.197       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 9,
15:11:12.197       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 11,
15:11:12.197       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 23,
15:11:12.197       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 25,
15:11:12.197       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 27
15:11:12.197     },
15:11:12.197     writtenServerReferences: Map(0) {},
15:11:12.197     writtenObjects: WeakMap { <items unknown> },
15:11:12.197     temporaryReferences: undefined,
15:11:12.199     identifierPrefix: '',
15:11:12.199     identifierCount: 1,
15:11:12.199     taintCleanupQueue: [],
15:11:12.199     onError: [Function (anonymous)],
15:11:12.199     onPostpone: [Function: X],
15:11:12.199     onAllReady: [Function: X],
15:11:12.199     onFatalError: [Function: X]
15:11:12.199   },
15:11:12.199   [Symbol(kResourceStore)]: undefined,
15:11:12.199   [Symbol(kResourceStore)]: {
15:11:12.199     type: 'prerender-legacy',
15:11:12.199     phase: 'render',
15:11:12.199     rootParams: {},
15:11:12.199     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.199     revalidate: 0,
15:11:12.199     expire: 4294967294,
15:11:12.199     stale: 4294967294,
15:11:12.199     tags: [
15:11:12.199       '_N_T_/layout',
15:11:12.199       '_N_T_/embed/layout',
15:11:12.199       '_N_T_/embed/page',
15:11:12.199       '_N_T_/embed'
15:11:12.199     ]
15:11:12.199   }
15:11:12.199 }
15:11:12.199 Unhandled rejection Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.199     at r (.next/server/chunks/657.js:12:54555)
15:11:12.199     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.199     at <unknown> (.next/server/chunks/10.js:1:2563)
15:11:12.199     at n (.next/server/chunks/10.js:1:2620)
15:11:12.199     at <unknown> (.next/server/chunks/10.js:205:307)
15:11:12.199     at j (.next/server/chunks/10.js:205:953)
15:11:12.199     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.199   description: "Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.199   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.199 } Promise {
15:11:12.199   <rejected> Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.199       at r (.next/server/chunks/657.js:12:54555)
15:11:12.199       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.199       at <unknown> (.next/server/chunks/10.js:1:2563)
15:11:12.199       at n (.next/server/chunks/10.js:1:2620)
15:11:12.199       at <unknown> (.next/server/chunks/10.js:205:307)
15:11:12.199       at j (.next/server/chunks/10.js:205:953)
15:11:12.199       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.199     description: "Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.199     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.199   },
15:11:12.199   [Symbol(async_id_symbol)]: 24147,
15:11:12.199   [Symbol(trigger_async_id_symbol)]: 24120,
15:11:12.200   [Symbol(kResourceStore)]: {
15:11:12.200     isStaticGeneration: true,
15:11:12.200     page: '/embed/page',
15:11:12.200     fallbackRouteParams: null,
15:11:12.200     route: '/embed',
15:11:12.200     incrementalCache: IncrementalCache {
15:11:12.200       locks: Map(0) {},
15:11:12.200       hasCustomCacheHandler: false,
15:11:12.200       dev: false,
15:11:12.200       disableForTestmode: false,
15:11:12.200       minimalMode: true,
15:11:12.200       requestHeaders: {},
15:11:12.200       allowedRevalidateHeaderKeys: undefined,
15:11:12.200       prerenderManifest: [Object],
15:11:12.200       cacheControls: [SharedCacheControls],
15:11:12.200       fetchCacheKeyPrefix: '',
15:11:12.200       cacheHandler: [FileSystemCache]
15:11:12.200     },
15:11:12.200     cacheLifeProfiles: {
15:11:12.200       default: [Object],
15:11:12.200       seconds: [Object],
15:11:12.200       minutes: [Object],
15:11:12.200       hours: [Object],
15:11:12.200       days: [Object],
15:11:12.200       weeks: [Object],
15:11:12.200       max: [Object]
15:11:12.200     },
15:11:12.200     isRevalidate: true,
15:11:12.200     isBuildTimePrerendering: true,
15:11:12.200     hasReadableErrorStacks: false,
15:11:12.200     fetchCache: undefined,
15:11:12.200     isOnDemandRevalidate: undefined,
15:11:12.200     isDraftMode: undefined,
15:11:12.200     requestEndedState: { ended: false },
15:11:12.200     isPrefetchRequest: false,
15:11:12.200     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.200     reactLoadableManifest: {
15:11:12.200       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.200       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.200       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.200       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.200       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.200       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.200       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.200       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.200       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.200       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.200       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.200       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.200       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.200       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.200       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.200     },
15:11:12.200     assetPrefix: '',
15:11:12.200     afterContext: eJ {
15:11:12.200       workUnitStores: Set(0) {},
15:11:12.200       waitUntil: [Function: bound ],
15:11:12.200       onClose: [Function: bound onClose],
15:11:12.201       onTaskError: [Function: onTaskError],
15:11:12.201       callbackQueue: [o]
15:11:12.201     },
15:11:12.201     dynamicIOEnabled: false,
15:11:12.201     dev: false,
15:11:12.201     previouslyRevalidatedTags: [],
15:11:12.201     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.201     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.201     fetchMetrics: [],
15:11:12.201     dynamicUsageDescription: 'cookies',
15:11:12.201     dynamicUsageStack: "Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.201       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.201       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.201       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.201       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.201       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.201       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.201       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.201       '    at stringify (<anonymous>)\n' +
15:11:12.201       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.201       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.201   },
15:11:12.201   [Symbol(kResourceStore)]: eg {
15:11:12.201     type: 20,
15:11:12.201     status: 14,
15:11:12.201     flushScheduled: false,
15:11:12.201     fatalError: null,
15:11:12.201     destination: null,
15:11:12.201     bundlerConfig: {
15:11:12.201       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.201       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.202       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.202       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.202       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.202       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.202       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.202       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.202       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.202       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.202       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.202       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.202       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.203       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.203     },
15:11:12.203     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.203     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.203     nextChunkId: 30,
15:11:12.203     pendingChunks: 0,
15:11:12.203     hints: Set(16) {
15:11:12.203       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.203       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.203     },
15:11:12.203     abortableTasks: Set(0) {},
15:11:12.203     pingedTasks: [],
15:11:12.203     completedImportChunks: [],
15:11:12.203     completedHintChunks: [],
15:11:12.203     completedRegularChunks: [],
15:11:12.203     completedErrorChunks: [],
15:11:12.203     writtenSymbols: Map(2) {
15:11:12.203       Symbol(react.fragment) => 1,
15:11:12.203       Symbol(react.suspense) => 28
15:11:12.203     },
15:11:12.203     writtenClientReferences: Map(9) {
15:11:12.203       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.203       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.204       '/vercel/path0/node_modules/next/dist/client/components/client-page.js#ClientPageRoot' => 5,
15:11:12.204       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx#default' => 6,
15:11:12.204       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 9,
15:11:12.204       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 11,
15:11:12.204       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 23,
15:11:12.204       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 25,
15:11:12.204       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 27
15:11:12.204     },
15:11:12.204     writtenServerReferences: Map(0) {},
15:11:12.204     writtenObjects: WeakMap { <items unknown> },
15:11:12.204     temporaryReferences: undefined,
15:11:12.204     identifierPrefix: '',
15:11:12.204     identifierCount: 1,
15:11:12.204     taintCleanupQueue: [],
15:11:12.204     onError: [Function (anonymous)],
15:11:12.204     onPostpone: [Function: X],
15:11:12.204     onAllReady: [Function: X],
15:11:12.204     onFatalError: [Function: X]
15:11:12.204   },
15:11:12.204   [Symbol(kResourceStore)]: undefined,
15:11:12.204   [Symbol(kResourceStore)]: {
15:11:12.204     type: 'prerender-legacy',
15:11:12.204     phase: 'render',
15:11:12.204     rootParams: {},
15:11:12.204     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.204     revalidate: 0,
15:11:12.204     expire: 4294967294,
15:11:12.204     stale: 4294967294,
15:11:12.204     tags: [
15:11:12.204       '_N_T_/layout',
15:11:12.204       '_N_T_/embed/layout',
15:11:12.204       '_N_T_/embed/page',
15:11:12.204       '_N_T_/embed'
15:11:12.204     ]
15:11:12.204   }
15:11:12.204 }
15:11:12.204 Unhandled rejection Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.204     at r (.next/server/chunks/657.js:12:54555)
15:11:12.204     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.204     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.204     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.204     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.204     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.204     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.204     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.204   description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.205   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.205 } Promise {
15:11:12.205   <rejected> Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.205       at r (.next/server/chunks/657.js:12:54555)
15:11:12.205       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.205       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.205       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.205       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.205       at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.205       at k (.next/server/chunks/8134.js:119:2380)
15:11:12.205       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.205     description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.205     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.205   },
15:11:12.205   [Symbol(async_id_symbol)]: 24130,
15:11:12.205   [Symbol(trigger_async_id_symbol)]: 24120,
15:11:12.205   [Symbol(kResourceStore)]: {
15:11:12.205     isStaticGeneration: true,
15:11:12.205     page: '/embed/page',
15:11:12.205     fallbackRouteParams: null,
15:11:12.205     route: '/embed',
15:11:12.205     incrementalCache: IncrementalCache {
15:11:12.205       locks: Map(0) {},
15:11:12.205       hasCustomCacheHandler: false,
15:11:12.205       dev: false,
15:11:12.205       disableForTestmode: false,
15:11:12.205       minimalMode: true,
15:11:12.205       requestHeaders: {},
15:11:12.205       allowedRevalidateHeaderKeys: undefined,
15:11:12.205       prerenderManifest: [Object],
15:11:12.205       cacheControls: [SharedCacheControls],
15:11:12.205       fetchCacheKeyPrefix: '',
15:11:12.205       cacheHandler: [FileSystemCache]
15:11:12.205     },
15:11:12.205     cacheLifeProfiles: {
15:11:12.205       default: [Object],
15:11:12.205       seconds: [Object],
15:11:12.205       minutes: [Object],
15:11:12.205       hours: [Object],
15:11:12.205       days: [Object],
15:11:12.205       weeks: [Object],
15:11:12.205       max: [Object]
15:11:12.205     },
15:11:12.205     isRevalidate: true,
15:11:12.205     isBuildTimePrerendering: true,
15:11:12.205     hasReadableErrorStacks: false,
15:11:12.205     fetchCache: undefined,
15:11:12.205     isOnDemandRevalidate: undefined,
15:11:12.206     isDraftMode: undefined,
15:11:12.206     requestEndedState: { ended: false },
15:11:12.206     isPrefetchRequest: false,
15:11:12.206     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.206     reactLoadableManifest: {
15:11:12.206       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.206       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.206       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.206       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.206       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.206       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.206       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.206       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.206       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.206       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.206       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.206       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.206       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.206       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.206       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.206     },
15:11:12.206     assetPrefix: '',
15:11:12.206     afterContext: eJ {
15:11:12.206       workUnitStores: Set(0) {},
15:11:12.206       waitUntil: [Function: bound ],
15:11:12.206       onClose: [Function: bound onClose],
15:11:12.206       onTaskError: [Function: onTaskError],
15:11:12.206       callbackQueue: [o]
15:11:12.206     },
15:11:12.206     dynamicIOEnabled: false,
15:11:12.206     dev: false,
15:11:12.206     previouslyRevalidatedTags: [],
15:11:12.206     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.206     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.206     fetchMetrics: [],
15:11:12.206     dynamicUsageDescription: 'cookies',
15:11:12.206     dynamicUsageStack: "Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.206       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.208       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.208       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.208       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.208       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.208       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.208       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.208       '    at stringify (<anonymous>)\n' +
15:11:12.208       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.208       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.208   },
15:11:12.208   [Symbol(kResourceStore)]: eg {
15:11:12.208     type: 20,
15:11:12.208     status: 14,
15:11:12.208     flushScheduled: false,
15:11:12.208     fatalError: null,
15:11:12.208     destination: null,
15:11:12.208     bundlerConfig: {
15:11:12.208       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.208       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.209       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.209       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.209       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.209       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.209       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.209       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.209       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.209       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.210       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.210       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.210     },
15:11:12.210     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.210     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.210     nextChunkId: 30,
15:11:12.210     pendingChunks: 0,
15:11:12.210     hints: Set(16) {
15:11:12.210       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.210       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.211       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.211       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.211       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.211     },
15:11:12.211     abortableTasks: Set(0) {},
15:11:12.211     pingedTasks: [],
15:11:12.211     completedImportChunks: [],
15:11:12.211     completedHintChunks: [],
15:11:12.211     completedRegularChunks: [],
15:11:12.211     completedErrorChunks: [],
15:11:12.211     writtenSymbols: Map(2) {
15:11:12.211       Symbol(react.fragment) => 1,
15:11:12.211       Symbol(react.suspense) => 28
15:11:12.211     },
15:11:12.211     writtenClientReferences: Map(9) {
15:11:12.211       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.211       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.211       '/vercel/path0/node_modules/next/dist/client/components/client-page.js#ClientPageRoot' => 5,
15:11:12.211       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx#default' => 6,
15:11:12.211       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 9,
15:11:12.211       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 11,
15:11:12.211       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 23,
15:11:12.211       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 25,
15:11:12.211       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 27
15:11:12.211     },
15:11:12.211     writtenServerReferences: Map(0) {},
15:11:12.211     writtenObjects: WeakMap { <items unknown> },
15:11:12.211     temporaryReferences: undefined,
15:11:12.211     identifierPrefix: '',
15:11:12.211     identifierCount: 1,
15:11:12.211     taintCleanupQueue: [],
15:11:12.211     onError: [Function (anonymous)],
15:11:12.211     onPostpone: [Function: X],
15:11:12.211     onAllReady: [Function: X],
15:11:12.211     onFatalError: [Function: X]
15:11:12.211   },
15:11:12.211   [Symbol(kResourceStore)]: undefined,
15:11:12.211   [Symbol(kResourceStore)]: {
15:11:12.211     type: 'prerender-legacy',
15:11:12.211     phase: 'render',
15:11:12.211     rootParams: {},
15:11:12.211     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.211     revalidate: 0,
15:11:12.211     expire: 4294967294,
15:11:12.211     stale: 4294967294,
15:11:12.211     tags: [
15:11:12.211       '_N_T_/layout',
15:11:12.211       '_N_T_/embed/layout',
15:11:12.211       '_N_T_/embed/page',
15:11:12.211       '_N_T_/embed'
15:11:12.211     ]
15:11:12.211   }
15:11:12.211 }
15:11:12.211 Unhandled rejection Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.211     at r (.next/server/chunks/657.js:12:54555)
15:11:12.211     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.211     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.211     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.211     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.211     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.211     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.211     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.211   description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.211   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.211 } Promise {
15:11:12.212   <rejected> Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.212       at r (.next/server/chunks/657.js:12:54555)
15:11:12.212       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.212       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.212       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.212       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.212       at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.212       at k (.next/server/chunks/8134.js:119:2380)
15:11:12.212       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.212     description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.212     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.212   },
15:11:12.212   [Symbol(async_id_symbol)]: 24165,
15:11:12.212   [Symbol(trigger_async_id_symbol)]: 24120,
15:11:12.212   [Symbol(kResourceStore)]: {
15:11:12.212     isStaticGeneration: true,
15:11:12.212     page: '/embed/page',
15:11:12.212     fallbackRouteParams: null,
15:11:12.212     route: '/embed',
15:11:12.212     incrementalCache: IncrementalCache {
15:11:12.212       locks: Map(0) {},
15:11:12.212       hasCustomCacheHandler: false,
15:11:12.212       dev: false,
15:11:12.212       disableForTestmode: false,
15:11:12.212       minimalMode: true,
15:11:12.212       requestHeaders: {},
15:11:12.212       allowedRevalidateHeaderKeys: undefined,
15:11:12.212       prerenderManifest: [Object],
15:11:12.212       cacheControls: [SharedCacheControls],
15:11:12.214       fetchCacheKeyPrefix: '',
15:11:12.214       cacheHandler: [FileSystemCache]
15:11:12.214     },
15:11:12.215     cacheLifeProfiles: {
15:11:12.215       default: [Object],
15:11:12.215       seconds: [Object],
15:11:12.215       minutes: [Object],
15:11:12.215       hours: [Object],
15:11:12.215       days: [Object],
15:11:12.215       weeks: [Object],
15:11:12.215       max: [Object]
15:11:12.215     },
15:11:12.215     isRevalidate: true,
15:11:12.215     isBuildTimePrerendering: true,
15:11:12.215     hasReadableErrorStacks: false,
15:11:12.215     fetchCache: undefined,
15:11:12.215     isOnDemandRevalidate: undefined,
15:11:12.215     isDraftMode: undefined,
15:11:12.215     requestEndedState: { ended: false },
15:11:12.215     isPrefetchRequest: false,
15:11:12.215     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.215     reactLoadableManifest: {
15:11:12.215       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.215       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.215       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.215       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.215       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.215       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.215       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.215       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.215       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.215       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.215       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.215       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.215       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.215       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.215       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.215     },
15:11:12.215     assetPrefix: '',
15:11:12.215     afterContext: eJ {
15:11:12.215       workUnitStores: Set(0) {},
15:11:12.215       waitUntil: [Function: bound ],
15:11:12.215       onClose: [Function: bound onClose],
15:11:12.215       onTaskError: [Function: onTaskError],
15:11:12.215       callbackQueue: [o]
15:11:12.215     },
15:11:12.215     dynamicIOEnabled: false,
15:11:12.215     dev: false,
15:11:12.215     previouslyRevalidatedTags: [],
15:11:12.215     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.215     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.215     fetchMetrics: [],
15:11:12.215     dynamicUsageDescription: 'cookies',
15:11:12.215     dynamicUsageStack: "Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.215       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.215       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.215       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.215       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.215       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.215       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.215       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.215       '    at stringify (<anonymous>)\n' +
15:11:12.215       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.215       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.215   },
15:11:12.215   [Symbol(kResourceStore)]: eg {
15:11:12.216     type: 20,
15:11:12.216     status: 14,
15:11:12.216     flushScheduled: false,
15:11:12.216     fatalError: null,
15:11:12.216     destination: null,
15:11:12.216     bundlerConfig: {
15:11:12.216       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.216       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.216       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.216       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.217       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.217     },
15:11:12.217     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.217     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.217     nextChunkId: 30,
15:11:12.217     pendingChunks: 0,
15:11:12.217     hints: Set(16) {
15:11:12.217       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.217       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.217     },
15:11:12.217     abortableTasks: Set(0) {},
15:11:12.217     pingedTasks: [],
15:11:12.217     completedImportChunks: [],
15:11:12.217     completedHintChunks: [],
15:11:12.217     completedRegularChunks: [],
15:11:12.217     completedErrorChunks: [],
15:11:12.217     writtenSymbols: Map(2) {
15:11:12.217       Symbol(react.fragment) => 1,
15:11:12.217       Symbol(react.suspense) => 28
15:11:12.217     },
15:11:12.217     writtenClientReferences: Map(9) {
15:11:12.217       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.217       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.217       '/vercel/path0/node_modules/next/dist/client/components/client-page.js#ClientPageRoot' => 5,
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx#default' => 6,
15:11:12.217       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 9,
15:11:12.217       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 11,
15:11:12.217       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 23,
15:11:12.218       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 25,
15:11:12.218       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 27
15:11:12.218     },
15:11:12.218     writtenServerReferences: Map(0) {},
15:11:12.218     writtenObjects: WeakMap { <items unknown> },
15:11:12.218     temporaryReferences: undefined,
15:11:12.218     identifierPrefix: '',
15:11:12.218     identifierCount: 1,
15:11:12.218     taintCleanupQueue: [],
15:11:12.218     onError: [Function (anonymous)],
15:11:12.218     onPostpone: [Function: X],
15:11:12.218     onAllReady: [Function: X],
15:11:12.218     onFatalError: [Function: X]
15:11:12.218   },
15:11:12.218   [Symbol(kResourceStore)]: undefined,
15:11:12.218   [Symbol(kResourceStore)]: {
15:11:12.218     type: 'prerender-legacy',
15:11:12.218     phase: 'render',
15:11:12.218     rootParams: {},
15:11:12.218     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.218     revalidate: 0,
15:11:12.218     expire: 4294967294,
15:11:12.218     stale: 4294967294,
15:11:12.218     tags: [
15:11:12.218       '_N_T_/layout',
15:11:12.218       '_N_T_/embed/layout',
15:11:12.218       '_N_T_/embed/page',
15:11:12.218       '_N_T_/embed'
15:11:12.218     ]
15:11:12.218   }
15:11:12.218 }
15:11:12.218 Unhandled rejection Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.218     at r (.next/server/chunks/657.js:12:54555)
15:11:12.218     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.218     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.218     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.218     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.218     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.218     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.218     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.218   description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.218   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.218 } Promise {
15:11:12.218   <rejected> Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.218       at r (.next/server/chunks/657.js:12:54555)
15:11:12.218       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.218       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.218       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.218       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.218       at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.218       at k (.next/server/chunks/8134.js:119:2380)
15:11:12.218       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.218     description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.229     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.229   },
15:11:12.229   [Symbol(async_id_symbol)]: 24169,
15:11:12.230   [Symbol(trigger_async_id_symbol)]: 24120,
15:11:12.230   [Symbol(kResourceStore)]: {
15:11:12.230     isStaticGeneration: true,
15:11:12.230     page: '/embed/page',
15:11:12.230     fallbackRouteParams: null,
15:11:12.230     route: '/embed',
15:11:12.230     incrementalCache: IncrementalCache {
15:11:12.230       locks: Map(0) {},
15:11:12.230       hasCustomCacheHandler: false,
15:11:12.230       dev: false,
15:11:12.230       disableForTestmode: false,
15:11:12.230       minimalMode: true,
15:11:12.230       requestHeaders: {},
15:11:12.230       allowedRevalidateHeaderKeys: undefined,
15:11:12.230       prerenderManifest: [Object],
15:11:12.230       cacheControls: [SharedCacheControls],
15:11:12.230       fetchCacheKeyPrefix: '',
15:11:12.230       cacheHandler: [FileSystemCache]
15:11:12.230     },
15:11:12.230     cacheLifeProfiles: {
15:11:12.230       default: [Object],
15:11:12.230       seconds: [Object],
15:11:12.230       minutes: [Object],
15:11:12.230       hours: [Object],
15:11:12.230       days: [Object],
15:11:12.230       weeks: [Object],
15:11:12.230       max: [Object]
15:11:12.230     },
15:11:12.230     isRevalidate: true,
15:11:12.230     isBuildTimePrerendering: true,
15:11:12.230     hasReadableErrorStacks: false,
15:11:12.230     fetchCache: undefined,
15:11:12.230     isOnDemandRevalidate: undefined,
15:11:12.230     isDraftMode: undefined,
15:11:12.230     requestEndedState: { ended: false },
15:11:12.230     isPrefetchRequest: false,
15:11:12.230     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.230     reactLoadableManifest: {
15:11:12.230       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.230       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.230       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.230       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.230       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.230       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.230       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.230       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.230       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.230       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.230       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.230       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.230       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.230       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.230       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.230     },
15:11:12.230     assetPrefix: '',
15:11:12.230     afterContext: eJ {
15:11:12.230       workUnitStores: Set(0) {},
15:11:12.230       waitUntil: [Function: bound ],
15:11:12.231       onClose: [Function: bound onClose],
15:11:12.231       onTaskError: [Function: onTaskError],
15:11:12.231       callbackQueue: [o]
15:11:12.231     },
15:11:12.231     dynamicIOEnabled: false,
15:11:12.231     dev: false,
15:11:12.231     previouslyRevalidatedTags: [],
15:11:12.231     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.231     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.231     fetchMetrics: [],
15:11:12.231     dynamicUsageDescription: 'cookies',
15:11:12.231     dynamicUsageStack: "Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.231       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.231       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.231       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.231       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.231       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.231       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.231       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.231       '    at stringify (<anonymous>)\n' +
15:11:12.231       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.231       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.231   },
15:11:12.231   [Symbol(kResourceStore)]: eg {
15:11:12.231     type: 20,
15:11:12.231     status: 14,
15:11:12.231     flushScheduled: false,
15:11:12.231     fatalError: null,
15:11:12.231     destination: null,
15:11:12.231     bundlerConfig: {
15:11:12.231       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.231       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.231       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.232       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.232       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.232       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.232       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.232       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.233       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.233     },
15:11:12.233     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.233     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.233     nextChunkId: 30,
15:11:12.233     pendingChunks: 0,
15:11:12.233     hints: Set(16) {
15:11:12.233       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.233       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.233     },
15:11:12.233     abortableTasks: Set(0) {},
15:11:12.233     pingedTasks: [],
15:11:12.233     completedImportChunks: [],
15:11:12.233     completedHintChunks: [],
15:11:12.233     completedRegularChunks: [],
15:11:12.233     completedErrorChunks: [],
15:11:12.233     writtenSymbols: Map(2) {
15:11:12.233       Symbol(react.fragment) => 1,
15:11:12.233       Symbol(react.suspense) => 28
15:11:12.233     },
15:11:12.233     writtenClientReferences: Map(9) {
15:11:12.234       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.234       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.234       '/vercel/path0/node_modules/next/dist/client/components/client-page.js#ClientPageRoot' => 5,
15:11:12.234       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx#default' => 6,
15:11:12.234       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 9,
15:11:12.234       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 11,
15:11:12.234       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 23,
15:11:12.234       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 25,
15:11:12.234       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 27
15:11:12.234     },
15:11:12.234     writtenServerReferences: Map(0) {},
15:11:12.234     writtenObjects: WeakMap { <items unknown> },
15:11:12.234     temporaryReferences: undefined,
15:11:12.234     identifierPrefix: '',
15:11:12.234     identifierCount: 1,
15:11:12.234     taintCleanupQueue: [],
15:11:12.234     onError: [Function (anonymous)],
15:11:12.234     onPostpone: [Function: X],
15:11:12.234     onAllReady: [Function: X],
15:11:12.234     onFatalError: [Function: X]
15:11:12.234   },
15:11:12.234   [Symbol(kResourceStore)]: undefined,
15:11:12.234   [Symbol(kResourceStore)]: {
15:11:12.234     type: 'prerender-legacy',
15:11:12.234     phase: 'render',
15:11:12.234     rootParams: {},
15:11:12.234     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.234     revalidate: 0,
15:11:12.234     expire: 4294967294,
15:11:12.234     stale: 4294967294,
15:11:12.234     tags: [
15:11:12.234       '_N_T_/layout',
15:11:12.234       '_N_T_/embed/layout',
15:11:12.243       '_N_T_/embed/page',
15:11:12.243       '_N_T_/embed'
15:11:12.243     ]
15:11:12.243   }
15:11:12.243 }
15:11:12.243 Unhandled rejection Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.243     at r (.next/server/chunks/657.js:12:54555)
15:11:12.243     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.243     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.243     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.243     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.243     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.243     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.243     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.243   description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.243   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.243 } Promise {
15:11:12.243   <rejected> Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.243       at r (.next/server/chunks/657.js:12:54555)
15:11:12.243       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.243       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.243       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.243       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.243       at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.243       at k (.next/server/chunks/8134.js:119:2380)
15:11:12.243       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.243     description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.243     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.243   },
15:11:12.243   [Symbol(async_id_symbol)]: 24158,
15:11:12.243   [Symbol(trigger_async_id_symbol)]: 24120,
15:11:12.243   [Symbol(kResourceStore)]: {
15:11:12.243     isStaticGeneration: true,
15:11:12.243     page: '/embed/page',
15:11:12.243     fallbackRouteParams: null,
15:11:12.243     route: '/embed',
15:11:12.243     incrementalCache: IncrementalCache {
15:11:12.243       locks: Map(0) {},
15:11:12.243       hasCustomCacheHandler: false,
15:11:12.243       dev: false,
15:11:12.243       disableForTestmode: false,
15:11:12.243       minimalMode: true,
15:11:12.243       requestHeaders: {},
15:11:12.243       allowedRevalidateHeaderKeys: undefined,
15:11:12.243       prerenderManifest: [Object],
15:11:12.243       cacheControls: [SharedCacheControls],
15:11:12.243       fetchCacheKeyPrefix: '',
15:11:12.243       cacheHandler: [FileSystemCache]
15:11:12.243     },
15:11:12.243     cacheLifeProfiles: {
15:11:12.243       default: [Object],
15:11:12.243       seconds: [Object],
15:11:12.243       minutes: [Object],
15:11:12.243       hours: [Object],
15:11:12.243       days: [Object],
15:11:12.243       weeks: [Object],
15:11:12.244       max: [Object]
15:11:12.244     },
15:11:12.244     isRevalidate: true,
15:11:12.244     isBuildTimePrerendering: true,
15:11:12.244     hasReadableErrorStacks: false,
15:11:12.244     fetchCache: undefined,
15:11:12.244     isOnDemandRevalidate: undefined,
15:11:12.244     isDraftMode: undefined,
15:11:12.244     requestEndedState: { ended: false },
15:11:12.244     isPrefetchRequest: false,
15:11:12.244     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.244     reactLoadableManifest: {
15:11:12.244       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.244       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.244       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.244       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.244       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.244       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.244       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.244       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.244       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.244       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.244       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.244       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.244       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.244       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.244       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.244     },
15:11:12.244     assetPrefix: '',
15:11:12.244     afterContext: eJ {
15:11:12.244       workUnitStores: Set(0) {},
15:11:12.244       waitUntil: [Function: bound ],
15:11:12.244       onClose: [Function: bound onClose],
15:11:12.244       onTaskError: [Function: onTaskError],
15:11:12.244       callbackQueue: [o]
15:11:12.244     },
15:11:12.244     dynamicIOEnabled: false,
15:11:12.244     dev: false,
15:11:12.244     previouslyRevalidatedTags: [],
15:11:12.244     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.244     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.244     fetchMetrics: [],
15:11:12.244     dynamicUsageDescription: 'cookies',
15:11:12.244     dynamicUsageStack: "Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.244       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.244       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.244       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.244       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.244       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.248       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.248       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.248       '    at stringify (<anonymous>)\n' +
15:11:12.248       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.248       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.248   },
15:11:12.248   [Symbol(kResourceStore)]: eg {
15:11:12.248     type: 20,
15:11:12.249     status: 14,
15:11:12.249     flushScheduled: false,
15:11:12.249     fatalError: null,
15:11:12.249     destination: null,
15:11:12.249     bundlerConfig: {
15:11:12.249       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.249       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.249       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.250       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.250       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.250       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.250     },
15:11:12.250     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.250     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.250     nextChunkId: 30,
15:11:12.250     pendingChunks: 0,
15:11:12.250     hints: Set(16) {
15:11:12.250       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.250       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.250       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.250       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.250       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.250       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.250       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.250       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.250       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.251       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.251       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.251       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.251       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.251       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.251       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.251       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.251     },
15:11:12.251     abortableTasks: Set(0) {},
15:11:12.251     pingedTasks: [],
15:11:12.251     completedImportChunks: [],
15:11:12.251     completedHintChunks: [],
15:11:12.251     completedRegularChunks: [],
15:11:12.251     completedErrorChunks: [],
15:11:12.251     writtenSymbols: Map(2) {
15:11:12.251       Symbol(react.fragment) => 1,
15:11:12.251       Symbol(react.suspense) => 28
15:11:12.251     },
15:11:12.251     writtenClientReferences: Map(9) {
15:11:12.251       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.251       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.251       '/vercel/path0/node_modules/next/dist/client/components/client-page.js#ClientPageRoot' => 5,
15:11:12.251       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx#default' => 6,
15:11:12.251       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 9,
15:11:12.251       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 11,
15:11:12.251       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 23,
15:11:12.251       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 25,
15:11:12.251       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 27
15:11:12.251     },
15:11:12.251     writtenServerReferences: Map(0) {},
15:11:12.251     writtenObjects: WeakMap { <items unknown> },
15:11:12.251     temporaryReferences: undefined,
15:11:12.251     identifierPrefix: '',
15:11:12.251     identifierCount: 1,
15:11:12.251     taintCleanupQueue: [],
15:11:12.251     onError: [Function (anonymous)],
15:11:12.251     onPostpone: [Function: X],
15:11:12.251     onAllReady: [Function: X],
15:11:12.251     onFatalError: [Function: X]
15:11:12.251   },
15:11:12.251   [Symbol(kResourceStore)]: undefined,
15:11:12.251   [Symbol(kResourceStore)]: {
15:11:12.251     type: 'prerender-legacy',
15:11:12.251     phase: 'render',
15:11:12.251     rootParams: {},
15:11:12.251     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.251     revalidate: 0,
15:11:12.252     expire: 4294967294,
15:11:12.252     stale: 4294967294,
15:11:12.252     tags: [
15:11:12.253       '_N_T_/layout',
15:11:12.253       '_N_T_/embed/layout',
15:11:12.253       '_N_T_/embed/page',
15:11:12.253       '_N_T_/embed'
15:11:12.253     ]
15:11:12.253   }
15:11:12.253 }
15:11:12.253 Unhandled rejection Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.253     at r (.next/server/chunks/657.js:12:54555)
15:11:12.253     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.253     at <unknown> (.next/server/chunks/10.js:1:2563)
15:11:12.253     at n (.next/server/chunks/10.js:1:2620)
15:11:12.253     at <unknown> (.next/server/chunks/10.js:205:307)
15:11:12.253     at j (.next/server/chunks/10.js:205:953)
15:11:12.253     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.253   description: "Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.253   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.253 } Promise {
15:11:12.253   <rejected> Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.253       at r (.next/server/chunks/657.js:12:54555)
15:11:12.253       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.253       at <unknown> (.next/server/chunks/10.js:1:2563)
15:11:12.253       at n (.next/server/chunks/10.js:1:2620)
15:11:12.253       at <unknown> (.next/server/chunks/10.js:205:307)
15:11:12.253       at j (.next/server/chunks/10.js:205:953)
15:11:12.253       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.253     description: "Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.253     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.253   },
15:11:12.254   [Symbol(async_id_symbol)]: 24164,
15:11:12.254   [Symbol(trigger_async_id_symbol)]: 24143,
15:11:12.254   [Symbol(kResourceStore)]: {
15:11:12.254     isStaticGeneration: true,
15:11:12.254     page: '/embed/page',
15:11:12.254     fallbackRouteParams: null,
15:11:12.254     route: '/embed',
15:11:12.254     incrementalCache: IncrementalCache {
15:11:12.254       locks: Map(0) {},
15:11:12.254       hasCustomCacheHandler: false,
15:11:12.254       dev: false,
15:11:12.254       disableForTestmode: false,
15:11:12.254       minimalMode: true,
15:11:12.254       requestHeaders: {},
15:11:12.254       allowedRevalidateHeaderKeys: undefined,
15:11:12.254       prerenderManifest: [Object],
15:11:12.254       cacheControls: [SharedCacheControls],
15:11:12.254       fetchCacheKeyPrefix: '',
15:11:12.254       cacheHandler: [FileSystemCache]
15:11:12.254     },
15:11:12.254     cacheLifeProfiles: {
15:11:12.254       default: [Object],
15:11:12.254       seconds: [Object],
15:11:12.254       minutes: [Object],
15:11:12.254       hours: [Object],
15:11:12.254       days: [Object],
15:11:12.254       weeks: [Object],
15:11:12.254       max: [Object]
15:11:12.254     },
15:11:12.254     isRevalidate: true,
15:11:12.254     isBuildTimePrerendering: true,
15:11:12.254     hasReadableErrorStacks: false,
15:11:12.254     fetchCache: undefined,
15:11:12.254     isOnDemandRevalidate: undefined,
15:11:12.254     isDraftMode: undefined,
15:11:12.254     requestEndedState: { ended: false },
15:11:12.254     isPrefetchRequest: false,
15:11:12.254     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.254     reactLoadableManifest: {
15:11:12.254       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.254       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.254       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.254       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.254       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.254       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.254       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.254       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.254       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.255       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.255       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.255       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.255       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.255       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.255       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.255     },
15:11:12.255     assetPrefix: '',
15:11:12.255     afterContext: eJ {
15:11:12.255       workUnitStores: Set(0) {},
15:11:12.255       waitUntil: [Function: bound ],
15:11:12.255       onClose: [Function: bound onClose],
15:11:12.255       onTaskError: [Function: onTaskError],
15:11:12.255       callbackQueue: [o]
15:11:12.255     },
15:11:12.255     dynamicIOEnabled: false,
15:11:12.255     dev: false,
15:11:12.255     previouslyRevalidatedTags: [],
15:11:12.255     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.255     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.255     fetchMetrics: [],
15:11:12.255     dynamicUsageDescription: 'cookies',
15:11:12.255     dynamicUsageStack: "Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.255       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.255       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.255       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.255       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.255       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.255       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.255       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.255       '    at stringify (<anonymous>)\n' +
15:11:12.255       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.255       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.255   },
15:11:12.255   [Symbol(kResourceStore)]: eg {
15:11:12.255     type: 20,
15:11:12.255     status: 14,
15:11:12.255     flushScheduled: false,
15:11:12.255     fatalError: null,
15:11:12.255     destination: null,
15:11:12.255     bundlerConfig: {
15:11:12.255       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.255       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.255       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.255       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.255       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.255       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.256       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.256       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.256       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.257       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.257       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.257     },
15:11:12.257     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.257     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.257     nextChunkId: 30,
15:11:12.257     pendingChunks: 0,
15:11:12.257     hints: Set(16) {
15:11:12.257       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.257       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.257     },
15:11:12.257     abortableTasks: Set(0) {},
15:11:12.257     pingedTasks: [],
15:11:12.257     completedImportChunks: [],
15:11:12.258     completedHintChunks: [],
15:11:12.258     completedRegularChunks: [],
15:11:12.258     completedErrorChunks: [],
15:11:12.258     writtenSymbols: Map(2) {
15:11:12.258       Symbol(react.fragment) => 1,
15:11:12.258       Symbol(react.suspense) => 28
15:11:12.258     },
15:11:12.258     writtenClientReferences: Map(9) {
15:11:12.258       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.258       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.258       '/vercel/path0/node_modules/next/dist/client/components/client-page.js#ClientPageRoot' => 5,
15:11:12.258       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx#default' => 6,
15:11:12.258       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 9,
15:11:12.258       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 11,
15:11:12.258       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 23,
15:11:12.258       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 25,
15:11:12.258       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 27
15:11:12.258     },
15:11:12.258     writtenServerReferences: Map(0) {},
15:11:12.258     writtenObjects: WeakMap { <items unknown> },
15:11:12.258     temporaryReferences: undefined,
15:11:12.258     identifierPrefix: '',
15:11:12.258     identifierCount: 1,
15:11:12.258     taintCleanupQueue: [],
15:11:12.258     onError: [Function (anonymous)],
15:11:12.258     onPostpone: [Function: X],
15:11:12.258     onAllReady: [Function: X],
15:11:12.258     onFatalError: [Function: X]
15:11:12.258   },
15:11:12.258   [Symbol(kResourceStore)]: undefined,
15:11:12.258   [Symbol(kResourceStore)]: {
15:11:12.258     type: 'prerender-legacy',
15:11:12.258     phase: 'render',
15:11:12.258     rootParams: {},
15:11:12.258     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.258     revalidate: 0,
15:11:12.258     expire: 4294967294,
15:11:12.258     stale: 4294967294,
15:11:12.258     tags: [
15:11:12.259       '_N_T_/layout',
15:11:12.259       '_N_T_/embed/layout',
15:11:12.259       '_N_T_/embed/page',
15:11:12.259       '_N_T_/embed'
15:11:12.259     ]
15:11:12.259   }
15:11:12.259 }
15:11:12.259 Unhandled rejection Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.259     at r (.next/server/chunks/657.js:12:54555)
15:11:12.259     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.259     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.259     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.259     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.259     at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.259     at k (.next/server/chunks/8134.js:119:2380)
15:11:12.259     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.259   description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.259   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.259 } Promise {
15:11:12.259   <rejected> Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.259       at r (.next/server/chunks/657.js:12:54555)
15:11:12.259       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.259       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.259       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.259       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.259       at <unknown> (.next/server/chunks/8134.js:119:2083)
15:11:12.259       at k (.next/server/chunks/8134.js:119:2380)
15:11:12.259       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.259     description: "Route /embed couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.259     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.259   },
15:11:12.259   [Symbol(async_id_symbol)]: 24151,
15:11:12.259   [Symbol(trigger_async_id_symbol)]: 24120,
15:11:12.259   [Symbol(kResourceStore)]: {
15:11:12.259     isStaticGeneration: true,
15:11:12.259     page: '/embed/page',
15:11:12.259     fallbackRouteParams: null,
15:11:12.259     route: '/embed',
15:11:12.259     incrementalCache: IncrementalCache {
15:11:12.259       locks: Map(0) {},
15:11:12.260       hasCustomCacheHandler: false,
15:11:12.260       dev: false,
15:11:12.260       disableForTestmode: false,
15:11:12.260       minimalMode: true,
15:11:12.260       requestHeaders: {},
15:11:12.260       allowedRevalidateHeaderKeys: undefined,
15:11:12.260       prerenderManifest: [Object],
15:11:12.260       cacheControls: [SharedCacheControls],
15:11:12.260       fetchCacheKeyPrefix: '',
15:11:12.260       cacheHandler: [FileSystemCache]
15:11:12.260     },
15:11:12.260     cacheLifeProfiles: {
15:11:12.260       default: [Object],
15:11:12.260       seconds: [Object],
15:11:12.260       minutes: [Object],
15:11:12.260       hours: [Object],
15:11:12.260       days: [Object],
15:11:12.260       weeks: [Object],
15:11:12.260       max: [Object]
15:11:12.260     },
15:11:12.260     isRevalidate: true,
15:11:12.260     isBuildTimePrerendering: true,
15:11:12.260     hasReadableErrorStacks: false,
15:11:12.260     fetchCache: undefined,
15:11:12.260     isOnDemandRevalidate: undefined,
15:11:12.267     isDraftMode: undefined,
15:11:12.267     requestEndedState: { ended: false },
15:11:12.267     isPrefetchRequest: false,
15:11:12.267     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.267     reactLoadableManifest: {
15:11:12.267       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.267       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.267       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.267       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.267       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.267       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.267       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.267       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.267       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.267       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.267       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.267       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.267       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.267       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.267       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.267     },
15:11:12.267     assetPrefix: '',
15:11:12.267     afterContext: eJ {
15:11:12.267       workUnitStores: Set(0) {},
15:11:12.267       waitUntil: [Function: bound ],
15:11:12.267       onClose: [Function: bound onClose],
15:11:12.268       onTaskError: [Function: onTaskError],
15:11:12.268       callbackQueue: [o]
15:11:12.268     },
15:11:12.268     dynamicIOEnabled: false,
15:11:12.268     dev: false,
15:11:12.268     previouslyRevalidatedTags: [],
15:11:12.268     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.268     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.268     fetchMetrics: [],
15:11:12.268     dynamicUsageDescription: 'cookies',
15:11:12.268     dynamicUsageStack: "Error: Dynamic server usage: Route /embed couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.268       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.268       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.268       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.268       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.268       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.268       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.268       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.268       '    at stringify (<anonymous>)\n' +
15:11:12.268       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.268       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.268   },
15:11:12.268   [Symbol(kResourceStore)]: eg {
15:11:12.268     type: 20,
15:11:12.268     status: 14,
15:11:12.268     flushScheduled: false,
15:11:12.268     fatalError: null,
15:11:12.268     destination: null,
15:11:12.268     bundlerConfig: {
15:11:12.268       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.268       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.269       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.269       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.269       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.269       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.269       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.346       '/vercel/path0/apps/agents-server/src/app/admin/voice
15:11:12.346  ✓ Generating static pages (106/106)
15:11:12.518 rror.tsx#default' => 19,
15:11:12.518       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.518       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.518     },
15:11:12.518     writtenServerReferences: Map(0) {},
15:11:12.518     writtenObjects: WeakMap { <items unknown> },
15:11:12.518     temporaryReferences: undefined,
15:11:12.518     identifierPrefix: '',
15:11:12.518     identifierCount: 1,
15:11:12.518     taintCleanupQueue: [],
15:11:12.518     onError: [Function (anonymous)],
15:11:12.518     onPostpone: [Function: X],
15:11:12.518     onAllReady: [Function: X],
15:11:12.518     onFatalError: [Function: X]
15:11:12.518   },
15:11:12.518   [Symbol(kResourceStore)]: undefined,
15:11:12.518   [Symbol(kResourceStore)]: {
15:11:12.518     type: 'prerender-legacy',
15:11:12.518     phase: 'render',
15:11:12.518     rootParams: {},
15:11:12.518     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.518     revalidate: 0,
15:11:12.519     expire: 4294967294,
15:11:12.519     stale: 4294967294,
15:11:12.519     tags: [
15:11:12.519       '_N_T_/layout',
15:11:12.519       '_N_T_/admin/layout',
15:11:12.519       '_N_T_/admin/api-tokens/layout',
15:11:12.519       '_N_T_/admin/api-tokens/page',
15:11:12.519       '_N_T_/admin/api-tokens'
15:11:12.519     ]
15:11:12.519   }
15:11:12.519 }
15:11:12.519 Failed to load custom stylesheet CSS Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.519     at r (.next/server/chunks/657.js:12:54555)
15:11:12.519     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.519     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.519     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.519     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.519     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.519     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.519     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.519   description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.519   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.519 }
15:11:12.519 Failed to load custom JavaScript Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.519     at r (.next/server/chunks/657.js:12:54555)
15:11:12.519     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.519     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.519     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.519     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.519     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.519     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.519     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.519   description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.519   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.519 }
15:11:12.519 Unhandled rejection Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.519     at r (.next/server/chunks/657.js:12:54555)
15:11:12.519     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.519     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.519     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.519     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.519     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.519     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.519   description: "Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.519   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.519 } Promise {
15:11:12.519   <rejected> Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.519       at r (.next/server/chunks/657.js:12:54555)
15:11:12.519       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.520       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.520       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.520       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.520       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.520       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.520     description: "Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.520     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.520   },
15:11:12.520   [Symbol(async_id_symbol)]: 1783,
15:11:12.520   [Symbol(trigger_async_id_symbol)]: 1765,
15:11:12.520   [Symbol(kResourceStore)]: undefined,
15:11:12.520   [Symbol(kResourceStore)]: {
15:11:12.520     isStaticGeneration: true,
15:11:12.520     page: '/admin/backup/page',
15:11:12.520     fallbackRouteParams: null,
15:11:12.520     route: '/admin/backup',
15:11:12.520     incrementalCache: IncrementalCache {
15:11:12.520       locks: Map(0) {},
15:11:12.520       hasCustomCacheHandler: false,
15:11:12.520       dev: false,
15:11:12.520       disableForTestmode: false,
15:11:12.520       minimalMode: true,
15:11:12.520       requestHeaders: {},
15:11:12.520       allowedRevalidateHeaderKeys: undefined,
15:11:12.520       prerenderManifest: [Object],
15:11:12.520       cacheControls: [SharedCacheControls],
15:11:12.520       fetchCacheKeyPrefix: '',
15:11:12.520       cacheHandler: [FileSystemCache]
15:11:12.520     },
15:11:12.520     cacheLifeProfiles: {
15:11:12.520       default: [Object],
15:11:12.520       seconds: [Object],
15:11:12.520       minutes: [Object],
15:11:12.520       hours: [Object],
15:11:12.520       days: [Object],
15:11:12.520       weeks: [Object],
15:11:12.520       max: [Object]
15:11:12.520     },
15:11:12.520     isRevalidate: true,
15:11:12.520     isBuildTimePrerendering: true,
15:11:12.520     hasReadableErrorStacks: false,
15:11:12.520     fetchCache: undefined,
15:11:12.520     isOnDemandRevalidate: undefined,
15:11:12.520     isDraftMode: undefined,
15:11:12.520     requestEndedState: { ended: false },
15:11:12.520     isPrefetchRequest: false,
15:11:12.520     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.520     reactLoadableManifest: {
15:11:12.520       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.520       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.520       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.521       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.521       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.521       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.521       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.521       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.521       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.521       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.521       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.521       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.521       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.521       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.521       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.521     },
15:11:12.521     assetPrefix: '',
15:11:12.521     afterContext: eJ {
15:11:12.521       workUnitStores: Set(0) {},
15:11:12.521       waitUntil: [Function: bound ],
15:11:12.521       onClose: [Function: bound onClose],
15:11:12.521       onTaskError: [Function: onTaskError],
15:11:12.521       callbackQueue: [o]
15:11:12.521     },
15:11:12.521     dynamicIOEnabled: false,
15:11:12.521     dev: false,
15:11:12.521     previouslyRevalidatedTags: [],
15:11:12.521     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.521     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.521     fetchMetrics: [],
15:11:12.521     dynamicUsageDescription: 'cookies',
15:11:12.521     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.521       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.521       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.521       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.521       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.521       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.521       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.521       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.521       '    at stringify (<anonymous>)\n' +
15:11:12.521       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.521       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.521   },
15:11:12.521   [Symbol(kResourceStore)]: eg {
15:11:12.521     type: 20,
15:11:12.521     status: 14,
15:11:12.521     flushScheduled: false,
15:11:12.521     fatalError: null,
15:11:12.521     destination: null,
15:11:12.521     bundlerConfig: {
15:11:12.521       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.521       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.522       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.522       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.523       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.523       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.523       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.523     },
15:11:12.523     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.523     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.523     nextChunkId: 26,
15:11:12.523     pendingChunks: 0,
15:11:12.523     hints: Set(16) {
15:11:12.523       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.523       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.523       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.523       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.523       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.523       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.524       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.524     },
15:11:12.524     abortableTasks: Set(0) {},
15:11:12.524     pingedTasks: [],
15:11:12.524     completedImportChunks: [],
15:11:12.524     completedHintChunks: [],
15:11:12.524     completedRegularChunks: [],
15:11:12.524     completedErrorChunks: [],
15:11:12.524     writtenSymbols: Map(2) {
15:11:12.524       Symbol(react.fragment) => 1,
15:11:12.524       Symbol(react.suspense) => 24
15:11:12.524     },
15:11:12.524     writtenClientReferences: Map(7) {
15:11:12.524       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.524       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.524       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.524       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.524       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.524       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.524       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.524     },
15:11:12.524     writtenServerReferences: Map(0) {},
15:11:12.524     writtenObjects: WeakMap { <items unknown> },
15:11:12.524     temporaryReferences: undefined,
15:11:12.524     identifierPrefix: '',
15:11:12.524     identifierCount: 1,
15:11:12.524     taintCleanupQueue: [],
15:11:12.524     onError: [Function (anonymous)],
15:11:12.524     onPostpone: [Function: X],
15:11:12.524     onAllReady: [Function: X],
15:11:12.524     onFatalError: [Function: X]
15:11:12.524   },
15:11:12.524   [Symbol(kResourceStore)]: undefined,
15:11:12.524   [Symbol(kResourceStore)]: {
15:11:12.524     type: 'prerender-legacy',
15:11:12.524     phase: 'render',
15:11:12.524     rootParams: {},
15:11:12.524     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.524     revalidate: 0,
15:11:12.525     expire: 4294967294,
15:11:12.525     stale: 4294967294,
15:11:12.525     tags: [
15:11:12.525       '_N_T_/layout',
15:11:12.525       '_N_T_/admin/layout',
15:11:12.525       '_N_T_/admin/backup/layout',
15:11:12.525       '_N_T_/admin/backup/page',
15:11:12.525       '_N_T_/admin/backup'
15:11:12.525     ]
15:11:12.525   }
15:11:12.525 }
15:11:12.525 Unhandled rejection Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.525     at r (.next/server/chunks/657.js:12:54555)
15:11:12.525     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.525     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.525     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.525     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.525     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.525     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.525   description: "Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.525   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.525 } Promise {
15:11:12.525   <rejected> Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.525       at r (.next/server/chunks/657.js:12:54555)
15:11:12.525       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.525       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.525       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.525       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.525       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.525       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.525     description: "Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.525     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.525   },
15:11:12.525   [Symbol(async_id_symbol)]: 1792,
15:11:12.525   [Symbol(trigger_async_id_symbol)]: 1765,
15:11:12.525   [Symbol(kResourceStore)]: undefined,
15:11:12.525   [Symbol(kResourceStore)]: {
15:11:12.525     isStaticGeneration: true,
15:11:12.525     page: '/admin/backup/page',
15:11:12.525     fallbackRouteParams: null,
15:11:12.525     route: '/admin/backup',
15:11:12.525     incrementalCache: IncrementalCache {
15:11:12.525       locks: Map(0) {},
15:11:12.525       hasCustomCacheHandler: false,
15:11:12.525       dev: false,
15:11:12.525       disableForTestmode: false,
15:11:12.525       minimalMode: true,
15:11:12.525       requestHeaders: {},
15:11:12.525       allowedRevalidateHeaderKeys: undefined,
15:11:12.526       prerenderManifest: [Object],
15:11:12.526       cacheControls: [SharedCacheControls],
15:11:12.526       fetchCacheKeyPrefix: '',
15:11:12.526       cacheHandler: [FileSystemCache]
15:11:12.526     },
15:11:12.526     cacheLifeProfiles: {
15:11:12.526       default: [Object],
15:11:12.526       seconds: [Object],
15:11:12.526       minutes: [Object],
15:11:12.526       hours: [Object],
15:11:12.526       days: [Object],
15:11:12.526       weeks: [Object],
15:11:12.526       max: [Object]
15:11:12.526     },
15:11:12.526     isRevalidate: true,
15:11:12.526     isBuildTimePrerendering: true,
15:11:12.526     hasReadableErrorStacks: false,
15:11:12.526     fetchCache: undefined,
15:11:12.526     isOnDemandRevalidate: undefined,
15:11:12.526     isDraftMode: undefined,
15:11:12.526     requestEndedState: { ended: false },
15:11:12.526     isPrefetchRequest: false,
15:11:12.526     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.526     reactLoadableManifest: {
15:11:12.526       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.526       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.526       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.526       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.526       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.526       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.526       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.526       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.526       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.526       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.526       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.526       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.526       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.526       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.526       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.526     },
15:11:12.526     assetPrefix: '',
15:11:12.526     afterContext: eJ {
15:11:12.526       workUnitStores: Set(0) {},
15:11:12.526       waitUntil: [Function: bound ],
15:11:12.526       onClose: [Function: bound onClose],
15:11:12.527       onTaskError: [Function: onTaskError],
15:11:12.527       callbackQueue: [o]
15:11:12.527     },
15:11:12.527     dynamicIOEnabled: false,
15:11:12.527     dev: false,
15:11:12.527     previouslyRevalidatedTags: [],
15:11:12.527     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.527     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.527     fetchMetrics: [],
15:11:12.527     dynamicUsageDescription: 'cookies',
15:11:12.527     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.527       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.527       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.527       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.527       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.527       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.527       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.527       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.527       '    at stringify (<anonymous>)\n' +
15:11:12.527       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.527       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.527   },
15:11:12.527   [Symbol(kResourceStore)]: eg {
15:11:12.527     type: 20,
15:11:12.527     status: 14,
15:11:12.527     flushScheduled: false,
15:11:12.527     fatalError: null,
15:11:12.527     destination: null,
15:11:12.527     bundlerConfig: {
15:11:12.527       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.527       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.527       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.528       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.528       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.528       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.528       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.528       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.528       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.529       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.529       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.529     },
15:11:12.529     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.529     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.529     nextChunkId: 26,
15:11:12.529     pendingChunks: 0,
15:11:12.529     hints: Set(16) {
15:11:12.529       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.529       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.529     },
15:11:12.529     abortableTasks: Set(0) {},
15:11:12.529     pingedTasks: [],
15:11:12.529     completedImportChunks: [],
15:11:12.529     completedHintChunks: [],
15:11:12.529     completedRegularChunks: [],
15:11:12.529     completedErrorChunks: [],
15:11:12.530     writtenSymbols: Map(2) {
15:11:12.530       Symbol(react.fragment) => 1,
15:11:12.530       Symbol(react.suspense) => 24
15:11:12.530     },
15:11:12.530     writtenClientReferences: Map(7) {
15:11:12.530       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.530       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.530       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.530       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.530       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.530       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.530       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.530     },
15:11:12.530     writtenServerReferences: Map(0) {},
15:11:12.530     writtenObjects: WeakMap { <items unknown> },
15:11:12.530     temporaryReferences: undefined,
15:11:12.530     identifierPrefix: '',
15:11:12.530     identifierCount: 1,
15:11:12.530     taintCleanupQueue: [],
15:11:12.530     onError: [Function (anonymous)],
15:11:12.530     onPostpone: [Function: X],
15:11:12.530     onAllReady: [Function: X],
15:11:12.530     onFatalError: [Function: X]
15:11:12.530   },
15:11:12.530   [Symbol(kResourceStore)]: undefined,
15:11:12.530   [Symbol(kResourceStore)]: {
15:11:12.530     type: 'prerender-legacy',
15:11:12.530     phase: 'render',
15:11:12.530     rootParams: {},
15:11:12.530     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.530     revalidate: 0,
15:11:12.530     expire: 4294967294,
15:11:12.530     stale: 4294967294,
15:11:12.530     tags: [
15:11:12.530       '_N_T_/layout',
15:11:12.530       '_N_T_/admin/layout',
15:11:12.530       '_N_T_/admin/backup/layout',
15:11:12.530       '_N_T_/admin/backup/page',
15:11:12.530       '_N_T_/admin/backup'
15:11:12.530     ]
15:11:12.530   }
15:11:12.530 }
15:11:12.530 Unhandled rejection Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.530     at r (.next/server/chunks/657.js:12:54555)
15:11:12.530     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.530     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.530     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.530     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.530     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.531     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.531     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.531   description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.531   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.531 } Promise {
15:11:12.531   <rejected> Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.531       at r (.next/server/chunks/657.js:12:54555)
15:11:12.531       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.531       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.531       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.531       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.531       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.531       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.531       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.531     description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.531     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.531   },
15:11:12.531   [Symbol(async_id_symbol)]: 1775,
15:11:12.531   [Symbol(trigger_async_id_symbol)]: 1765,
15:11:12.531   [Symbol(kResourceStore)]: undefined,
15:11:12.531   [Symbol(kResourceStore)]: {
15:11:12.531     isStaticGeneration: true,
15:11:12.531     page: '/admin/backup/page',
15:11:12.531     fallbackRouteParams: null,
15:11:12.531     route: '/admin/backup',
15:11:12.531     incrementalCache: IncrementalCache {
15:11:12.531       locks: Map(0) {},
15:11:12.531       hasCustomCacheHandler: false,
15:11:12.531       dev: false,
15:11:12.531       disableForTestmode: false,
15:11:12.531       minimalMode: true,
15:11:12.531       requestHeaders: {},
15:11:12.531       allowedRevalidateHeaderKeys: undefined,
15:11:12.531       prerenderManifest: [Object],
15:11:12.531       cacheControls: [SharedCacheControls],
15:11:12.531       fetchCacheKeyPrefix: '',
15:11:12.531       cacheHandler: [FileSystemCache]
15:11:12.531     },
15:11:12.531     cacheLifeProfiles: {
15:11:12.531       default: [Object],
15:11:12.531       seconds: [Object],
15:11:12.531       minutes: [Object],
15:11:12.531       hours: [Object],
15:11:12.531       days: [Object],
15:11:12.531       weeks: [Object],
15:11:12.531       max: [Object]
15:11:12.531     },
15:11:12.531     isRevalidate: true,
15:11:12.531     isBuildTimePrerendering: true,
15:11:12.531     hasReadableErrorStacks: false,
15:11:12.531     fetchCache: undefined,
15:11:12.531     isOnDemandRevalidate: undefined,
15:11:12.531     isDraftMode: undefined,
15:11:12.531     requestEndedState: { ended: false },
15:11:12.532     isPrefetchRequest: false,
15:11:12.532     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.532     reactLoadableManifest: {
15:11:12.532       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.532       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.532       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.532       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.532       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.532       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.532       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.532       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.532       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.532       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.532       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.532       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.532       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.532       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.532       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.532     },
15:11:12.532     assetPrefix: '',
15:11:12.532     afterContext: eJ {
15:11:12.532       workUnitStores: Set(0) {},
15:11:12.532       waitUntil: [Function: bound ],
15:11:12.532       onClose: [Function: bound onClose],
15:11:12.532       onTaskError: [Function: onTaskError],
15:11:12.532       callbackQueue: [o]
15:11:12.532     },
15:11:12.532     dynamicIOEnabled: false,
15:11:12.532     dev: false,
15:11:12.532     previouslyRevalidatedTags: [],
15:11:12.532     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.532     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.532     fetchMetrics: [],
15:11:12.532     dynamicUsageDescription: 'cookies',
15:11:12.532     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.532       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.532       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.532       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.532       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.532       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.532       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.532       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.532       '    at stringify (<anonymous>)\n' +
15:11:12.532       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.532       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.532   },
15:11:12.532   [Symbol(kResourceStore)]: eg {
15:11:12.533     type: 20,
15:11:12.533     status: 14,
15:11:12.533     flushScheduled: false,
15:11:12.533     fatalError: null,
15:11:12.533     destination: null,
15:11:12.533     bundlerConfig: {
15:11:12.533       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.533       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.533       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.534       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.534       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.534       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.534     },
15:11:12.534     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.534     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.534     nextChunkId: 26,
15:11:12.534     pendingChunks: 0,
15:11:12.534     hints: Set(16) {
15:11:12.534       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.534       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.534       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.534       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.534       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.535       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.535     },
15:11:12.535     abortableTasks: Set(0) {},
15:11:12.535     pingedTasks: [],
15:11:12.535     completedImportChunks: [],
15:11:12.535     completedHintChunks: [],
15:11:12.535     completedRegularChunks: [],
15:11:12.535     completedErrorChunks: [],
15:11:12.535     writtenSymbols: Map(2) {
15:11:12.535       Symbol(react.fragment) => 1,
15:11:12.535       Symbol(react.suspense) => 24
15:11:12.535     },
15:11:12.535     writtenClientReferences: Map(7) {
15:11:12.535       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.535       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.535       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.535       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.535       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.535       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.535       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.535     },
15:11:12.535     writtenServerReferences: Map(0) {},
15:11:12.535     writtenObjects: WeakMap { <items unknown> },
15:11:12.535     temporaryReferences: undefined,
15:11:12.535     identifierPrefix: '',
15:11:12.535     identifierCount: 1,
15:11:12.535     taintCleanupQueue: [],
15:11:12.535     onError: [Function (anonymous)],
15:11:12.535     onPostpone: [Function: X],
15:11:12.535     onAllReady: [Function: X],
15:11:12.535     onFatalError: [Function: X]
15:11:12.535   },
15:11:12.535   [Symbol(kResourceStore)]: undefined,
15:11:12.535   [Symbol(kResourceStore)]: {
15:11:12.535     type: 'prerender-legacy',
15:11:12.535     phase: 'render',
15:11:12.535     rootParams: {},
15:11:12.535     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.535     revalidate: 0,
15:11:12.535     expire: 4294967294,
15:11:12.535     stale: 4294967294,
15:11:12.535     tags: [
15:11:12.536       '_N_T_/layout',
15:11:12.536       '_N_T_/admin/layout',
15:11:12.536       '_N_T_/admin/backup/layout',
15:11:12.536       '_N_T_/admin/backup/page',
15:11:12.536       '_N_T_/admin/backup'
15:11:12.536     ]
15:11:12.536   }
15:11:12.536 }
15:11:12.536 Unhandled rejection Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.536     at r (.next/server/chunks/657.js:12:54555)
15:11:12.536     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.536     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.536     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.536     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.536     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.536     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.536     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.536   description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.536   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.536 } Promise {
15:11:12.536   <rejected> Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.536       at r (.next/server/chunks/657.js:12:54555)
15:11:12.536       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.536       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.536       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.536       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.536       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.536       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.536       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.536     description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.536     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.536   },
15:11:12.536   [Symbol(async_id_symbol)]: 1810,
15:11:12.536   [Symbol(trigger_async_id_symbol)]: 1765,
15:11:12.536   [Symbol(kResourceStore)]: undefined,
15:11:12.536   [Symbol(kResourceStore)]: {
15:11:12.536     isStaticGeneration: true,
15:11:12.536     page: '/admin/backup/page',
15:11:12.536     fallbackRouteParams: null,
15:11:12.536     route: '/admin/backup',
15:11:12.536     incrementalCache: IncrementalCache {
15:11:12.536       locks: Map(0) {},
15:11:12.536       hasCustomCacheHandler: false,
15:11:12.536       dev: false,
15:11:12.536       disableForTestmode: false,
15:11:12.536       minimalMode: true,
15:11:12.536       requestHeaders: {},
15:11:12.536       allowedRevalidateHeaderKeys: undefined,
15:11:12.536       prerenderManifest: [Object],
15:11:12.536       cacheControls: [SharedCacheControls],
15:11:12.536       fetchCacheKeyPrefix: '',
15:11:12.537       cacheHandler: [FileSystemCache]
15:11:12.537     },
15:11:12.537     cacheLifeProfiles: {
15:11:12.537       default: [Object],
15:11:12.537       seconds: [Object],
15:11:12.537       minutes: [Object],
15:11:12.537       hours: [Object],
15:11:12.537       days: [Object],
15:11:12.537       weeks: [Object],
15:11:12.537       max: [Object]
15:11:12.537     },
15:11:12.537     isRevalidate: true,
15:11:12.537     isBuildTimePrerendering: true,
15:11:12.537     hasReadableErrorStacks: false,
15:11:12.537     fetchCache: undefined,
15:11:12.537     isOnDemandRevalidate: undefined,
15:11:12.537     isDraftMode: undefined,
15:11:12.537     requestEndedState: { ended: false },
15:11:12.537     isPrefetchRequest: false,
15:11:12.537     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.537     reactLoadableManifest: {
15:11:12.537       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.537       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.537       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.537       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.537       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.537       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.537       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.537       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.537       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.537       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.537       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.537       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.537       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.537       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.537       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.537     },
15:11:12.537     assetPrefix: '',
15:11:12.537     afterContext: eJ {
15:11:12.537       workUnitStores: Set(0) {},
15:11:12.537       waitUntil: [Function: bound ],
15:11:12.537       onClose: [Function: bound onClose],
15:11:12.537       onTaskError: [Function: onTaskError],
15:11:12.537       callbackQueue: [o]
15:11:12.537     },
15:11:12.537     dynamicIOEnabled: false,
15:11:12.537     dev: false,
15:11:12.537     previouslyRevalidatedTags: [],
15:11:12.537     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.537     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.538     fetchMetrics: [],
15:11:12.538     dynamicUsageDescription: 'cookies',
15:11:12.538     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.538       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.538       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.538       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.538       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.538       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.538       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.538       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.538       '    at stringify (<anonymous>)\n' +
15:11:12.538       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.538       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.538   },
15:11:12.538   [Symbol(kResourceStore)]: eg {
15:11:12.538     type: 20,
15:11:12.538     status: 14,
15:11:12.538     flushScheduled: false,
15:11:12.538     fatalError: null,
15:11:12.538     destination: null,
15:11:12.538     bundlerConfig: {
15:11:12.538       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.538       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.538       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.538       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.538       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.539       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.539       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.539       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.539       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.540       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.540     },
15:11:12.540     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.540     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.540     nextChunkId: 26,
15:11:12.540     pendingChunks: 0,
15:11:12.540     hints: Set(16) {
15:11:12.540       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.540       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.540     },
15:11:12.540     abortableTasks: Set(0) {},
15:11:12.540     pingedTasks: [],
15:11:12.540     completedImportChunks: [],
15:11:12.540     completedHintChunks: [],
15:11:12.540     completedRegularChunks: [],
15:11:12.540     completedErrorChunks: [],
15:11:12.540     writtenSymbols: Map(2) {
15:11:12.540       Symbol(react.fragment) => 1,
15:11:12.540       Symbol(react.suspense) => 24
15:11:12.540     },
15:11:12.540     writtenClientReferences: Map(7) {
15:11:12.540       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.540       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.540       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.540       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.540       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.541       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.541       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.541     },
15:11:12.541     writtenServerReferences: Map(0) {},
15:11:12.541     writtenObjects: WeakMap { <items unknown> },
15:11:12.541     temporaryReferences: undefined,
15:11:12.541     identifierPrefix: '',
15:11:12.541     identifierCount: 1,
15:11:12.541     taintCleanupQueue: [],
15:11:12.541     onError: [Function (anonymous)],
15:11:12.541     onPostpone: [Function: X],
15:11:12.541     onAllReady: [Function: X],
15:11:12.541     onFatalError: [Function: X]
15:11:12.541   },
15:11:12.541   [Symbol(kResourceStore)]: undefined,
15:11:12.541   [Symbol(kResourceStore)]: {
15:11:12.541     type: 'prerender-legacy',
15:11:12.541     phase: 'render',
15:11:12.541     rootParams: {},
15:11:12.541     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.541     revalidate: 0,
15:11:12.541     expire: 4294967294,
15:11:12.541     stale: 4294967294,
15:11:12.541     tags: [
15:11:12.541       '_N_T_/layout',
15:11:12.541       '_N_T_/admin/layout',
15:11:12.541       '_N_T_/admin/backup/layout',
15:11:12.541       '_N_T_/admin/backup/page',
15:11:12.541       '_N_T_/admin/backup'
15:11:12.541     ]
15:11:12.541   }
15:11:12.541 }
15:11:12.541 Unhandled rejection Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.541     at r (.next/server/chunks/657.js:12:54555)
15:11:12.541     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.541     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.541     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.541     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.541     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.541     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.541     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.541   description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.541   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.541 } Promise {
15:11:12.541   <rejected> Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.541       at r (.next/server/chunks/657.js:12:54555)
15:11:12.541       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.541       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.541       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.541       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.541       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.541       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.541       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.541     description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.541     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.541   },
15:11:12.541   [Symbol(async_id_symbol)]: 1814,
15:11:12.541   [Symbol(trigger_async_id_symbol)]: 1765,
15:11:12.542   [Symbol(kResourceStore)]: undefined,
15:11:12.542   [Symbol(kResourceStore)]: {
15:11:12.542     isStaticGeneration: true,
15:11:12.542     page: '/admin/backup/page',
15:11:12.542     fallbackRouteParams: null,
15:11:12.542     route: '/admin/backup',
15:11:12.542     incrementalCache: IncrementalCache {
15:11:12.542       locks: Map(0) {},
15:11:12.542       hasCustomCacheHandler: false,
15:11:12.542       dev: false,
15:11:12.542       disableForTestmode: false,
15:11:12.542       minimalMode: true,
15:11:12.542       requestHeaders: {},
15:11:12.542       allowedRevalidateHeaderKeys: undefined,
15:11:12.542       prerenderManifest: [Object],
15:11:12.542       cacheControls: [SharedCacheControls],
15:11:12.542       fetchCacheKeyPrefix: '',
15:11:12.542       cacheHandler: [FileSystemCache]
15:11:12.542     },
15:11:12.542     cacheLifeProfiles: {
15:11:12.542       default: [Object],
15:11:12.542       seconds: [Object],
15:11:12.542       minutes: [Object],
15:11:12.542       hours: [Object],
15:11:12.542       days: [Object],
15:11:12.542       weeks: [Object],
15:11:12.542       max: [Object]
15:11:12.542     },
15:11:12.542     isRevalidate: true,
15:11:12.542     isBuildTimePrerendering: true,
15:11:12.542     hasReadableErrorStacks: false,
15:11:12.542     fetchCache: undefined,
15:11:12.542     isOnDemandRevalidate: undefined,
15:11:12.542     isDraftMode: undefined,
15:11:12.542     requestEndedState: { ended: false },
15:11:12.542     isPrefetchRequest: false,
15:11:12.542     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.542     reactLoadableManifest: {
15:11:12.542       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.542       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.542       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.542       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.542       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.542       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.542       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.542       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.542       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.542       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.542       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.542       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.542       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.542       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.542       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.542     },
15:11:12.542     assetPrefix: '',
15:11:12.542     afterContext: eJ {
15:11:12.542       workUnitStores: Set(0) {},
15:11:12.543       waitUntil: [Function: bound ],
15:11:12.543       onClose: [Function: bound onClose],
15:11:12.543       onTaskError: [Function: onTaskError],
15:11:12.543       callbackQueue: [o]
15:11:12.543     },
15:11:12.543     dynamicIOEnabled: false,
15:11:12.543     dev: false,
15:11:12.543     previouslyRevalidatedTags: [],
15:11:12.543     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.543     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.543     fetchMetrics: [],
15:11:12.543     dynamicUsageDescription: 'cookies',
15:11:12.543     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.543       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.543       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.543       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.543       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.545       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.546       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.546       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.546       '    at stringify (<anonymous>)\n' +
15:11:12.546       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.546       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.546   },
15:11:12.546   [Symbol(kResourceStore)]: eg {
15:11:12.546     type: 20,
15:11:12.546     status: 14,
15:11:12.546     flushScheduled: false,
15:11:12.546     fatalError: null,
15:11:12.546     destination: null,
15:11:12.546     bundlerConfig: {
15:11:12.546       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.546       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.546       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.547       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.547       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.547       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.548       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.548       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.548       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.548       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.548     },
15:11:12.548     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.548     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.548     nextChunkId: 26,
15:11:12.548     pendingChunks: 0,
15:11:12.548     hints: Set(16) {
15:11:12.548       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.548       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.548     },
15:11:12.548     abortableTasks: Set(0) {},
15:11:12.548     pingedTasks: [],
15:11:12.548     completedImportChunks: [],
15:11:12.548     completedHintChunks: [],
15:11:12.548     completedRegularChunks: [],
15:11:12.548     completedErrorChunks: [],
15:11:12.548     writtenSymbols: Map(2) {
15:11:12.548       Symbol(react.fragment) => 1,
15:11:12.548       Symbol(react.suspense) => 24
15:11:12.548     },
15:11:12.548     writtenClientReferences: Map(7) {
15:11:12.548       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.548       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.548       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.548       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.548       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.548       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.548       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.548     },
15:11:12.548     writtenServerReferences: Map(0) {},
15:11:12.549     writtenObjects: WeakMap { <items unknown> },
15:11:12.549     temporaryReferences: undefined,
15:11:12.549     identifierPrefix: '',
15:11:12.549     identifierCount: 1,
15:11:12.549     taintCleanupQueue: [],
15:11:12.549     onError: [Function (anonymous)],
15:11:12.549     onPostpone: [Function: X],
15:11:12.549     onAllReady: [Function: X],
15:11:12.549     onFatalError: [Function: X]
15:11:12.549   },
15:11:12.549   [Symbol(kResourceStore)]: undefined,
15:11:12.549   [Symbol(kResourceStore)]: {
15:11:12.549     type: 'prerender-legacy',
15:11:12.549     phase: 'render',
15:11:12.549     rootParams: {},
15:11:12.549     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.549     revalidate: 0,
15:11:12.549     expire: 4294967294,
15:11:12.549     stale: 4294967294,
15:11:12.549     tags: [
15:11:12.549       '_N_T_/layout',
15:11:12.549       '_N_T_/admin/layout',
15:11:12.549       '_N_T_/admin/backup/layout',
15:11:12.549       '_N_T_/admin/backup/page',
15:11:12.549       '_N_T_/admin/backup'
15:11:12.549     ]
15:11:12.549   }
15:11:12.549 }
15:11:12.549 Unhandled rejection Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.549     at r (.next/server/chunks/657.js:12:54555)
15:11:12.549     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.549     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.549     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.549     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.549     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.549     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.549     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.549   description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.549   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.549 } Promise {
15:11:12.549   <rejected> Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.549       at r (.next/server/chunks/657.js:12:54555)
15:11:12.549       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.549       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.549       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.549       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.549       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.549       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.550       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.550     description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.550     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.550   },
15:11:12.550   [Symbol(async_id_symbol)]: 1803,
15:11:12.550   [Symbol(trigger_async_id_symbol)]: 1765,
15:11:12.550   [Symbol(kResourceStore)]: undefined,
15:11:12.550   [Symbol(kResourceStore)]: {
15:11:12.550     isStaticGeneration: true,
15:11:12.550     page: '/admin/backup/page',
15:11:12.550     fallbackRouteParams: null,
15:11:12.550     route: '/admin/backup',
15:11:12.550     incrementalCache: IncrementalCache {
15:11:12.550       locks: Map(0) {},
15:11:12.550       hasCustomCacheHandler: false,
15:11:12.550       dev: false,
15:11:12.550       disableForTestmode: false,
15:11:12.550       minimalMode: true,
15:11:12.550       requestHeaders: {},
15:11:12.550       allowedRevalidateHeaderKeys: undefined,
15:11:12.550       prerenderManifest: [Object],
15:11:12.550       cacheControls: [SharedCacheControls],
15:11:12.550       fetchCacheKeyPrefix: '',
15:11:12.550       cacheHandler: [FileSystemCache]
15:11:12.550     },
15:11:12.550     cacheLifeProfiles: {
15:11:12.550       default: [Object],
15:11:12.550       seconds: [Object],
15:11:12.550       minutes: [Object],
15:11:12.550       hours: [Object],
15:11:12.550       days: [Object],
15:11:12.550       weeks: [Object],
15:11:12.550       max: [Object]
15:11:12.550     },
15:11:12.550     isRevalidate: true,
15:11:12.550     isBuildTimePrerendering: true,
15:11:12.550     hasReadableErrorStacks: false,
15:11:12.550     fetchCache: undefined,
15:11:12.550     isOnDemandRevalidate: undefined,
15:11:12.550     isDraftMode: undefined,
15:11:12.550     requestEndedState: { ended: false },
15:11:12.550     isPrefetchRequest: false,
15:11:12.550     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.550     reactLoadableManifest: {
15:11:12.550       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.550       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.551       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.551       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.551       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.551       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.551       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.551       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.551       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.551       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.551       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.551       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.551       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.551       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.551       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.551     },
15:11:12.551     assetPrefix: '',
15:11:12.551     afterContext: eJ {
15:11:12.551       workUnitStores: Set(0) {},
15:11:12.551       waitUntil: [Function: bound ],
15:11:12.551       onClose: [Function: bound onClose],
15:11:12.551       onTaskError: [Function: onTaskError],
15:11:12.551       callbackQueue: [o]
15:11:12.551     },
15:11:12.551     dynamicIOEnabled: false,
15:11:12.551     dev: false,
15:11:12.551     previouslyRevalidatedTags: [],
15:11:12.551     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.551     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.551     fetchMetrics: [],
15:11:12.551     dynamicUsageDescription: 'cookies',
15:11:12.551     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.551       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.551       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.551       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.551       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.551       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.551       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.551       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.551       '    at stringify (<anonymous>)\n' +
15:11:12.551       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.551       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.551   },
15:11:12.551   [Symbol(kResourceStore)]: eg {
15:11:12.551     type: 20,
15:11:12.551     status: 14,
15:11:12.551     flushScheduled: false,
15:11:12.551     fatalError: null,
15:11:12.551     destination: null,
15:11:12.551     bundlerConfig: {
15:11:12.551       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.551       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.551       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.552       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.552       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.553       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.553       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.553       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.553     },
15:11:12.553     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.553     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.553     nextChunkId: 26,
15:11:12.553     pendingChunks: 0,
15:11:12.553     hints: Set(16) {
15:11:12.553       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.553       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.554       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.554       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.554       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.554     },
15:11:12.554     abortableTasks: Set(0) {},
15:11:12.554     pingedTasks: [],
15:11:12.554     completedImportChunks: [],
15:11:12.554     completedHintChunks: [],
15:11:12.554     completedRegularChunks: [],
15:11:12.554     completedErrorChunks: [],
15:11:12.554     writtenSymbols: Map(2) {
15:11:12.554       Symbol(react.fragment) => 1,
15:11:12.554       Symbol(react.suspense) => 24
15:11:12.554     },
15:11:12.554     writtenClientReferences: Map(7) {
15:11:12.554       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.554       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.554       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.554       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.554       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.554       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.554       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.554     },
15:11:12.554     writtenServerReferences: Map(0) {},
15:11:12.554     writtenObjects: WeakMap { <items unknown> },
15:11:12.554     temporaryReferences: undefined,
15:11:12.554     identifierPrefix: '',
15:11:12.554     identifierCount: 1,
15:11:12.554     taintCleanupQueue: [],
15:11:12.554     onError: [Function (anonymous)],
15:11:12.554     onPostpone: [Function: X],
15:11:12.554     onAllReady: [Function: X],
15:11:12.554     onFatalError: [Function: X]
15:11:12.554   },
15:11:12.554   [Symbol(kResourceStore)]: undefined,
15:11:12.554   [Symbol(kResourceStore)]: {
15:11:12.554     type: 'prerender-legacy',
15:11:12.554     phase: 'render',
15:11:12.554     rootParams: {},
15:11:12.554     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.554     revalidate: 0,
15:11:12.554     expire: 4294967294,
15:11:12.554     stale: 4294967294,
15:11:12.554     tags: [
15:11:12.554       '_N_T_/layout',
15:11:12.554       '_N_T_/admin/layout',
15:11:12.554       '_N_T_/admin/backup/layout',
15:11:12.554       '_N_T_/admin/backup/page',
15:11:12.554       '_N_T_/admin/backup'
15:11:12.554     ]
15:11:12.555   }
15:11:12.555 }
15:11:12.555 Unhandled rejection Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.555     at r (.next/server/chunks/657.js:12:54555)
15:11:12.555     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.555     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.555     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.555     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.555     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.555     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.555   description: "Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.555   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.555 } Promise {
15:11:12.555   <rejected> Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.555       at r (.next/server/chunks/657.js:12:54555)
15:11:12.555       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.555       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.555       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.555       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.555       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.555       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.555     description: "Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.555     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.555   },
15:11:12.555   [Symbol(async_id_symbol)]: 1809,
15:11:12.555   [Symbol(trigger_async_id_symbol)]: 1788,
15:11:12.555   [Symbol(kResourceStore)]: undefined,
15:11:12.555   [Symbol(kResourceStore)]: {
15:11:12.555     isStaticGeneration: true,
15:11:12.555     page: '/admin/backup/page',
15:11:12.555     fallbackRouteParams: null,
15:11:12.555     route: '/admin/backup',
15:11:12.555     incrementalCache: IncrementalCache {
15:11:12.555       locks: Map(0) {},
15:11:12.555       hasCustomCacheHandler: false,
15:11:12.555       dev: false,
15:11:12.555       disableForTestmode: false,
15:11:12.555       minimalMode: true,
15:11:12.555       requestHeaders: {},
15:11:12.555       allowedRevalidateHeaderKeys: undefined,
15:11:12.555       prerenderManifest: [Object],
15:11:12.555       cacheControls: [SharedCacheControls],
15:11:12.555       fetchCacheKeyPrefix: '',
15:11:12.555       cacheHandler: [FileSystemCache]
15:11:12.555     },
15:11:12.555     cacheLifeProfiles: {
15:11:12.555       default: [Object],
15:11:12.556       seconds: [Object],
15:11:12.556       minutes: [Object],
15:11:12.556       hours: [Object],
15:11:12.556       days: [Object],
15:11:12.556       weeks: [Object],
15:11:12.556       max: [Object]
15:11:12.556     },
15:11:12.556     isRevalidate: true,
15:11:12.556     isBuildTimePrerendering: true,
15:11:12.556     hasReadableErrorStacks: false,
15:11:12.556     fetchCache: undefined,
15:11:12.556     isOnDemandRevalidate: undefined,
15:11:12.556     isDraftMode: undefined,
15:11:12.556     requestEndedState: { ended: false },
15:11:12.556     isPrefetchRequest: false,
15:11:12.556     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.556     reactLoadableManifest: {
15:11:12.556       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.556       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.556       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.556       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.556       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.556       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.556       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.556       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.556       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.556       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.556       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.556       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.556       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.556       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.556       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.556     },
15:11:12.556     assetPrefix: '',
15:11:12.556     afterContext: eJ {
15:11:12.556       workUnitStores: Set(0) {},
15:11:12.556       waitUntil: [Function: bound ],
15:11:12.556       onClose: [Function: bound onClose],
15:11:12.556       onTaskError: [Function: onTaskError],
15:11:12.556       callbackQueue: [o]
15:11:12.556     },
15:11:12.556     dynamicIOEnabled: false,
15:11:12.556     dev: false,
15:11:12.556     previouslyRevalidatedTags: [],
15:11:12.556     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.556     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.556     fetchMetrics: [],
15:11:12.556     dynamicUsageDescription: 'cookies',
15:11:12.556     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.556       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.557       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.557       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.557       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.557       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.557       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.557       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.557       '    at stringify (<anonymous>)\n' +
15:11:12.557       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.557       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.557   },
15:11:12.557   [Symbol(kResourceStore)]: eg {
15:11:12.557     type: 20,
15:11:12.557     status: 14,
15:11:12.557     flushScheduled: false,
15:11:12.557     fatalError: null,
15:11:12.557     destination: null,
15:11:12.557     bundlerConfig: {
15:11:12.557       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.557       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.557       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.557       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.557       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.558       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.558       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.559       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.559       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.559     },
15:11:12.559     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.559     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.559     nextChunkId: 26,
15:11:12.559     pendingChunks: 0,
15:11:12.559     hints: Set(16) {
15:11:12.559       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.559       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.559     },
15:11:12.559     abortableTasks: Set(0) {},
15:11:12.559     pingedTasks: [],
15:11:12.559     completedImportChunks: [],
15:11:12.559     completedHintChunks: [],
15:11:12.559     completedRegularChunks: [],
15:11:12.560     completedErrorChunks: [],
15:11:12.560     writtenSymbols: Map(2) {
15:11:12.560       Symbol(react.fragment) => 1,
15:11:12.560       Symbol(react.suspense) => 24
15:11:12.560     },
15:11:12.560     writtenClientReferences: Map(7) {
15:11:12.560       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.560       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.560       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.560       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.560       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.560       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.560       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.560     },
15:11:12.560     writtenServerReferences: Map(0) {},
15:11:12.560     writtenObjects: WeakMap { <items unknown> },
15:11:12.560     temporaryReferences: undefined,
15:11:12.560     identifierPrefix: '',
15:11:12.560     identifierCount: 1,
15:11:12.560     taintCleanupQueue: [],
15:11:12.560     onError: [Function (anonymous)],
15:11:12.560     onPostpone: [Function: X],
15:11:12.560     onAllReady: [Function: X],
15:11:12.560     onFatalError: [Function: X]
15:11:12.560   },
15:11:12.560   [Symbol(kResourceStore)]: undefined,
15:11:12.560   [Symbol(kResourceStore)]: {
15:11:12.560     type: 'prerender-legacy',
15:11:12.560     phase: 'render',
15:11:12.560     rootParams: {},
15:11:12.560     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.560     revalidate: 0,
15:11:12.560     expire: 4294967294,
15:11:12.560     stale: 4294967294,
15:11:12.560     tags: [
15:11:12.560       '_N_T_/layout',
15:11:12.560       '_N_T_/admin/layout',
15:11:12.560       '_N_T_/admin/backup/layout',
15:11:12.560       '_N_T_/admin/backup/page',
15:11:12.560       '_N_T_/admin/backup'
15:11:12.560     ]
15:11:12.560   }
15:11:12.560 }
15:11:12.560 Unhandled rejection Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.561     at r (.next/server/chunks/657.js:12:54555)
15:11:12.561     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.561     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.561     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.561     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.561     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.561     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.561     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.561   description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.561   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.561 } Promise {
15:11:12.561   <rejected> Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.561       at r (.next/server/chunks/657.js:12:54555)
15:11:12.561       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.561       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.561       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.561       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.561       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.561       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.561       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.561     description: "Route /admin/backup couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.561     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.561   },
15:11:12.561   [Symbol(async_id_symbol)]: 1796,
15:11:12.562   [Symbol(trigger_async_id_symbol)]: 1765,
15:11:12.562   [Symbol(kResourceStore)]: undefined,
15:11:12.562   [Symbol(kResourceStore)]: {
15:11:12.562     isStaticGeneration: true,
15:11:12.562     page: '/admin/backup/page',
15:11:12.562     fallbackRouteParams: null,
15:11:12.562     route: '/admin/backup',
15:11:12.562     incrementalCache: IncrementalCache {
15:11:12.562       locks: Map(0) {},
15:11:12.562       hasCustomCacheHandler: false,
15:11:12.562       dev: false,
15:11:12.562       disableForTestmode: false,
15:11:12.562       minimalMode: true,
15:11:12.562       requestHeaders: {},
15:11:12.562       allowedRevalidateHeaderKeys: undefined,
15:11:12.562       prerenderManifest: [Object],
15:11:12.562       cacheControls: [SharedCacheControls],
15:11:12.562       fetchCacheKeyPrefix: '',
15:11:12.562       cacheHandler: [FileSystemCache]
15:11:12.562     },
15:11:12.562     cacheLifeProfiles: {
15:11:12.562       default: [Object],
15:11:12.562       seconds: [Object],
15:11:12.562       minutes: [Object],
15:11:12.562       hours: [Object],
15:11:12.562       days: [Object],
15:11:12.562       weeks: [Object],
15:11:12.562       max: [Object]
15:11:12.562     },
15:11:12.562     isRevalidate: true,
15:11:12.562     isBuildTimePrerendering: true,
15:11:12.562     hasReadableErrorStacks: false,
15:11:12.563     fetchCache: undefined,
15:11:12.563     isOnDemandRevalidate: undefined,
15:11:12.563     isDraftMode: undefined,
15:11:12.563     requestEndedState: { ended: false },
15:11:12.563     isPrefetchRequest: false,
15:11:12.563     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.563     reactLoadableManifest: {
15:11:12.563       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.563       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.563       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.563       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.563       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.563       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.563       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.563       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.563       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.563       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.563       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.563       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.563       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.563       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.563       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.563     },
15:11:12.563     assetPrefix: '',
15:11:12.563     afterContext: eJ {
15:11:12.563       workUnitStores: Set(0) {},
15:11:12.563       waitUntil: [Function: bound ],
15:11:12.563       onClose: [Function: bound onClose],
15:11:12.563       onTaskError: [Function: onTaskError],
15:11:12.563       callbackQueue: [o]
15:11:12.563     },
15:11:12.563     dynamicIOEnabled: false,
15:11:12.563     dev: false,
15:11:12.563     previouslyRevalidatedTags: [],
15:11:12.563     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.563     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.563     fetchMetrics: [],
15:11:12.563     dynamicUsageDescription: 'cookies',
15:11:12.563     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/backup couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.563       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.564       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.564       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.564       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.564       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.564       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.564       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.564       '    at stringify (<anonymous>)\n' +
15:11:12.564       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.564       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.564   },
15:11:12.564   [Symbol(kResourceStore)]: eg {
15:11:12.564     type: 20,
15:11:12.564     status: 14,
15:11:12.564     flushScheduled: false,
15:11:12.564     fatalError: null,
15:11:12.564     destination: null,
15:11:12.564     bundlerConfig: {
15:11:12.564       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.564       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.564       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.564       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.564       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.565       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.565       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.565       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.566       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.566       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.566     },
15:11:12.566     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.566     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.566     nextChunkId: 26,
15:11:12.566     pendingChunks: 0,
15:11:12.566     hints: Set(16) {
15:11:12.566       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.566       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.567       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.567       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.567       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.567       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.567       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.567     },
15:11:12.567     abortableTasks: Set(0) {},
15:11:12.567     pingedTasks: [],
15:11:12.567     com-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.567       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.567       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.567       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.567     },
15:11:12.567     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.567     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.568     nextChunkId: 30,
15:11:12.568     pendingChunks: 0,
15:11:12.568     hints: Set(16) {
15:11:12.568       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.568       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.568     },
15:11:12.568     abortableTasks: Set(0) {},
15:11:12.568     pingedTasks: [],
15:11:12.568     completedImportChunks: [],
15:11:12.568     completedHintChunks: [],
15:11:12.568     completedRegularChunks: [],
15:11:12.568     completedErrorChunks: [],
15:11:12.568     writtenSymbols: Map(2) {
15:11:12.568       Symbol(react.fragment) => 1,
15:11:12.568       Symbol(react.suspense) => 28
15:11:12.568     },
15:11:12.568     writtenClientReferences: Map(9) {
15:11:12.568       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.568       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.568       '/vercel/path0/node_modules/next/dist/client/components/client-page.js#ClientPageRoot' => 5,
15:11:12.568       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx#default' => 6,
15:11:12.568       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 9,
15:11:12.568       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 11,
15:11:12.568       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 23,
15:11:12.568       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 25,
15:11:12.568       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 27
15:11:12.568     },
15:11:12.568     writtenServerReferences: Map(0) {},
15:11:12.568     writtenObjects: WeakMap { <items unknown> },
15:11:12.569     temporaryReferences: undefined,
15:11:12.569     identifierPrefix: '',
15:11:12.569     identifierCount: 1,
15:11:12.569     taintCleanupQueue: [],
15:11:12.569     onError: [Function (anonymous)],
15:11:12.569     onPostpone: [Function: X],
15:11:12.569     onAllReady: [Function: X],
15:11:12.569     onFatalError: [Function: X]
15:11:12.569   },
15:11:12.569   [Symbol(kResourceStore)]: undefined,
15:11:12.569   [Symbol(kResourceStore)]: {
15:11:12.569     type: 'prerender-legacy',
15:11:12.569     phase: 'render',
15:11:12.569     rootParams: {},
15:11:12.569     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.569     revalidate: 0,
15:11:12.569     expire: 4294967294,
15:11:12.569     stale: 4294967294,
15:11:12.569     tags: [
15:11:12.569       '_N_T_/layout',
15:11:12.569       '_N_T_/embed/layout',
15:11:12.569       '_N_T_/embed/page',
15:11:12.569       '_N_T_/embed'
15:11:12.569     ]
15:11:12.569   }
15:11:12.569 }
15:11:12.906 pletedImportChunks: [],
15:11:12.906     completedHintChunks: [],
15:11:12.906     completedRegularChunks: [],
15:11:12.906     completedErrorChunks: [],
15:11:12.906     writtenSymbols: Map(2) {
15:11:12.906       Symbol(react.fragment) => 1,
15:11:12.906       Symbol(react.suspense) => 24
15:11:12.906     },
15:11:12.906     writtenClientReferences: Map(7) {
15:11:12.906       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.906       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.906       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.906       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.906       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:12.906       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:12.906       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:12.906     },
15:11:12.906     writtenServerReferences: Map(0) {},
15:11:12.907     writtenObjects: WeakMap { <items unknown> },
15:11:12.907     temporaryReferences: undefined,
15:11:12.907     identifierPrefix: '',
15:11:12.907     identifierCount: 1,
15:11:12.907     taintCleanupQueue: [],
15:11:12.907     onError: [Function (anonymous)],
15:11:12.907     onPostpone: [Function: X],
15:11:12.907     onAllReady: [Function: X],
15:11:12.907     onFatalError: [Function: X]
15:11:12.907   },
15:11:12.907   [Symbol(kResourceStore)]: undefined,
15:11:12.907   [Symbol(kResourceStore)]: {
15:11:12.907     type: 'prerender-legacy',
15:11:12.907     phase: 'render',
15:11:12.907     rootParams: {},
15:11:12.907     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.907     revalidate: 0,
15:11:12.907     expire: 4294967294,
15:11:12.907     stale: 4294967294,
15:11:12.907     tags: [
15:11:12.907       '_N_T_/layout',
15:11:12.907       '_N_T_/admin/layout',
15:11:12.907       '_N_T_/admin/backup/layout',
15:11:12.907       '_N_T_/admin/backup/page',
15:11:12.907       '_N_T_/admin/backup'
15:11:12.907     ]
15:11:12.907   }
15:11:12.907 }
15:11:12.907 Failed to load custom stylesheet CSS Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.907     at r (.next/server/chunks/657.js:12:54555)
15:11:12.907     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.907     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.907     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.907     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.907     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.907     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.907     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.907   description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.907   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.907 }
15:11:12.907 Failed to load custom JavaScript Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.907     at r (.next/server/chunks/657.js:12:54555)
15:11:12.907     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.907     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.907     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.907     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.907     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.907     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.907     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.907   description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.907   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.907 }
15:11:12.907 Unhandled rejection Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.907     at r (.next/server/chunks/657.js:12:54555)
15:11:12.907     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.908     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.908     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.908     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.908     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.908     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.908   description: "Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.908   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.908 } Promise {
15:11:12.908   <rejected> Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.908       at r (.next/server/chunks/657.js:12:54555)
15:11:12.908       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.908       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.908       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.908       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.908       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.908       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.908     description: "Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.908     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.908   },
15:11:12.908   [Symbol(async_id_symbol)]: 2801,
15:11:12.908   [Symbol(trigger_async_id_symbol)]: 2783,
15:11:12.908   [Symbol(kResourceStore)]: undefined,
15:11:12.908   [Symbol(kResourceStore)]: {
15:11:12.908     isStaticGeneration: true,
15:11:12.908     page: '/admin/about/page',
15:11:12.908     fallbackRouteParams: null,
15:11:12.908     route: '/admin/about',
15:11:12.908     incrementalCache: IncrementalCache {
15:11:12.908       locks: Map(0) {},
15:11:12.908       hasCustomCacheHandler: false,
15:11:12.908       dev: false,
15:11:12.908       disableForTestmode: false,
15:11:12.908       minimalMode: true,
15:11:12.908       requestHeaders: {},
15:11:12.908       allowedRevalidateHeaderKeys: undefined,
15:11:12.908       prerenderManifest: [Object],
15:11:12.908       cacheControls: [SharedCacheControls],
15:11:12.908       fetchCacheKeyPrefix: '',
15:11:12.908       cacheHandler: [FileSystemCache]
15:11:12.908     },
15:11:12.908     cacheLifeProfiles: {
15:11:12.908       default: [Object],
15:11:12.908       seconds: [Object],
15:11:12.908       minutes: [Object],
15:11:12.908       hours: [Object],
15:11:12.908       days: [Object],
15:11:12.908       weeks: [Object],
15:11:12.908       max: [Object]
15:11:12.908     },
15:11:12.908     isRevalidate: true,
15:11:12.908     isBuildTimePrerendering: true,
15:11:12.908     hasReadableErrorStacks: false,
15:11:12.908     fetchCache: undefined,
15:11:12.908     isOnDemandRevalidate: undefined,
15:11:12.908     isDraftMode: undefined,
15:11:12.908     requestEndedState: { ended: false },
15:11:12.908     isPrefetchRequest: false,
15:11:12.908     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.908     reactLoadableManifest: {
15:11:12.908       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.909       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.909       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.909       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.909       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.909       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.909       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.909       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.909       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.909       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.909       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.909       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.909       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.909       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.909       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.909     },
15:11:12.909     assetPrefix: '',
15:11:12.909     afterContext: eJ {
15:11:12.909       workUnitStores: Set(0) {},
15:11:12.909       waitUntil: [Function: bound ],
15:11:12.909       onClose: [Function: bound onClose],
15:11:12.909       onTaskError: [Function: onTaskError],
15:11:12.909       callbackQueue: [o]
15:11:12.909     },
15:11:12.909     dynamicIOEnabled: false,
15:11:12.909     dev: false,
15:11:12.909     previouslyRevalidatedTags: [],
15:11:12.909     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.909     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.909     fetchMetrics: [],
15:11:12.909     dynamicUsageDescription: 'cookies',
15:11:12.909     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.909       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.909       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.909       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.909       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.909       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.909       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.909       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.909       '    at stringify (<anonymous>)\n' +
15:11:12.909       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.909       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.909   },
15:11:12.909   [Symbol(kResourceStore)]: eg {
15:11:12.909     type: 20,
15:11:12.909     status: 14,
15:11:12.909     flushScheduled: false,
15:11:12.909     fatalError: null,
15:11:12.909     destination: null,
15:11:12.909     bundlerConfig: {
15:11:12.909       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.909       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.909       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.909       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.909       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.910       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.910       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.910       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.911       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.911       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.911     },
15:11:12.911     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.911     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.911     nextChunkId: 28,
15:11:12.911     pendingChunks: 0,
15:11:12.911     hints: Set(17) {
15:11:12.911       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.911       'L[style]/_next/static/css/c8594d1f8e0bb05d.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.911     },
15:11:12.911     abortableTasks: Set(0) {},
15:11:12.911     pingedTasks: [],
15:11:12.911     completedImportChunks: [],
15:11:12.911     completedHintChunks: [],
15:11:12.911     completedRegularChunks: [],
15:11:12.911     completedErrorChunks: [],
15:11:12.912     writtenSymbols: Map(2) {
15:11:12.912       Symbol(react.fragment) => 1,
15:11:12.912       Symbol(react.suspense) => 26
15:11:12.912     },
15:11:12.912     writtenClientReferences: Map(7) {
15:11:12.912       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.912       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.912       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.912       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.912       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 21,
15:11:12.912       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 23,
15:11:12.912       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 25
15:11:12.912     },
15:11:12.912     writtenServerReferences: Map(0) {},
15:11:12.912     writtenObjects: WeakMap { <items unknown> },
15:11:12.912     temporaryReferences: undefined,
15:11:12.912     identifierPrefix: '',
15:11:12.912     identifierCount: 1,
15:11:12.912     taintCleanupQueue: [],
15:11:12.912     onError: [Function (anonymous)],
15:11:12.912     onPostpone: [Function: X],
15:11:12.912     onAllReady: [Function: X],
15:11:12.912     onFatalError: [Function: X]
15:11:12.912   },
15:11:12.912   [Symbol(kResourceStore)]: undefined,
15:11:12.912   [Symbol(kResourceStore)]: {
15:11:12.912     type: 'prerender-legacy',
15:11:12.912     phase: 'render',
15:11:12.912     rootParams: {},
15:11:12.912     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.912     revalidate: 0,
15:11:12.912     expire: 4294967294,
15:11:12.912     stale: 4294967294,
15:11:12.912     tags: [
15:11:12.912       '_N_T_/layout',
15:11:12.912       '_N_T_/admin/layout',
15:11:12.912       '_N_T_/admin/about/layout',
15:11:12.912       '_N_T_/admin/about/page',
15:11:12.912       '_N_T_/admin/about'
15:11:12.912     ]
15:11:12.912   }
15:11:12.912 }
15:11:12.912 Unhandled rejection Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.912     at r (.next/server/chunks/657.js:12:54555)
15:11:12.912     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.912     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.912     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.912     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.912     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.912     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.912   description: "Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.912   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.912 } Promise {
15:11:12.912   <rejected> Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.912       at r (.next/server/chunks/657.js:12:54555)
15:11:12.912       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.912       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.912       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.913       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.913       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.913       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.913     description: "Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.913     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.913   },
15:11:12.913   [Symbol(async_id_symbol)]: 2810,
15:11:12.913   [Symbol(trigger_async_id_symbol)]: 2783,
15:11:12.913   [Symbol(kResourceStore)]: undefined,
15:11:12.913   [Symbol(kResourceStore)]: {
15:11:12.913     isStaticGeneration: true,
15:11:12.913     page: '/admin/about/page',
15:11:12.913     fallbackRouteParams: null,
15:11:12.913     route: '/admin/about',
15:11:12.913     incrementalCache: IncrementalCache {
15:11:12.913       locks: Map(0) {},
15:11:12.913       hasCustomCacheHandler: false,
15:11:12.913       dev: false,
15:11:12.913       disableForTestmode: false,
15:11:12.913       minimalMode: true,
15:11:12.913       requestHeaders: {},
15:11:12.913       allowedRevalidateHeaderKeys: undefined,
15:11:12.913       prerenderManifest: [Object],
15:11:12.913       cacheControls: [SharedCacheControls],
15:11:12.913       fetchCacheKeyPrefix: '',
15:11:12.913       cacheHandler: [FileSystemCache]
15:11:12.913     },
15:11:12.913     cacheLifeProfiles: {
15:11:12.913       default: [Object],
15:11:12.913       seconds: [Object],
15:11:12.913       minutes: [Object],
15:11:12.913       hours: [Object],
15:11:12.913       days: [Object],
15:11:12.913       weeks: [Object],
15:11:12.913       max: [Object]
15:11:12.913     },
15:11:12.913     isRevalidate: true,
15:11:12.913     isBuildTimePrerendering: true,
15:11:12.913     hasReadableErrorStacks: false,
15:11:12.913     fetchCache: undefined,
15:11:12.913     isOnDemandRevalidate: undefined,
15:11:12.913     isDraftMode: undefined,
15:11:12.913     requestEndedState: { ended: false },
15:11:12.913     isPrefetchRequest: false,
15:11:12.913     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.913     reactLoadableManifest: {
15:11:12.913       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.913       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.913       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.913       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.913       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.913       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.913       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.913       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.913       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.913       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.913       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.913       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.913       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.913       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.913       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.913     },
15:11:12.913     assetPrefix: '',
15:11:12.913     afterContext: eJ {
15:11:12.913       workUnitStores: Set(0) {},
15:11:12.913       waitUntil: [Function: bound ],
15:11:12.913       onClose: [Function: bound onClose],
15:11:12.913       onTaskError: [Function: onTaskError],
15:11:12.913       callbackQueue: [o]
15:11:12.913     },
15:11:12.913     dynamicIOEnabled: false,
15:11:12.913     dev: false,
15:11:12.913     previouslyRevalidatedTags: [],
15:11:12.914     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.914     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.914     fetchMetrics: [],
15:11:12.914     dynamicUsageDescription: 'cookies',
15:11:12.914     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.914       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.914       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.914       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.914       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.914       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.914       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.914       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.914       '    at stringify (<anonymous>)\n' +
15:11:12.914       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.914       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.914   },
15:11:12.914   [Symbol(kResourceStore)]: eg {
15:11:12.914     type: 20,
15:11:12.914     status: 14,
15:11:12.914     flushScheduled: false,
15:11:12.914     fatalError: null,
15:11:12.914     destination: null,
15:11:12.914     bundlerConfig: {
15:11:12.914       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.914       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.914       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.914       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.914       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.914       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.914       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.914       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.922       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.922       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.922       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.923       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.923       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.923     },
15:11:12.923     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.923     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.923     nextChunkId: 28,
15:11:12.923     pendingChunks: 0,
15:11:12.923     hints: Set(17) {
15:11:12.923       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.923       'L[style]/_next/static/css/c8594d1f8e0bb05d.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.923     },
15:11:12.923     abortableTasks: Set(0) {},
15:11:12.923     pingedTasks: [],
15:11:12.923     completedImportChunks: [],
15:11:12.923     completedHintChunks: [],
15:11:12.923     completedRegularChunks: [],
15:11:12.923     completedErrorChunks: [],
15:11:12.923     writtenSymbols: Map(2) {
15:11:12.923       Symbol(react.fragment) => 1,
15:11:12.923       Symbol(react.suspense) => 26
15:11:12.923     },
15:11:12.923     writtenClientReferences: Map(7) {
15:11:12.923       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.924       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.924       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.924       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.924       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 21,
15:11:12.924       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 23,
15:11:12.924       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 25
15:11:12.924     },
15:11:12.924     writtenServerReferences: Map(0) {},
15:11:12.924     writtenObjects: WeakMap { <items unknown> },
15:11:12.924     temporaryReferences: undefined,
15:11:12.924     identifierPrefix: '',
15:11:12.924     identifierCount: 1,
15:11:12.924     taintCleanupQueue: [],
15:11:12.924     onError: [Function (anonymous)],
15:11:12.924     onPostpone: [Function: X],
15:11:12.924     onAllReady: [Function: X],
15:11:12.924     onFatalError: [Function: X]
15:11:12.924   },
15:11:12.924   [Symbol(kResourceStore)]: undefined,
15:11:12.924   [Symbol(kResourceStore)]: {
15:11:12.924     type: 'prerender-legacy',
15:11:12.924     phase: 'render',
15:11:12.924     rootParams: {},
15:11:12.924     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.924     revalidate: 0,
15:11:12.924     expire: 4294967294,
15:11:12.924     stale: 4294967294,
15:11:12.924     tags: [
15:11:12.927       '_N_T_/layout',
15:11:12.927       '_N_T_/admin/layout',
15:11:12.931       '_N_T_/admin/about/layout',
15:11:12.932       '_N_T_/admin/about/page',
15:11:12.932       '_N_T_/admin/about'
15:11:12.932     ]
15:11:12.932   }
15:11:12.932 }
15:11:12.932 Unhandled rejection Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.932     at r (.next/server/chunks/657.js:12:54555)
15:11:12.932     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.932     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.932     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.932     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.932     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.932     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.934     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.935   description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.935   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.935 } Promise {
15:11:12.935   <rejected> Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.935       at r (.next/server/chunks/657.js:12:54555)
15:11:12.935       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.935       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.935       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.935       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.935       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.935       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.935       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.935     description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.935     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.935   },
15:11:12.935   [Symbol(async_id_symbol)]: 2793,
15:11:12.935   [Symbol(trigger_async_id_symbol)]: 2783,
15:11:12.935   [Symbol(kResourceStore)]: undefined,
15:11:12.935   [Symbol(kResourceStore)]: {
15:11:12.935     isStaticGeneration: true,
15:11:12.935     page: '/admin/about/page',
15:11:12.935     fallbackRouteParams: null,
15:11:12.935     route: '/admin/about',
15:11:12.935     incrementalCache: IncrementalCache {
15:11:12.935       locks: Map(0) {},
15:11:12.935       hasCustomCacheHandler: false,
15:11:12.935       dev: false,
15:11:12.935       disableForTestmode: false,
15:11:12.935       minimalMode: true,
15:11:12.935       requestHeaders: {},
15:11:12.935       allowedRevalidateHeaderKeys: undefined,
15:11:12.935       prerenderManifest: [Object],
15:11:12.935       cacheControls: [SharedCacheControls],
15:11:12.935       fetchCacheKeyPrefix: '',
15:11:12.935       cacheHandler: [FileSystemCache]
15:11:12.935     },
15:11:12.935     cacheLifeProfiles: {
15:11:12.935       default: [Object],
15:11:12.935       seconds: [Object],
15:11:12.935       minutes: [Object],
15:11:12.935       hours: [Object],
15:11:12.935       days: [Object],
15:11:12.935       weeks: [Object],
15:11:12.935       max: [Object]
15:11:12.935     },
15:11:12.936     isRevalidate: true,
15:11:12.936     isBuildTimePrerendering: true,
15:11:12.936     hasReadableErrorStacks: false,
15:11:12.936     fetchCache: undefined,
15:11:12.936     isOnDemandRevalidate: undefined,
15:11:12.936     isDraftMode: undefined,
15:11:12.936     requestEndedState: { ended: false },
15:11:12.936     isPrefetchRequest: false,
15:11:12.936     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.936     reactLoadableManifest: {
15:11:12.936       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.936       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.936       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.936       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.936       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.936       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.936       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.936       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.936       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.936       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.936       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.936       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.936       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.936       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.936       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.936     },
15:11:12.936     assetPrefix: '',
15:11:12.936     afterContext: eJ {
15:11:12.936       workUnitStores: Set(0) {},
15:11:12.936       waitUntil: [Function: bound ],
15:11:12.936       onClose: [Function: bound onClose],
15:11:12.936       onTaskError: [Function: onTaskError],
15:11:12.936       callbackQueue: [o]
15:11:12.936     },
15:11:12.936     dynamicIOEnabled: false,
15:11:12.936     dev: false,
15:11:12.936     previouslyRevalidatedTags: [],
15:11:12.936     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.936     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.936     fetchMetrics: [],
15:11:12.936     dynamicUsageDescription: 'cookies',
15:11:12.936     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.936       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.936       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.936       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.936       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.937       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.937       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.937       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.937       '    at stringify (<anonymous>)\n' +
15:11:12.937       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.937       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.937   },
15:11:12.937   [Symbol(kResourceStore)]: eg {
15:11:12.937     type: 20,
15:11:12.937     status: 14,
15:11:12.937     flushScheduled: false,
15:11:12.937     fatalError: null,
15:11:12.937     destination: null,
15:11:12.937     bundlerConfig: {
15:11:12.937       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.937       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.937       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.938       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.938       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.938       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.939       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.939     },
15:11:12.939     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.939     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.939     nextChunkId: 28,
15:11:12.939     pendingChunks: 0,
15:11:12.939     hints: Set(17) {
15:11:12.939       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.939       'L[style]/_next/static/css/c8594d1f8e0bb05d.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.939     },
15:11:12.939     abortableTasks: Set(0) {},
15:11:12.939     pingedTasks: [],
15:11:12.939     completedImportChunks: [],
15:11:12.939     completedHintChunks: [],
15:11:12.939     completedRegularChunks: [],
15:11:12.939     completedErrorChunks: [],
15:11:12.939     writtenSymbols: Map(2) {
15:11:12.939       Symbol(react.fragment) => 1,
15:11:12.939       Symbol(react.suspense) => 26
15:11:12.939     },
15:11:12.939     writtenClientReferences: Map(7) {
15:11:12.939       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.939       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.939       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.939       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.939       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 21,
15:11:12.939       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 23,
15:11:12.939       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 25
15:11:12.939     },
15:11:12.939     writtenServerReferences: Map(0) {},
15:11:12.939     writtenObjects: WeakMap { <items unknown> },
15:11:12.939     temporaryReferences: undefined,
15:11:12.939     identifierPrefix: '',
15:11:12.939     identifierCount: 1,
15:11:12.939     taintCleanupQueue: [],
15:11:12.940     onError: [Function (anonymous)],
15:11:12.940     onPostpone: [Function: X],
15:11:12.940     onAllReady: [Function: X],
15:11:12.940     onFatalError: [Function: X]
15:11:12.940   },
15:11:12.940   [Symbol(kResourceStore)]: undefined,
15:11:12.940   [Symbol(kResourceStore)]: {
15:11:12.940     type: 'prerender-legacy',
15:11:12.940     phase: 'render',
15:11:12.940     rootParams: {},
15:11:12.940     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.940     revalidate: 0,
15:11:12.940     expire: 4294967294,
15:11:12.940     stale: 4294967294,
15:11:12.940     tags: [
15:11:12.940       '_N_T_/layout',
15:11:12.940       '_N_T_/admin/layout',
15:11:12.940       '_N_T_/admin/about/layout',
15:11:12.940       '_N_T_/admin/about/page',
15:11:12.940       '_N_T_/admin/about'
15:11:12.940     ]
15:11:12.940   }
15:11:12.940 }
15:11:12.940 Unhandled rejection Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.940     at r (.next/server/chunks/657.js:12:54555)
15:11:12.940     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.940     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.940     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.940     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.940     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.940     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.940     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.940   description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.940   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.940 } Promise {
15:11:12.940   <rejected> Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.940       at r (.next/server/chunks/657.js:12:54555)
15:11:12.940       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.940       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.940       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.940       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.940       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.940       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.940       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.940     description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.940     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.940   },
15:11:12.940   [Symbol(async_id_symbol)]: 2828,
15:11:12.940   [Symbol(trigger_async_id_symbol)]: 2783,
15:11:12.941   [Symbol(kResourceStore)]: undefined,
15:11:12.941   [Symbol(kResourceStore)]: {
15:11:12.941     isStaticGeneration: true,
15:11:12.941     page: '/admin/about/page',
15:11:12.941     fallbackRouteParams: null,
15:11:12.941     route: '/admin/about',
15:11:12.941     incrementalCache: IncrementalCache {
15:11:12.941       locks: Map(0) {},
15:11:12.941       hasCustomCacheHandler: false,
15:11:12.941       dev: false,
15:11:12.941       disableForTestmode: false,
15:11:12.941       minimalMode: true,
15:11:12.941       requestHeaders: {},
15:11:12.941       allowedRevalidateHeaderKeys: undefined,
15:11:12.941       prerenderManifest: [Object],
15:11:12.941       cacheControls: [SharedCacheControls],
15:11:12.941       fetchCacheKeyPrefix: '',
15:11:12.941       cacheHandler: [FileSystemCache]
15:11:12.941     },
15:11:12.941     cacheLifeProfiles: {
15:11:12.941       default: [Object],
15:11:12.941       seconds: [Object],
15:11:12.941       minutes: [Object],
15:11:12.941       hours: [Object],
15:11:12.941       days: [Object],
15:11:12.941       weeks: [Object],
15:11:12.941       max: [Object]
15:11:12.941     },
15:11:12.941     isRevalidate: true,
15:11:12.941     isBuildTimePrerendering: true,
15:11:12.941     hasReadableErrorStacks: false,
15:11:12.941     fetchCache: undefined,
15:11:12.941     isOnDemandRevalidate: undefined,
15:11:12.941     isDraftMode: undefined,
15:11:12.941     requestEndedState: { ended: false },
15:11:12.941     isPrefetchRequest: false,
15:11:12.941     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.941     reactLoadableManifest: {
15:11:12.941       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.941       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.941       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.941       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.941       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.941       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.941       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.941       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.941       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.941       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.941       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.942       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.942       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.942       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.942       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.942     },
15:11:12.942     assetPrefix: '',
15:11:12.942     afterContext: eJ {
15:11:12.942       workUnitStores: Set(0) {},
15:11:12.942       waitUntil: [Function: bound ],
15:11:12.942       onClose: [Function: bound onClose],
15:11:12.942       onTaskError: [Function: onTaskError],
15:11:12.942       callbackQueue: [o]
15:11:12.942     },
15:11:12.942     dynamicIOEnabled: false,
15:11:12.942     dev: false,
15:11:12.942     previouslyRevalidatedTags: [],
15:11:12.942     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.942     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.942     fetchMetrics: [],
15:11:12.942     dynamicUsageDescription: 'cookies',
15:11:12.942     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.942       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.942       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.942       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.942       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.942       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.942       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.942       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.942       '    at stringify (<anonymous>)\n' +
15:11:12.942       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.942       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.942   },
15:11:12.942   [Symbol(kResourceStore)]: eg {
15:11:12.942     type: 20,
15:11:12.942     status: 14,
15:11:12.942     flushScheduled: false,
15:11:12.942     fatalError: null,
15:11:12.942     destination: null,
15:11:12.942     bundlerConfig: {
15:11:12.942       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.942       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.942       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.942       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.942       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.942       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.942       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.942       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.943       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.943       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.944       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.944       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.944       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.944     },
15:11:12.944     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.944     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.944     nextChunkId: 28,
15:11:12.944     pendingChunks: 0,
15:11:12.945     hints: Set(17) {
15:11:12.945       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.945       'L[style]/_next/static/css/c8594d1f8e0bb05d.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.945     },
15:11:12.945     abortableTasks: Set(0) {},
15:11:12.945     pingedTasks: [],
15:11:12.945     completedImportChunks: [],
15:11:12.945     completedHintChunks: [],
15:11:12.945     completedRegularChunks: [],
15:11:12.945     completedErrorChunks: [],
15:11:12.945     writtenSymbols: Map(2) {
15:11:12.945       Symbol(react.fragment) => 1,
15:11:12.945       Symbol(react.suspense) => 26
15:11:12.945     },
15:11:12.945     writtenClientReferences: Map(7) {
15:11:12.945       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.945       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.945       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.945       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.945       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 21,
15:11:12.945       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 23,
15:11:12.945       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 25
15:11:12.945     },
15:11:12.945     writtenServerReferences: Map(0) {},
15:11:12.945     writtenObjects: WeakMap { <items unknown> },
15:11:12.945     temporaryReferences: undefined,
15:11:12.945     identifierPrefix: '',
15:11:12.945     identifierCount: 1,
15:11:12.945     taintCleanupQueue: [],
15:11:12.945     onError: [Function (anonymous)],
15:11:12.945     onPostpone: [Function: X],
15:11:12.945     onAllReady: [Function: X],
15:11:12.945     onFatalError: [Function: X]
15:11:12.945   },
15:11:12.946   [Symbol(kResourceStore)]: undefined,
15:11:12.946   [Symbol(kResourceStore)]: {
15:11:12.946     type: 'prerender-legacy',
15:11:12.946     phase: 'render',
15:11:12.946     rootParams: {},
15:11:12.946     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.946     revalidate: 0,
15:11:12.946     expire: 4294967294,
15:11:12.946     stale: 4294967294,
15:11:12.946     tags: [
15:11:12.946       '_N_T_/layout',
15:11:12.946       '_N_T_/admin/layout',
15:11:12.946       '_N_T_/admin/about/layout',
15:11:12.946       '_N_T_/admin/about/page',
15:11:12.946       '_N_T_/admin/about'
15:11:12.946     ]
15:11:12.946   }
15:11:12.946 }
15:11:12.946 Unhandled rejection Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.946     at r (.next/server/chunks/657.js:12:54555)
15:11:12.946     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.946     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.946     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.946     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.946     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.946     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.946     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.946   description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.946   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.946 } Promise {
15:11:12.946   <rejected> Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.946       at r (.next/server/chunks/657.js:12:54555)
15:11:12.946       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.946       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.946       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.946       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.946       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.946       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.946       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.946     description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.946     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.946   },
15:11:12.946   [Symbol(async_id_symbol)]: 2832,
15:11:12.946   [Symbol(trigger_async_id_symbol)]: 2783,
15:11:12.946   [Symbol(kResourceStore)]: undefined,
15:11:12.946   [Symbol(kResourceStore)]: {
15:11:12.946     isStaticGeneration: true,
15:11:12.947     page: '/admin/about/page',
15:11:12.947     fallbackRouteParams: null,
15:11:12.947     route: '/admin/about',
15:11:12.947     incrementalCache: IncrementalCache {
15:11:12.947       locks: Map(0) {},
15:11:12.947       hasCustomCacheHandler: false,
15:11:12.947       dev: false,
15:11:12.947       disableForTestmode: false,
15:11:12.947       minimalMode: true,
15:11:12.947       requestHeaders: {},
15:11:12.947       allowedRevalidateHeaderKeys: undefined,
15:11:12.947       prerenderManifest: [Object],
15:11:12.947       cacheControls: [SharedCacheControls],
15:11:12.947       fetchCacheKeyPrefix: '',
15:11:12.947       cacheHandler: [FileSystemCache]
15:11:12.947     },
15:11:12.947     cacheLifeProfiles: {
15:11:12.947       default: [Object],
15:11:12.947       seconds: [Object],
15:11:12.947       minutes: [Object],
15:11:12.947       hours: [Object],
15:11:12.947       days: [Object],
15:11:12.947       weeks: [Object],
15:11:12.947       max: [Object]
15:11:12.947     },
15:11:12.947     isRevalidate: true,
15:11:12.947     isBuildTimePrerendering: true,
15:11:12.947     hasReadableErrorStacks: false,
15:11:12.947     fetchCache: undefined,
15:11:12.947     isOnDemandRevalidate: undefined,
15:11:12.947     isDraftMode: undefined,
15:11:12.947     requestEndedState: { ended: false },
15:11:12.947     isPrefetchRequest: false,
15:11:12.947     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.947     reactLoadableManifest: {
15:11:12.947       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.947       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.947       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.947       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.947       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.947       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.947       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.947       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.947       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.947       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.947       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.947       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.947       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.948       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.948       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.948     },
15:11:12.948     assetPrefix: '',
15:11:12.948     afterContext: eJ {
15:11:12.948       workUnitStores: Set(0) {},
15:11:12.948       waitUntil: [Function: bound ],
15:11:12.948       onClose: [Function: bound onClose],
15:11:12.948       onTaskError: [Function: onTaskError],
15:11:12.948       callbackQueue: [o]
15:11:12.948     },
15:11:12.948     dynamicIOEnabled: false,
15:11:12.948     dev: false,
15:11:12.948     previouslyRevalidatedTags: [],
15:11:12.948     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.948     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.948     fetchMetrics: [],
15:11:12.948     dynamicUsageDescription: 'cookies',
15:11:12.948     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.948       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.948       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.948       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.948       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.948       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.948       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.948       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.948       '    at stringify (<anonymous>)\n' +
15:11:12.948       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.948       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.948   },
15:11:12.948   [Symbol(kResourceStore)]: eg {
15:11:12.948     type: 20,
15:11:12.948     status: 14,
15:11:12.948     flushScheduled: false,
15:11:12.948     fatalError: null,
15:11:12.948     destination: null,
15:11:12.948     bundlerConfig: {
15:11:12.948       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.948       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.949       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.949       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.950       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.950       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.950       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.950     },
15:11:12.950     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.950     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.950     nextChunkId: 28,
15:11:12.950     pendingChunks: 0,
15:11:12.950     hints: Set(17) {
15:11:12.950       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.950       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.951       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.951       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.951       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.951       'L[style]/_next/static/css/c8594d1f8e0bb05d.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.951     },
15:11:12.951     abortableTasks: Set(0) {},
15:11:12.951     pingedTasks: [],
15:11:12.951     completedImportChunks: [],
15:11:12.951     completedHintChunks: [],
15:11:12.951     completedRegularChunks: [],
15:11:12.951     completedErrorChunks: [],
15:11:12.951     writtenSymbols: Map(2) {
15:11:12.951       Symbol(react.fragment) => 1,
15:11:12.951       Symbol(react.suspense) => 26
15:11:12.951     },
15:11:12.951     writtenClientReferences: Map(7) {
15:11:12.951       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.951       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.951       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.951       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.951       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 21,
15:11:12.951       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 23,
15:11:12.951       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 25
15:11:12.951     },
15:11:12.951     writtenServerReferences: Map(0) {},
15:11:12.951     writtenObjects: WeakMap { <items unknown> },
15:11:12.951     temporaryReferences: undefined,
15:11:12.951     identifierPrefix: '',
15:11:12.951     identifierCount: 1,
15:11:12.951     taintCleanupQueue: [],
15:11:12.951     onError: [Function (anonymous)],
15:11:12.951     onPostpone: [Function: X],
15:11:12.951     onAllReady: [Function: X],
15:11:12.951     onFatalError: [Function: X]
15:11:12.951   },
15:11:12.951   [Symbol(kResourceStore)]: undefined,
15:11:12.951   [Symbol(kResourceStore)]: {
15:11:12.951     type: 'prerender-legacy',
15:11:12.951     phase: 'render',
15:11:12.951     rootParams: {},
15:11:12.951     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.951     revalidate: 0,
15:11:12.951     expire: 4294967294,
15:11:12.951     stale: 4294967294,
15:11:12.951     tags: [
15:11:12.951       '_N_T_/layout',
15:11:12.951       '_N_T_/admin/layout',
15:11:12.951       '_N_T_/admin/about/layout',
15:11:12.951       '_N_T_/admin/about/page',
15:11:12.951       '_N_T_/admin/about'
15:11:12.951     ]
15:11:12.951   }
15:11:12.951 }
15:11:12.951 Unhandled rejection Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.952     at r (.next/server/chunks/657.js:12:54555)
15:11:12.952     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.952     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.952     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.952     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.952     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.952     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.952     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.952   description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.952   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.952 } Promise {
15:11:12.952   <rejected> Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.952       at r (.next/server/chunks/657.js:12:54555)
15:11:12.952       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.952       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.952       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.952       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.952       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.952       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.952       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.952     description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.952     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.952   },
15:11:12.952   [Symbol(async_id_symbol)]: 2821,
15:11:12.952   [Symbol(trigger_async_id_symbol)]: 2783,
15:11:12.952   [Symbol(kResourceStore)]: undefined,
15:11:12.952   [Symbol(kResourceStore)]: {
15:11:12.952     isStaticGeneration: true,
15:11:12.952     page: '/admin/about/page',
15:11:12.952     fallbackRouteParams: null,
15:11:12.952     route: '/admin/about',
15:11:12.952     incrementalCache: IncrementalCache {
15:11:12.952       locks: Map(0) {},
15:11:12.952       hasCustomCacheHandler: false,
15:11:12.952       dev: false,
15:11:12.952       disableForTestmode: false,
15:11:12.952       minimalMode: true,
15:11:12.952       requestHeaders: {},
15:11:12.952       allowedRevalidateHeaderKeys: undefined,
15:11:12.952       prerenderManifest: [Object],
15:11:12.952       cacheControls: [SharedCacheControls],
15:11:12.952       fetchCacheKeyPrefix: '',
15:11:12.952       cacheHandler: [FileSystemCache]
15:11:12.952     },
15:11:12.952     cacheLifeProfiles: {
15:11:12.952       default: [Object],
15:11:12.952       seconds: [Object],
15:11:12.952       minutes: [Object],
15:11:12.952       hours: [Object],
15:11:12.952       days: [Object],
15:11:12.952       weeks: [Object],
15:11:12.952       max: [Object]
15:11:12.953     },
15:11:12.953     isRevalidate: true,
15:11:12.953     isBuildTimePrerendering: true,
15:11:12.953     hasReadableErrorStacks: false,
15:11:12.953     fetchCache: undefined,
15:11:12.953     isOnDemandRevalidate: undefined,
15:11:12.953     isDraftMode: undefined,
15:11:12.953     requestEndedState: { ended: false },
15:11:12.953     isPrefetchRequest: false,
15:11:12.953     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.953     reactLoadableManifest: {
15:11:12.953       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.953       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.953       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.953       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.953       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.953       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.953       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.953       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.953       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.953       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.953       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.953       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.953       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.953       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.953       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.953     },
15:11:12.953     assetPrefix: '',
15:11:12.953     afterContext: eJ {
15:11:12.953       workUnitStores: Set(0) {},
15:11:12.953       waitUntil: [Function: bound ],
15:11:12.953       onClose: [Function: bound onClose],
15:11:12.953       onTaskError: [Function: onTaskError],
15:11:12.953       callbackQueue: [o]
15:11:12.953     },
15:11:12.953     dynamicIOEnabled: false,
15:11:12.953     dev: false,
15:11:12.953     previouslyRevalidatedTags: [],
15:11:12.953     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.953     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.953     fetchMetrics: [],
15:11:12.953     dynamicUsageDescription: 'cookies',
15:11:12.953     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.953       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.953       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.953       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.953       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.953       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.954       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.954       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.954       '    at stringify (<anonymous>)\n' +
15:11:12.954       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.954       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.954   },
15:11:12.954   [Symbol(kResourceStore)]: eg {
15:11:12.954     type: 20,
15:11:12.954     status: 14,
15:11:12.954     flushScheduled: false,
15:11:12.954     fatalError: null,
15:11:12.954     destination: null,
15:11:12.954     bundlerConfig: {
15:11:12.954       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.954       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.954       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.955       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.955       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.955       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.955     },
15:11:12.956     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.956     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.956     nextChunkId: 28,
15:11:12.956     pendingChunks: 0,
15:11:12.956     hints: Set(17) {
15:11:12.956       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.956       'L[style]/_next/static/css/c8594d1f8e0bb05d.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.956     },
15:11:12.956     abortableTasks: Set(0) {},
15:11:12.956     pingedTasks: [],
15:11:12.956     completedImportChunks: [],
15:11:12.956     completedHintChunks: [],
15:11:12.956     completedRegularChunks: [],
15:11:12.956     completedErrorChunks: [],
15:11:12.956     writtenSymbols: Map(2) {
15:11:12.956       Symbol(react.fragment) => 1,
15:11:12.956       Symbol(react.suspense) => 26
15:11:12.956     },
15:11:12.956     writtenClientReferences: Map(7) {
15:11:12.956       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.956       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.956       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.956       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.956       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 21,
15:11:12.956       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 23,
15:11:12.956       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 25
15:11:12.956     },
15:11:12.956     writtenServerReferences: Map(0) {},
15:11:12.956     writtenObjects: WeakMap { <items unknown> },
15:11:12.956     temporaryReferences: undefined,
15:11:12.956     identifierPrefix: '',
15:11:12.956     identifierCount: 1,
15:11:12.956     taintCleanupQueue: [],
15:11:12.956     onError: [Function (anonymous)],
15:11:12.956     onPostpone: [Function: X],
15:11:12.957     onAllReady: [Function: X],
15:11:12.957     onFatalError: [Function: X]
15:11:12.957   },
15:11:12.957   [Symbol(kResourceStore)]: undefined,
15:11:12.957   [Symbol(kResourceStore)]: {
15:11:12.957     type: 'prerender-legacy',
15:11:12.957     phase: 'render',
15:11:12.957     rootParams: {},
15:11:12.957     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.957     revalidate: 0,
15:11:12.957     expire: 4294967294,
15:11:12.957     stale: 4294967294,
15:11:12.957     tags: [
15:11:12.957       '_N_T_/layout',
15:11:12.957       '_N_T_/admin/layout',
15:11:12.957       '_N_T_/admin/about/layout',
15:11:12.957       '_N_T_/admin/about/page',
15:11:12.957       '_N_T_/admin/about'
15:11:12.957     ]
15:11:12.957   }
15:11:12.957 }
15:11:12.957 Unhandled rejection Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.957     at r (.next/server/chunks/657.js:12:54555)
15:11:12.957     at n (.next/server/chunks/5208.js:1:9468)
15:11:12.957     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.957     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.957     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.957     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.957     at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.957   description: "Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.957   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.957 } Promise {
15:11:12.957   <rejected> Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.957       at r (.next/server/chunks/657.js:12:54555)
15:11:12.957       at n (.next/server/chunks/5208.js:1:9468)
15:11:12.957       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:12.957       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:12.957       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:12.957       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:12.957       at I (.next/server/chunks/9192.js:55:2658) {
15:11:12.957     description: "Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.957     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.957   },
15:11:12.957   [Symbol(async_id_symbol)]: 2827,
15:11:12.957   [Symbol(trigger_async_id_symbol)]: 2806,
15:11:12.957   [Symbol(kResourceStore)]: undefined,
15:11:12.957   [Symbol(kResourceStore)]: {
15:11:12.957     isStaticGeneration: true,
15:11:12.957     page: '/admin/about/page',
15:11:12.957     fallbackRouteParams: null,
15:11:12.957     route: '/admin/about',
15:11:12.958     incrementalCache: IncrementalCache {
15:11:12.958       locks: Map(0) {},
15:11:12.958       hasCustomCacheHandler: false,
15:11:12.958       dev: false,
15:11:12.958       disableForTestmode: false,
15:11:12.958       minimalMode: true,
15:11:12.958       requestHeaders: {},
15:11:12.958       allowedRevalidateHeaderKeys: undefined,
15:11:12.958       prerenderManifest: [Object],
15:11:12.958       cacheControls: [SharedCacheControls],
15:11:12.958       fetchCacheKeyPrefix: '',
15:11:12.958       cacheHandler: [FileSystemCache]
15:11:12.958     },
15:11:12.958     cacheLifeProfiles: {
15:11:12.958       default: [Object],
15:11:12.958       seconds: [Object],
15:11:12.958       minutes: [Object],
15:11:12.958       hours: [Object],
15:11:12.958       days: [Object],
15:11:12.958       weeks: [Object],
15:11:12.958       max: [Object]
15:11:12.958     },
15:11:12.958     isRevalidate: true,
15:11:12.958     isBuildTimePrerendering: true,
15:11:12.958     hasReadableErrorStacks: false,
15:11:12.958     fetchCache: undefined,
15:11:12.958     isOnDemandRevalidate: undefined,
15:11:12.958     isDraftMode: undefined,
15:11:12.958     requestEndedState: { ended: false },
15:11:12.958     isPrefetchRequest: false,
15:11:12.958     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.958     reactLoadableManifest: {
15:11:12.958       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.958       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.958       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.958       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.958       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.958       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.958       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.958       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.958       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.958       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.959       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.959       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.959       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.959       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.959       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.959     },
15:11:12.959     assetPrefix: '',
15:11:12.959     afterContext: eJ {
15:11:12.959       workUnitStores: Set(0) {},
15:11:12.959       waitUntil: [Function: bound ],
15:11:12.959       onClose: [Function: bound onClose],
15:11:12.959       onTaskError: [Function: onTaskError],
15:11:12.959       callbackQueue: [o]
15:11:12.959     },
15:11:12.959     dynamicIOEnabled: false,
15:11:12.959     dev: false,
15:11:12.959     previouslyRevalidatedTags: [],
15:11:12.959     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.959     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.959     fetchMetrics: [],
15:11:12.959     dynamicUsageDescription: 'cookies',
15:11:12.959     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.959       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.959       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.959       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.959       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.959       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.959       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.959       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.959       '    at stringify (<anonymous>)\n' +
15:11:12.959       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.959       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.959   },
15:11:12.959   [Symbol(kResourceStore)]: eg {
15:11:12.959     type: 20,
15:11:12.959     status: 14,
15:11:12.959     flushScheduled: false,
15:11:12.959     fatalError: null,
15:11:12.959     destination: null,
15:11:12.959     bundlerConfig: {
15:11:12.959       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.959       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.959       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.960       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.960       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.960       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.960       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.960       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.960       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.961       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.961       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.961       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.961       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.961       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.968       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.968       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.968     },
15:11:12.968     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.968     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.968     nextChunkId: 28,
15:11:12.968     pendingChunks: 0,
15:11:12.968     hints: Set(17) {
15:11:12.968       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.968       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.969       'L[style]/_next/static/css/c8594d1f8e0bb05d.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:12.969     },
15:11:12.969     abortableTasks: Set(0) {},
15:11:12.969     pingedTasks: [],
15:11:12.969     completedImportChunks: [],
15:11:12.969     completedHintChunks: [],
15:11:12.969     completedRegularChunks: [],
15:11:12.969     completedErrorChunks: [],
15:11:12.969     writtenSymbols: Map(2) {
15:11:12.969       Symbol(react.fragment) => 1,
15:11:12.969       Symbol(react.suspense) => 26
15:11:12.969     },
15:11:12.969     writtenClientReferences: Map(7) {
15:11:12.969       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:12.969       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:12.969       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:12.969       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:12.969       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 21,
15:11:12.969       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 23,
15:11:12.969       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 25
15:11:12.969     },
15:11:12.969     writtenServerReferences: Map(0) {},
15:11:12.969     writtenObjects: WeakMap { <items unknown> },
15:11:12.969     temporaryReferences: undefined,
15:11:12.969     identifierPrefix: '',
15:11:12.969     identifierCount: 1,
15:11:12.969     taintCleanupQueue: [],
15:11:12.969     onError: [Function (anonymous)],
15:11:12.969     onPostpone: [Function: X],
15:11:12.969     onAllReady: [Function: X],
15:11:12.969     onFatalError: [Function: X]
15:11:12.969   },
15:11:12.969   [Symbol(kResourceStore)]: undefined,
15:11:12.969   [Symbol(kResourceStore)]: {
15:11:12.969     type: 'prerender-legacy',
15:11:12.969     phase: 'render',
15:11:12.969     rootParams: {},
15:11:12.969     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:12.969     revalidate: 0,
15:11:12.969     expire: 4294967294,
15:11:12.969     stale: 4294967294,
15:11:12.969     tags: [
15:11:12.969       '_N_T_/layout',
15:11:12.969       '_N_T_/admin/layout',
15:11:12.969       '_N_T_/admin/about/layout',
15:11:12.969       '_N_T_/admin/about/page',
15:11:12.970       '_N_T_/admin/about'
15:11:12.970     ]
15:11:12.970   }
15:11:12.970 }
15:11:12.970 Unhandled rejection Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.970     at r (.next/server/chunks/657.js:12:54555)
15:11:12.970     at m (.next/server/chunks/5208.js:1:2857)
15:11:12.970     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.970     at k (.next/server/chunks/7183.js:31:1134)
15:11:12.970     at e (.next/server/chunks/7183.js:1:4325)
15:11:12.970     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.970     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.970     at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.970   description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.970   digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.970 } Promise {
15:11:12.970   <rejected> Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:12.970       at r (.next/server/chunks/657.js:12:54555)
15:11:12.970       at m (.next/server/chunks/5208.js:1:2857)
15:11:12.970       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:12.970       at k (.next/server/chunks/7183.js:31:1134)
15:11:12.970       at e (.next/server/chunks/7183.js:1:4325)
15:11:12.970       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:12.970       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:12.970       at I (.next/server/chunks/9192.js:55:2442) {
15:11:12.970     description: "Route /admin/about couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:12.970     digest: 'DYNAMIC_SERVER_USAGE'
15:11:12.970   },
15:11:12.970   [Symbol(async_id_symbol)]: 2814,
15:11:12.970   [Symbol(trigger_async_id_symbol)]: 2783,
15:11:12.970   [Symbol(kResourceStore)]: undefined,
15:11:12.970   [Symbol(kResourceStore)]: {
15:11:12.971     isStaticGeneration: true,
15:11:12.971     page: '/admin/about/page',
15:11:12.971     fallbackRouteParams: null,
15:11:12.971     route: '/admin/about',
15:11:12.971     incrementalCache: IncrementalCache {
15:11:12.971       locks: Map(0) {},
15:11:12.971       hasCustomCacheHandler: false,
15:11:12.971       dev: false,
15:11:12.971       disableForTestmode: false,
15:11:12.971       minimalMode: true,
15:11:12.971       requestHeaders: {},
15:11:12.971       allowedRevalidateHeaderKeys: undefined,
15:11:12.971       prerenderManifest: [Object],
15:11:12.971       cacheControls: [SharedCacheControls],
15:11:12.971       fetchCacheKeyPrefix: '',
15:11:12.971       cacheHandler: [FileSystemCache]
15:11:12.971     },
15:11:12.971     cacheLifeProfiles: {
15:11:12.971       default: [Object],
15:11:12.971       seconds: [Object],
15:11:12.971       minutes: [Object],
15:11:12.971       hours: [Object],
15:11:12.971       days: [Object],
15:11:12.971       weeks: [Object],
15:11:12.971       max: [Object]
15:11:12.971     },
15:11:12.971     isRevalidate: true,
15:11:12.971     isBuildTimePrerendering: true,
15:11:12.971     hasReadableErrorStacks: false,
15:11:12.971     fetchCache: undefined,
15:11:12.971     isOnDemandRevalidate: undefined,
15:11:12.971     isDraftMode: undefined,
15:11:12.971     requestEndedState: { ended: false },
15:11:12.971     isPrefetchRequest: false,
15:11:12.971     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:12.971     reactLoadableManifest: {
15:11:12.971       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:12.971       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:12.972       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:12.972       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:12.972       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:12.972       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:12.972       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:12.972       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:12.972       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:12.972       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:12.972       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:12.972       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:12.972       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:12.972       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:12.972       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:12.972     },
15:11:12.972     assetPrefix: '',
15:11:12.972     afterContext: eJ {
15:11:12.972       workUnitStores: Set(0) {},
15:11:12.972       waitUntil: [Function: bound ],
15:11:12.972       onClose: [Function: bound onClose],
15:11:12.972       onTaskError: [Function: onTaskError],
15:11:12.972       callbackQueue: [o]
15:11:12.972     },
15:11:12.972     dynamicIOEnabled: false,
15:11:12.972     dev: false,
15:11:12.972     previouslyRevalidatedTags: [],
15:11:12.972     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:12.972     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:12.972     fetchMetrics: [],
15:11:12.972     dynamicUsageDescription: 'cookies',
15:11:12.972     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/about couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:12.972       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:12.972       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:12.972       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:12.972       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:12.972       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:12.972       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:12.973       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:12.973       '    at stringify (<anonymous>)\n' +
15:11:12.973       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:12.973       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:12.973   },
15:11:12.973   [Symbol(kResourceStore)]: eg {
15:11:12.973     type: 20,
15:11:12.973     status: 14,
15:11:12.973     flushScheduled: false,
15:11:12.973     fatalError: null,
15:11:12.973     destination: null,
15:11:12.973     bundlerConfig: {
15:11:12.973       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:12.973       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:12.973       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:12.973       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:12.973       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:12.973       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:12.973       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:12.974       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:12.974       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:12.975       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:12.975       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:12.975     },
15:11:12.975     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:12.975     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:12.975     nextChunkId: 28,
15:11:12.975     pendingChunks: 0,
15:11:12.975     hints: Set(17) {
15:11:12.975       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.975       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:12.975       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.312       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.312       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.312       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.312       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.312       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.312       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.312       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.313       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.313       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.313       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.313       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.313       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.313       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.313       'L[style]/_next/static/css/c8594d1f8e0bb05d.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:13.313     },
15:11:13.313     abortableTasks: Set(0) {},
15:11:13.313     pingedTasks: [],
15:11:13.313     completedImportChunks: [],
15:11:13.313     completedHintChunks: [],
15:11:13.313     completedRegularChunks: [],
15:11:13.313     completedErrorChunks: [],
15:11:13.313     writtenSymbols: Map(2) {
15:11:13.313       Symbol(react.fragment) => 1,
15:11:13.313       Symbol(react.suspense) => 26
15:11:13.313     },
15:11:13.313     writtenClientReferences: Map(7) {
15:11:13.313       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:13.313       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:13.313       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:13.313       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:13.314       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 21,
15:11:13.314       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 23,
15:11:13.314       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 25
15:11:13.314     },
15:11:13.314     writtenServerReferences: Map(0) {},
15:11:13.314     writtenObjects: WeakMap { <items unknown> },
15:11:13.314     temporaryReferences: undefined,
15:11:13.314     identifierPrefix: '',
15:11:13.314     identifierCount: 1,
15:11:13.314     taintCleanupQueue: [],
15:11:13.314     onError: [Function (anonymous)],
15:11:13.314     onPostpone: [Function: X],
15:11:13.314     onAllReady: [Function: X],
15:11:13.314     onFatalError: [Function: X]
15:11:13.314   },
15:11:13.314   [Symbol(kResourceStore)]: undefined,
15:11:13.314   [Symbol(kResourceStore)]: {
15:11:13.314     type: 'prerender-legacy',
15:11:13.314     phase: 'render',
15:11:13.314     rootParams: {},
15:11:13.314     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:13.314     revalidate: 0,
15:11:13.314     expire: 4294967294,
15:11:13.314     stale: 4294967294,
15:11:13.314     tags: [
15:11:13.314       '_N_T_/layout',
15:11:13.314       '_N_T_/admin/layout',
15:11:13.314       '_N_T_/admin/about/layout',
15:11:13.314       '_N_T_/admin/about/page',
15:11:13.314       '_N_T_/admin/about'
15:11:13.314     ]
15:11:13.314   }
15:11:13.315 }
15:11:13.315 Failed to load custom stylesheet CSS Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.315     at r (.next/server/chunks/657.js:12:54555)
15:11:13.315     at m (.next/server/chunks/5208.js:1:2857)
15:11:13.315     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.315     at k (.next/server/chunks/7183.js:31:1134)
15:11:13.315     at e (.next/server/chunks/7183.js:1:4325)
15:11:13.315     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.315     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.315     at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.315   description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.315   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.315 }
15:11:13.315 Failed to load custom JavaScript Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.315     at r (.next/server/chunks/657.js:12:54555)
15:11:13.315     at m (.next/server/chunks/5208.js:1:2857)
15:11:13.315     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.315     at k (.next/server/chunks/7183.js:31:1134)
15:11:13.315     at e (.next/server/chunks/7183.js:1:4325)
15:11:13.315     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.315     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.315     at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.315   description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.315   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.315 }
15:11:13.315 Unhandled rejection Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.315     at r (.next/server/chunks/657.js:12:54555)
15:11:13.315     at n (.next/server/chunks/5208.js:1:9468)
15:11:13.315     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:13.315     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:13.315     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:13.315     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:13.315     at I (.next/server/chunks/9192.js:55:2658) {
15:11:13.315   description: "Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.315   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.315 } Promise {
15:11:13.315   <rejected> Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.315       at r (.next/server/chunks/657.js:12:54555)
15:11:13.315       at n (.next/server/chunks/5208.js:1:9468)
15:11:13.315       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:13.315       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:13.315       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:13.316       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:13.316       at I (.next/server/chunks/9192.js:55:2658) {
15:11:13.316     description: "Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.316     digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.316   },
15:11:13.316   [Symbol(async_id_symbol)]: 3450,
15:11:13.316   [Symbol(trigger_async_id_symbol)]: 3432,
15:11:13.316   [Symbol(kResourceStore)]: undefined,
15:11:13.316   [Symbol(kResourceStore)]: {
15:11:13.316     isStaticGeneration: true,
15:11:13.316     page: '/admin/browser-test/page',
15:11:13.316     fallbackRouteParams: null,
15:11:13.316     route: '/admin/browser-test',
15:11:13.316     incrementalCache: IncrementalCache {
15:11:13.316       locks: Map(0) {},
15:11:13.316       hasCustomCacheHandler: false,
15:11:13.316       dev: false,
15:11:13.316       disableForTestmode: false,
15:11:13.316       minimalMode: true,
15:11:13.316       requestHeaders: {},
15:11:13.316       allowedRevalidateHeaderKeys: undefined,
15:11:13.316       prerenderManifest: [Object],
15:11:13.316       cacheControls: [SharedCacheControls],
15:11:13.316       fetchCacheKeyPrefix: '',
15:11:13.316       cacheHandler: [FileSystemCache]
15:11:13.316     },
15:11:13.316     cacheLifeProfiles: {
15:11:13.316       default: [Object],
15:11:13.316       seconds: [Object],
15:11:13.316       minutes: [Object],
15:11:13.316       hours: [Object],
15:11:13.316       days: [Object],
15:11:13.316       weeks: [Object],
15:11:13.316       max: [Object]
15:11:13.316     },
15:11:13.316     isRevalidate: true,
15:11:13.316     isBuildTimePrerendering: true,
15:11:13.316     hasReadableErrorStacks: false,
15:11:13.316     fetchCache: undefined,
15:11:13.316     isOnDemandRevalidate: undefined,
15:11:13.316     isDraftMode: undefined,
15:11:13.316     requestEndedState: { ended: false },
15:11:13.317     isPrefetchRequest: false,
15:11:13.317     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:13.317     reactLoadableManifest: {
15:11:13.317       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:13.317       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:13.317       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:13.317       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:13.317       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:13.317       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:13.317       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:13.317       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:13.317       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:13.317       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:13.317       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:13.317       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:13.317       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:13.317       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:13.317       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:13.317     },
15:11:13.317     assetPrefix: '',
15:11:13.317     afterContext: eJ {
15:11:13.317       workUnitStores: Set(0) {},
15:11:13.317       waitUntil: [Function: bound ],
15:11:13.317       onClose: [Function: bound onClose],
15:11:13.317       onTaskError: [Function: onTaskError],
15:11:13.317       callbackQueue: [o]
15:11:13.317     },
15:11:13.317     dynamicIOEnabled: false,
15:11:13.317     dev: false,
15:11:13.317     previouslyRevalidatedTags: [],
15:11:13.317     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:13.317     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:13.317     fetchMetrics: [],
15:11:13.317     dynamicUsageDescription: 'cookies',
15:11:13.317     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:13.317       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:13.317       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:13.317       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:13.317       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:13.317       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:13.318       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:13.318       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:13.318       '    at stringify (<anonymous>)\n' +
15:11:13.318       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:13.318       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:13.318   },
15:11:13.318   [Symbol(kResourceStore)]: eg {
15:11:13.318     type: 20,
15:11:13.318     status: 14,
15:11:13.318     flushScheduled: false,
15:11:13.318     fatalError: null,
15:11:13.318     destination: null,
15:11:13.318     bundlerConfig: {
15:11:13.318       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.318       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:13.318       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:13.318       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:13.318       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:13.318       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:13.318       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:13.319       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:13.319       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:13.319       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:13.320       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:13.320     },
15:11:13.320     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:13.320     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:13.320     nextChunkId: 26,
15:11:13.320     pendingChunks: 0,
15:11:13.320     hints: Set(16) {
15:11:13.320       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.320       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:13.320     },
15:11:13.320     abortableTasks: Set(0) {},
15:11:13.320     pingedTasks: [],
15:11:13.320     completedImportChunks: [],
15:11:13.321     completedHintChunks: [],
15:11:13.321     completedRegularChunks: [],
15:11:13.321     completedErrorChunks: [],
15:11:13.321     writtenSymbols: Map(2) {
15:11:13.321       Symbol(react.fragment) => 1,
15:11:13.321       Symbol(react.suspense) => 24
15:11:13.321     },
15:11:13.321     writtenClientReferences: Map(7) {
15:11:13.321       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:13.321       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:13.321       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:13.321       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:13.321       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:13.321       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:13.321       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:13.321     },
15:11:13.321     writtenServerReferences: Map(0) {},
15:11:13.321     writtenObjects: WeakMap { <items unknown> },
15:11:13.321     temporaryReferences: undefined,
15:11:13.321     identifierPrefix: '',
15:11:13.321     identifierCount: 1,
15:11:13.321     taintCleanupQueue: [],
15:11:13.321     onError: [Function (anonymous)],
15:11:13.321     onPostpone: [Function: X],
15:11:13.321     onAllReady: [Function: X],
15:11:13.321     onFatalError: [Function: X]
15:11:13.321   },
15:11:13.321   [Symbol(kResourceStore)]: undefined,
15:11:13.321   [Symbol(kResourceStore)]: {
15:11:13.321     type: 'prerender-legacy',
15:11:13.321     phase: 'render',
15:11:13.321     rootParams: {},
15:11:13.321     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:13.321     revalidate: 0,
15:11:13.321     expire: 4294967294,
15:11:13.321     stale: 4294967294,
15:11:13.321     tags: [
15:11:13.321       '_N_T_/layout',
15:11:13.321       '_N_T_/admin/layout',
15:11:13.321       '_N_T_/admin/browser-test/layout',
15:11:13.321       '_N_T_/admin/browser-test/page',
15:11:13.321       '_N_T_/admin/browser-test'
15:11:13.321     ]
15:11:13.321   }
15:11:13.321 }
15:11:13.322 Unhandled rejection Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.322     at r (.next/server/chunks/657.js:12:54555)
15:11:13.322     at n (.next/server/chunks/5208.js:1:9468)
15:11:13.322     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:13.322     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:13.322     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:13.322     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:13.322     at I (.next/server/chunks/9192.js:55:2658) {
15:11:13.322   description: "Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.322   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.322 } Promise {
15:11:13.322   <rejected> Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.322       at r (.next/server/chunks/657.js:12:54555)
15:11:13.322       at n (.next/server/chunks/5208.js:1:9468)
15:11:13.322       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:13.322       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:13.322       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:13.322       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:13.322       at I (.next/server/chunks/9192.js:55:2658) {
15:11:13.322     description: "Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.322     digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.322   },
15:11:13.322   [Symbol(async_id_symbol)]: 3459,
15:11:13.322   [Symbol(trigger_async_id_symbol)]: 3432,
15:11:13.322   [Symbol(kResourceStore)]: undefined,
15:11:13.322   [Symbol(kResourceStore)]: {
15:11:13.322     isStaticGeneration: true,
15:11:13.322     page: '/admin/browser-test/page',
15:11:13.322     fallbackRouteParams: null,
15:11:13.322     route: '/admin/browser-test',
15:11:13.322     incrementalCache: IncrementalCache {
15:11:13.322       locks: Map(0) {},
15:11:13.322       hasCustomCacheHandler: false,
15:11:13.322       dev: false,
15:11:13.322       disableForTestmode: false,
15:11:13.322       minimalMode: true,
15:11:13.322       requestHeaders: {},
15:11:13.322       allowedRevalidateHeaderKeys: undefined,
15:11:13.322       prerenderManifest: [Object],
15:11:13.322       cacheControls: [SharedCacheControls],
15:11:13.323       fetchCacheKeyPrefix: '',
15:11:13.323       cacheHandler: [FileSystemCache]
15:11:13.323     },
15:11:13.323     cacheLifeProfiles: {
15:11:13.323       default: [Object],
15:11:13.323       seconds: [Object],
15:11:13.323       minutes: [Object],
15:11:13.323       hours: [Object],
15:11:13.323       days: [Object],
15:11:13.323       weeks: [Object],
15:11:13.323       max: [Object]
15:11:13.323     },
15:11:13.323     isRevalidate: true,
15:11:13.323     isBuildTimePrerendering: true,
15:11:13.323     hasReadableErrorStacks: false,
15:11:13.323     fetchCache: undefined,
15:11:13.323     isOnDemandRevalidate: undefined,
15:11:13.323     isDraftMode: undefined,
15:11:13.323     requestEndedState: { ended: false },
15:11:13.323     isPrefetchRequest: false,
15:11:13.323     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:13.323     reactLoadableManifest: {
15:11:13.323       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:13.323       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:13.323       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:13.323       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:13.323       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:13.323       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:13.323       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:13.323       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:13.323       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:13.323       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:13.323       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:13.323       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:13.323       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:13.323       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:13.323       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:13.323     },
15:11:13.323     assetPrefix: '',
15:11:13.323     afterContext: eJ {
15:11:13.323       workUnitStores: Set(0) {},
15:11:13.323       waitUntil: [Function: bound ],
15:11:13.324       onClose: [Function: bound onClose],
15:11:13.324       onTaskError: [Function: onTaskError],
15:11:13.324       callbackQueue: [o]
15:11:13.324     },
15:11:13.324     dynamicIOEnabled: false,
15:11:13.324     dev: false,
15:11:13.324     previouslyRevalidatedTags: [],
15:11:13.324     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:13.324     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:13.324     fetchMetrics: [],
15:11:13.324     dynamicUsageDescription: 'cookies',
15:11:13.324     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:13.324       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:13.324       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:13.324       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:13.324       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:13.324       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:13.324       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:13.324       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:13.324       '    at stringify (<anonymous>)\n' +
15:11:13.324       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:13.324       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:13.324   },
15:11:13.324   [Symbol(kResourceStore)]: eg {
15:11:13.324     type: 20,
15:11:13.324     status: 14,
15:11:13.324     flushScheduled: false,
15:11:13.324     fatalError: null,
15:11:13.324     destination: null,
15:11:13.324     bundlerConfig: {
15:11:13.324       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:13.324       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:13.325       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:13.325       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:13.326       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:13.326       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:13.326       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:13.326     },
15:11:13.326     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:13.326     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:13.326     nextChunkId: 26,
15:11:13.326     pendingChunks: 0,
15:11:13.326     hints: Set(16) {
15:11:13.326       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.326       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.326       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.326       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.326       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.327       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:13.327     },
15:11:13.327     abortableTasks: Set(0) {},
15:11:13.327     pingedTasks: [],
15:11:13.327     completedImportChunks: [],
15:11:13.327     completedHintChunks: [],
15:11:13.327     completedRegularChunks: [],
15:11:13.327     completedErrorChunks: [],
15:11:13.327     writtenSymbols: Map(2) {
15:11:13.327       Symbol(react.fragment) => 1,
15:11:13.327       Symbol(react.suspense) => 24
15:11:13.327     },
15:11:13.327     writtenClientReferences: Map(7) {
15:11:13.327       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:13.327       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:13.327       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:13.327       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:13.327       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:13.327       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:13.327       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:13.327     },
15:11:13.327     writtenServerReferences: Map(0) {},
15:11:13.327     writtenObjects: WeakMap { <items unknown> },
15:11:13.327     temporaryReferences: undefined,
15:11:13.327     identifierPrefix: '',
15:11:13.327     identifierCount: 1,
15:11:13.327     taintCleanupQueue: [],
15:11:13.327     onError: [Function (anonymous)],
15:11:13.327     onPostpone: [Function: X],
15:11:13.327     onAllReady: [Function: X],
15:11:13.327     onFatalError: [Function: X]
15:11:13.327   },
15:11:13.327   [Symbol(kResourceStore)]: undefined,
15:11:13.327   [Symbol(kResourceStore)]: {
15:11:13.328     type: 'prerender-legacy',
15:11:13.328     phase: 'render',
15:11:13.328     rootParams: {},
15:11:13.328     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:13.328     revalidate: 0,
15:11:13.328     expire: 4294967294,
15:11:13.328     stale: 4294967294,
15:11:13.328     tags: [
15:11:13.328       '_N_T_/layout',
15:11:13.328       '_N_T_/admin/layout',
15:11:13.328       '_N_T_/admin/browser-test/layout',
15:11:13.328       '_N_T_/admin/browser-test/page',
15:11:13.328       '_N_T_/admin/browser-test'
15:11:13.328     ]
15:11:13.328   }
15:11:13.328 }
15:11:13.328 Unhandled rejection Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.328     at r (.next/server/chunks/657.js:12:54555)
15:11:13.328     at m (.next/server/chunks/5208.js:1:2857)
15:11:13.328     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.328     at k (.next/server/chunks/7183.js:31:1134)
15:11:13.328     at e (.next/server/chunks/7183.js:1:4325)
15:11:13.328     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.328     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.328     at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.328   description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.328   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.328 } Promise {
15:11:13.328   <rejected> Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.328       at r (.next/server/chunks/657.js:12:54555)
15:11:13.328       at m (.next/server/chunks/5208.js:1:2857)
15:11:13.328       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.328       at k (.next/server/chunks/7183.js:31:1134)
15:11:13.328       at e (.next/server/chunks/7183.js:1:4325)
15:11:13.328       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.328       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.328       at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.328     description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.328     digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.328   },
15:11:13.328   [Symbol(async_id_symbol)]: 3442,
15:11:13.328   [Symbol(trigger_async_id_symbol)]: 3432,
15:11:13.328   [Symbol(kResourceStore)]: undefined,
15:11:13.328   [Symbol(kResourceStore)]: {
15:11:13.328     isStaticGeneration: true,
15:11:13.328     page: '/admin/browser-test/page',
15:11:13.328     fallbackRouteParams: null,
15:11:13.328     route: '/admin/browser-test',
15:11:13.328     incrementalCache: IncrementalCache {
15:11:13.328       locks: Map(0) {},
15:11:13.328       hasCustomCacheHandler: false,
15:11:13.328       dev: false,
15:11:13.328       disableForTestmode: false,
15:11:13.328       minimalMode: true,
15:11:13.328       requestHeaders: {},
15:11:13.328       allowedRevalidateHeaderKeys: undefined,
15:11:13.328       prerenderManifest: [Object],
15:11:13.328       cacheControls: [SharedCacheControls],
15:11:13.328       fetchCacheKeyPrefix: '',
15:11:13.329       cacheHandler: [FileSystemCache]
15:11:13.329     },
15:11:13.329     cacheLifeProfiles: {
15:11:13.329       default: [Object],
15:11:13.329       seconds: [Object],
15:11:13.329       minutes: [Object],
15:11:13.329       hours: [Object],
15:11:13.329       days: [Object],
15:11:13.329       weeks: [Object],
15:11:13.329       max: [Object]
15:11:13.329     },
15:11:13.329     isRevalidate: true,
15:11:13.329     isBuildTimePrerendering: true,
15:11:13.329     hasReadableErrorStacks: false,
15:11:13.329     fetchCache: undefined,
15:11:13.329     isOnDemandRevalidate: undefined,
15:11:13.329     isDraftMode: undefined,
15:11:13.329     requestEndedState: { ended: false },
15:11:13.329     isPrefetchRequest: false,
15:11:13.329     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:13.329     reactLoadableManifest: {
15:11:13.329       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:13.329       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:13.329       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:13.329       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:13.329       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:13.329       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:13.329       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:13.329       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:13.329       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:13.329       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:13.329       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:13.329       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:13.329       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:13.329       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:13.329       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:13.329     },
15:11:13.329     assetPrefix: '',
15:11:13.329     afterContext: eJ {
15:11:13.329       workUnitStores: Set(0) {},
15:11:13.329       waitUntil: [Function: bound ],
15:11:13.329       onClose: [Function: bound onClose],
15:11:13.329       onTaskError: [Function: onTaskError],
15:11:13.329       callbackQueue: [o]
15:11:13.329     },
15:11:13.329     dynamicIOEnabled: false,
15:11:13.329     dev: false,
15:11:13.329     previouslyRevalidatedTags: [],
15:11:13.329     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:13.330     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:13.330     fetchMetrics: [],
15:11:13.330     dynamicUsageDescription: 'cookies',
15:11:13.330     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:13.330       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:13.330       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:13.330       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:13.330       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:13.330       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:13.330       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:13.330       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:13.330       '    at stringify (<anonymous>)\n' +
15:11:13.330       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:13.330       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:13.330   },
15:11:13.330   [Symbol(kResourceStore)]: eg {
15:11:13.330     type: 20,
15:11:13.330     status: 14,
15:11:13.330     flushScheduled: false,
15:11:13.330     fatalError: null,
15:11:13.330     destination: null,
15:11:13.330     bundlerConfig: {
15:11:13.330       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:13.330       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:13.330       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:13.330       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:13.330       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:13.331     },
15:11:13.331     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:13.331     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:13.331     nextChunkId: 26,
15:11:13.331     pendingChunks: 0,
15:11:13.331     hints: Set(16) {
15:11:13.331       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.331       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:13.331     },
15:11:13.331     abortableTasks: Set(0) {},
15:11:13.331     pingedTasks: [],
15:11:13.331     completedImportChunks: [],
15:11:13.331     completedHintChunks: [],
15:11:13.331     completedRegularChunks: [],
15:11:13.331     completedErrorChunks: [],
15:11:13.331     writtenSymbols: Map(2) {
15:11:13.331       Symbol(react.fragment) => 1,
15:11:13.331       Symbol(react.suspense) => 24
15:11:13.331     },
15:11:13.331     writtenClientReferences: Map(7) {
15:11:13.331       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:13.331       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:13.331       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:13.331       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:13.331       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:13.331       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:13.331       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:13.331     },
15:11:13.331     writtenServerReferences: Map(0) {},
15:11:13.331     writtenObjects: WeakMap { <items unknown> },
15:11:13.331     temporaryReferences: undefined,
15:11:13.331     identifierPrefix: '',
15:11:13.331     identifierCount: 1,
15:11:13.331     taintCleanupQueue: [],
15:11:13.331     onError: [Function (anonymous)],
15:11:13.331     onPostpone: [Function: X],
15:11:13.331     onAllReady: [Function: X],
15:11:13.331     onFatalError: [Function: X]
15:11:13.331   },
15:11:13.331   [Symbol(kResourceStore)]: undefined,
15:11:13.331   [Symbol(kResourceStore)]: {
15:11:13.331     type: 'prerender-legacy',
15:11:13.331     phase: 'render',
15:11:13.331     rootParams: {},
15:11:13.331     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:13.331     revalidate: 0,
15:11:13.331     expire: 4294967294,
15:11:13.331     stale: 4294967294,
15:11:13.331     tags: [
15:11:13.331       '_N_T_/layout',
15:11:13.331       '_N_T_/admin/layout',
15:11:13.331       '_N_T_/admin/browser-test/layout',
15:11:13.331       '_N_T_/admin/browser-test/page',
15:11:13.331       '_N_T_/admin/browser-test'
15:11:13.331     ]
15:11:13.331   }
15:11:13.331 }
15:11:13.331 Unhandled rejection Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.331     at r (.next/server/chunks/657.js:12:54555)
15:11:13.331     at m (.next/server/chunks/5208.js:1:2857)
15:11:13.331     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.331     at k (.next/server/chunks/7183.js:31:1134)
15:11:13.331     at e (.next/server/chunks/7183.js:1:4325)
15:11:13.331     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.331     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.331     at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.331   description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.331   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.331 } Promise {
15:11:13.331   <rejected> Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.332       at r (.next/server/chunks/657.js:12:54555)
15:11:13.332       at m (.next/server/chunks/5208.js:1:2857)
15:11:13.332       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.332       at k (.next/server/chunks/7183.js:31:1134)
15:11:13.332       at e (.next/server/chunks/7183.js:1:4325)
15:11:13.332       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.332       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.332       at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.332     description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.332     digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.332   },
15:11:13.332   [Symbol(async_id_symbol)]: 3477,
15:11:13.332   [Symbol(trigger_async_id_symbol)]: 3432,
15:11:13.332   [Symbol(kResourceStore)]: undefined,
15:11:13.332   [Symbol(kResourceStore)]: {
15:11:13.332     isStaticGeneration: true,
15:11:13.332     page: '/admin/browser-test/page',
15:11:13.332     fallbackRouteParams: null,
15:11:13.332     route: '/admin/browser-test',
15:11:13.332     incrementalCache: IncrementalCache {
15:11:13.332       locks: Map(0) {},
15:11:13.332       hasCustomCacheHandler: false,
15:11:13.332       dev: false,
15:11:13.332       disableForTestmode: false,
15:11:13.332       minimalMode: true,
15:11:13.332       requestHeaders: {},
15:11:13.332       allowedRevalidateHeaderKeys: undefined,
15:11:13.332       prerenderManifest: [Object],
15:11:13.332       cacheControls: [SharedCacheControls],
15:11:13.332       fetchCacheKeyPrefix: '',
15:11:13.332       cacheHandler: [FileSystemCache]
15:11:13.332     },
15:11:13.332     cacheLifeProfiles: {
15:11:13.332       default: [Object],
15:11:13.332       seconds: [Object],
15:11:13.332       minutes: [Object],
15:11:13.332       hours: [Object],
15:11:13.332       days: [Object],
15:11:13.332       weeks: [Object],
15:11:13.332       max: [Object]
15:11:13.332     },
15:11:13.332     isRevalidate: true,
15:11:13.332     isBuildTimePrerendering: true,
15:11:13.332     hasReadableErrorStacks: false,
15:11:13.332     fetchCache: undefined,
15:11:13.332     isOnDemandRevalidate: undefined,
15:11:13.332     isDraftMode: undefined,
15:11:13.332     requestEndedState: { ended: false },
15:11:13.332     isPrefetchRequest: false,
15:11:13.332     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:13.332     reactLoadableManifest: {
15:11:13.332       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:13.332       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:13.332       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:13.332       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:13.332       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:13.332       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:13.332       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:13.332       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:13.332       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:13.332       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:13.332       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:13.332       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:13.332       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:13.332       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:13.332       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:13.332     },
15:11:13.332     assetPrefix: '',
15:11:13.332     afterContext: eJ {
15:11:13.332       workUnitStores: Set(0) {},
15:11:13.332       waitUntil: [Function: bound ],
15:11:13.332       onClose: [Function: bound onClose],
15:11:13.332       onTaskError: [Function: onTaskError],
15:11:13.332       callbackQueue: [o]
15:11:13.332     },
15:11:13.332     dynamicIOEnabled: false,
15:11:13.332     dev: false,
15:11:13.332     previouslyRevalidatedTags: [],
15:11:13.332     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:13.332     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:13.332     fetchMetrics: [],
15:11:13.332     dynamicUsageDescription: 'cookies',
15:11:13.332     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:13.332       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:13.332       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:13.332       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:13.332       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:13.332       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:13.332       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:13.332       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:13.332       '    at stringify (<anonymous>)\n' +
15:11:13.332       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:13.332       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:13.332   },
15:11:13.332   [Symbol(kResourceStore)]: eg {
15:11:13.333     type: 20,
15:11:13.333     status: 14,
15:11:13.333     flushScheduled: false,
15:11:13.333     fatalError: null,
15:11:13.333     destination: null,
15:11:13.333     bundlerConfig: {
15:11:13.333       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:13.333       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:13.333       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:13.333       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:13.333       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:13.334       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:13.334     },
15:11:13.334     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:13.334     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:13.334     nextChunkId: 26,
15:11:13.334     pendingChunks: 0,
15:11:13.334     hints: Set(16) {
15:11:13.334       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.334       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:13.334     },
15:11:13.334     abortableTasks: Set(0) {},
15:11:13.334     pingedTasks: [],
15:11:13.334     completedImportChunks: [],
15:11:13.334     completedHintChunks: [],
15:11:13.334     completedRegularChunks: [],
15:11:13.334     completedErrorChunks: [],
15:11:13.335     writtenSymbols: Map(2) {
15:11:13.335       Symbol(react.fragment) => 1,
15:11:13.335       Symbol(react.suspense) => 24
15:11:13.335     },
15:11:13.335     writtenClientReferences: Map(7) {
15:11:13.335       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:13.335       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:13.335       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:13.335       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:13.335       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:13.335       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:13.335       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:13.335     },
15:11:13.335     writtenServerReferences: Map(0) {},
15:11:13.335     writtenObjects: WeakMap { <items unknown> },
15:11:13.335     temporaryReferences: undefined,
15:11:13.335     identifierPrefix: '',
15:11:13.335     identifierCount: 1,
15:11:13.335     taintCleanupQueue: [],
15:11:13.335     onError: [Function (anonymous)],
15:11:13.335     onPostpone: [Function: X],
15:11:13.335     onAllReady: [Function: X],
15:11:13.335     onFatalError: [Function: X]
15:11:13.335   },
15:11:13.335   [Symbol(kResourceStore)]: undefined,
15:11:13.335   [Symbol(kResourceStore)]: {
15:11:13.335     type: 'prerender-legacy',
15:11:13.335     phase: 'render',
15:11:13.335     rootParams: {},
15:11:13.335     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:13.335     revalidate: 0,
15:11:13.335     expire: 4294967294,
15:11:13.335     stale: 4294967294,
15:11:13.335     tags: [
15:11:13.335       '_N_T_/layout',
15:11:13.335       '_N_T_/admin/layout',
15:11:13.335       '_N_T_/admin/browser-test/layout',
15:11:13.335       '_N_T_/admin/browser-test/page',
15:11:13.335       '_N_T_/admin/browser-test'
15:11:13.335     ]
15:11:13.335   }
15:11:13.335 }
15:11:13.335 Unhandled rejection Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.335     at r (.next/server/chunks/657.js:12:54555)
15:11:13.335     at m (.next/server/chunks/5208.js:1:2857)
15:11:13.335     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.335     at k (.next/server/chunks/7183.js:31:1134)
15:11:13.335     at e (.next/server/chunks/7183.js:1:4325)
15:11:13.335     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.335     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.336     at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.336   description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.336   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.336 } Promise {
15:11:13.336   <rejected> Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.336       at r (.next/server/chunks/657.js:12:54555)
15:11:13.336       at m (.next/server/chunks/5208.js:1:2857)
15:11:13.336       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.336       at k (.next/server/chunks/7183.js:31:1134)
15:11:13.336       at e (.next/server/chunks/7183.js:1:4325)
15:11:13.336       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.336       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.336       at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.336     description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.336     digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.336   },
15:11:13.336   [Symbol(async_id_symbol)]: 3481,
15:11:13.336   [Symbol(trigger_async_id_symbol)]: 3432,
15:11:13.336   [Symbol(kResourceStore)]: undefined,
15:11:13.336   [Symbol(kResourceStore)]: {
15:11:13.336     isStaticGeneration: true,
15:11:13.336     page: '/admin/browser-test/page',
15:11:13.336     fallbackRouteParams: null,
15:11:13.336     route: '/admin/browser-test',
15:11:13.336     incrementalCache: IncrementalCache {
15:11:13.336       locks: Map(0) {},
15:11:13.336       hasCustomCacheHandler: false,
15:11:13.336       dev: false,
15:11:13.336       disableForTestmode: false,
15:11:13.336       minimalMode: true,
15:11:13.336       requestHeaders: {},
15:11:13.336       allowedRevalidateHeaderKeys: undefined,
15:11:13.336       prerenderManifest: [Object],
15:11:13.336       cacheControls: [SharedCacheControls],
15:11:13.336       fetchCacheKeyPrefix: '',
15:11:13.336       cacheHandler: [FileSystemCache]
15:11:13.336     },
15:11:13.336     cacheLifeProfiles: {
15:11:13.336       default: [Object],
15:11:13.336       seconds: [Object],
15:11:13.336       minutes: [Object],
15:11:13.336       hours: [Object],
15:11:13.336       days: [Object],
15:11:13.336       weeks: [Object],
15:11:13.336       max: [Object]
15:11:13.336     },
15:11:13.336     isRevalidate: true,
15:11:13.336     isBuildTimePrerendering: true,
15:11:13.336     hasReadableErrorStacks: false,
15:11:13.336     fetchCache: undefined,
15:11:13.336     isOnDemandRevalidate: undefined,
15:11:13.337     isDraftMode: undefined,
15:11:13.337     requestEndedState: { ended: false },
15:11:13.337     isPrefetchRequest: false,
15:11:13.337     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:13.337     reactLoadableManifest: {
15:11:13.337       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:13.337       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:13.337       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:13.337       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:13.337       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:13.337       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:13.337       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:13.337       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:13.337       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:13.337       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:13.337       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:13.337       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:13.337       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:13.337       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:13.337       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:13.337     },
15:11:13.337     assetPrefix: '',
15:11:13.337     afterContext: eJ {
15:11:13.337       workUnitStores: Set(0) {},
15:11:13.337       waitUntil: [Function: bound ],
15:11:13.337       onClose: [Function: bound onClose],
15:11:13.337       onTaskError: [Function: onTaskError],
15:11:13.337       callbackQueue: [o]
15:11:13.337     },
15:11:13.337     dynamicIOEnabled: false,
15:11:13.337     dev: false,
15:11:13.337     previouslyRevalidatedTags: [],
15:11:13.337     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:13.340     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:13.340     fetchMetrics: [],
15:11:13.340     dynamicUsageDescription: 'cookies',
15:11:13.340     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:13.340       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:13.340       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:13.340       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:13.340       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:13.341       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:13.341       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:13.341       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:13.341       '    at stringify (<anonymous>)\n' +
15:11:13.341       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:13.341       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:13.341   },
15:11:13.341   [Symbol(kResourceStore)]: eg {
15:11:13.341     type: 20,
15:11:13.341     status: 14,
15:11:13.341     flushScheduled: false,
15:11:13.341     fatalError: null,
15:11:13.341     destination: null,
15:11:13.341     bundlerConfig: {
15:11:13.341       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.341       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.342       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:13.342       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:13.342       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.342       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:13.342       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:13.342       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:13.342       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:13.342       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:13.342       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:13.343       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:13.343       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:13.344       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:13.344       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:13.344     },
15:11:13.344     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:13.344     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:13.344     nextChunkId: 26,
15:11:13.344     pendingChunks: 0,
15:11:13.344     hints: Set(16) {
15:11:13.344       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.344       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:13.344     },
15:11:13.344     abortableTasks: Set(0) {},
15:11:13.345     pingedTasks: [],
15:11:13.345     completedImportChunks: [],
15:11:13.345     completedHintChunks: [],
15:11:13.345     completedRegularChunks: [],
15:11:13.345     completedErrorChunks: [],
15:11:13.345     writtenSymbols: Map(2) {
15:11:13.345       Symbol(react.fragment) => 1,
15:11:13.345       Symbol(react.suspense) => 24
15:11:13.345     },
15:11:13.345     writtenClientReferences: Map(7) {
15:11:13.345       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:13.345       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:13.345       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:13.345       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:13.345       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:13.345       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:13.345       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:13.345     },
15:11:13.345     writtenServerReferences: Map(0) {},
15:11:13.345     writtenObjects: WeakMap { <items unknown> },
15:11:13.345     temporaryReferences: undefined,
15:11:13.345     identifierPrefix: '',
15:11:13.345     identifierCount: 1,
15:11:13.345     taintCleanupQueue: [],
15:11:13.345     onError: [Function (anonymous)],
15:11:13.345     onPostpone: [Function: X],
15:11:13.345     onAllReady: [Function: X],
15:11:13.345     onFatalError: [Function: X]
15:11:13.345   },
15:11:13.345   [Symbol(kResourceStore)]: undefined,
15:11:13.345   [Symbol(kResourceStore)]: {
15:11:13.345     type: 'prerender-legacy',
15:11:13.345     phase: 'render',
15:11:13.345     rootParams: {},
15:11:13.345     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:13.345     revalidate: 0,
15:11:13.345     expire: 4294967294,
15:11:13.345     stale: 4294967294,
15:11:13.345     tags: [
15:11:13.345       '_N_T_/layout',
15:11:13.345       '_N_T_/admin/layout',
15:11:13.345       '_N_T_/admin/browser-test/layout',
15:11:13.345       '_N_T_/admin/browser-test/page',
15:11:13.345       '_N_T_/admin/browser-test'
15:11:13.345     ]
15:11:13.345   }
15:11:13.345 }
15:11:13.345 Unhandled rejection Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.345     at r (.next/server/chunks/657.js:12:54555)
15:11:13.345     at m (.next/server/chunks/5208.js:1:2857)
15:11:13.346     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.346     at k (.next/server/chunks/7183.js:31:1134)
15:11:13.346     at e (.next/server/chunks/7183.js:1:4325)
15:11:13.346     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.346     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.346     at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.346   description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.346   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.346 } Promise {
15:11:13.346   <rejected> Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.346       at r (.next/server/chunks/657.js:12:54555)
15:11:13.346       at m (.next/server/chunks/5208.js:1:2857)
15:11:13.346       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.346       at k (.next/server/chunks/7183.js:31:1134)
15:11:13.346       at e (.next/server/chunks/7183.js:1:4325)
15:11:13.346       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.346       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.346       at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.346     description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.346     digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.346   },
15:11:13.346   [Symbol(async_id_symbol)]: 3470,
15:11:13.346   [Symbol(trigger_async_id_symbol)]: 3432,
15:11:13.346   [Symbol(kResourceStore)]: undefined,
15:11:13.346   [Symbol(kResourceStore)]: {
15:11:13.346     isStaticGeneration: true,
15:11:13.346     page: '/admin/browser-test/page',
15:11:13.346     fallbackRouteParams: null,
15:11:13.346     route: '/admin/browser-test',
15:11:13.346     incrementalCache: IncrementalCache {
15:11:13.346       locks: Map(0) {},
15:11:13.346       hasCustomCacheHandler: false,
15:11:13.346       dev: false,
15:11:13.346       disableForTestmode: false,
15:11:13.346       minimalMode: true,
15:11:13.346       requestHeaders: {},
15:11:13.346       allowedRevalidateHeaderKeys: undefined,
15:11:13.346       prerenderManifest: [Object],
15:11:13.346       cacheControls: [SharedCacheControls],
15:11:13.346       fetchCacheKeyPrefix: '',
15:11:13.346       cacheHandler: [FileSystemCache]
15:11:13.346     },
15:11:13.346     cacheLifeProfiles: {
15:11:13.346       default: [Object],
15:11:13.346       seconds: [Object],
15:11:13.347       minutes: [Object],
15:11:13.347       hours: [Object],
15:11:13.347       days: [Object],
15:11:13.347       weeks: [Object],
15:11:13.347       max: [Object]
15:11:13.347     },
15:11:13.347     isRevalidate: true,
15:11:13.347     isBuildTimePrerendering: true,
15:11:13.347     hasReadableErrorStacks: false,
15:11:13.347     fetchCache: undefined,
15:11:13.347     isOnDemandRevalidate: undefined,
15:11:13.347     isDraftMode: undefined,
15:11:13.347     requestEndedState: { ended: false },
15:11:13.347     isPrefetchRequest: false,
15:11:13.347     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:13.347     reactLoadableManifest: {
15:11:13.347       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:13.347       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:13.347       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:13.347       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:13.347       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:13.347       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:13.347       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:13.347       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:13.347       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:13.347       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:13.347       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:13.347       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:13.347       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:13.347       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:13.347       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:13.347     },
15:11:13.347     assetPrefix: '',
15:11:13.347     afterContext: eJ {
15:11:13.347       workUnitStores: Set(0) {},
15:11:13.347       waitUntil: [Function: bound ],
15:11:13.347       onClose: [Function: bound onClose],
15:11:13.347       onTaskError: [Function: onTaskError],
15:11:13.347       callbackQueue: [o]
15:11:13.347     },
15:11:13.347     dynamicIOEnabled: false,
15:11:13.347     dev: false,
15:11:13.347     previouslyRevalidatedTags: [],
15:11:13.347     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:13.347     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:13.348     fetchMetrics: [],
15:11:13.348     dynamicUsageDescription: 'cookies',
15:11:13.348     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:13.348       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:13.348       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:13.348       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:13.348       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:13.348       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:13.348       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:13.348       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:13.348       '    at stringify (<anonymous>)\n' +
15:11:13.348       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:13.348       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:13.348   },
15:11:13.348   [Symbol(kResourceStore)]: eg {
15:11:13.348     type: 20,
15:11:13.348     status: 14,
15:11:13.348     flushScheduled: false,
15:11:13.348     fatalError: null,
15:11:13.348     destination: null,
15:11:13.348     bundlerConfig: {
15:11:13.348       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.348       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:13.348       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:13.348       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:13.348       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:13.349       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:13.349       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:13.349       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:13.349       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:13.349       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:13.350     },
15:11:13.350     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:13.350     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:13.350     nextChunkId: 26,
15:11:13.350     pendingChunks: 0,
15:11:13.350     hints: Set(16) {
15:11:13.350       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.350       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:13.350     },
15:11:13.350     abortableTasks: Set(0) {},
15:11:13.350     pingedTasks: [],
15:11:13.350     completedImportChunks: [],
15:11:13.350     completedHintChunks: [],
15:11:13.350     completedRegularChunks: [],
15:11:13.350     completedErrorChunks: [],
15:11:13.350     writtenSymbols: Map(2) {
15:11:13.350       Symbol(react.fragment) => 1,
15:11:13.350       Symbol(react.suspense) => 24
15:11:13.350     },
15:11:13.350     writtenClientReferences: Map(7) {
15:11:13.350       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:13.350       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:13.350       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:13.350       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:13.350       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:13.350       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:13.350       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:13.350     },
15:11:13.351     writtenServerReferences: Map(0) {},
15:11:13.351     writtenObjects: WeakMap { <items unknown> },
15:11:13.351     temporaryReferences: undefined,
15:11:13.351     identifierPrefix: '',
15:11:13.351     identifierCount: 1,
15:11:13.351     taintCleanupQueue: [],
15:11:13.351     onError: [Function (anonymous)],
15:11:13.351     onPostpone: [Function: X],
15:11:13.351     onAllReady: [Function: X],
15:11:13.351     onFatalError: [Function: X]
15:11:13.351   },
15:11:13.351   [Symbol(kResourceStore)]: undefined,
15:11:13.351   [Symbol(kResourceStore)]: {
15:11:13.351     type: 'prerender-legacy',
15:11:13.351     phase: 'render',
15:11:13.351     rootParams: {},
15:11:13.351     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:13.351     revalidate: 0,
15:11:13.351     expire: 4294967294,
15:11:13.351     stale: 4294967294,
15:11:13.351     tags: [
15:11:13.351       '_N_T_/layout',
15:11:13.351       '_N_T_/admin/layout',
15:11:13.351       '_N_T_/admin/browser-test/layout',
15:11:13.351       '_N_T_/admin/browser-test/page',
15:11:13.351       '_N_T_/admin/browser-test'
15:11:13.351     ]
15:11:13.351   }
15:11:13.351 }
15:11:13.351 Unhandled rejection Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.351     at r (.next/server/chunks/657.js:12:54555)
15:11:13.351     at n (.next/server/chunks/5208.js:1:9468)
15:11:13.351     at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:13.351     at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:13.351     at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:13.351     at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:13.351     at I (.next/server/chunks/9192.js:55:2658) {
15:11:13.351   description: "Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.351   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.351 } Promise {
15:11:13.351   <rejected> Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.351       at r (.next/server/chunks/657.js:12:54555)
15:11:13.351       at n (.next/server/chunks/5208.js:1:9468)
15:11:13.351       at <unknown> (.next/server/app/api/github-app/status/route.js:1:929)
15:11:13.351       at l (.next/server/app/api/github-app/status/route.js:1:1303)
15:11:13.351       at <unknown> (.next/server/app/api/github-app/status/route.js:1:8307)
15:11:13.351       at j (.next/server/app/api/github-app/status/route.js:1:8953)
15:11:13.351       at I (.next/server/chunks/9192.js:55:2658) {
15:11:13.351     description: "Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.351     digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.352   },
15:11:13.352   [Symbol(async_id_symbol)]: 3476,
15:11:13.352   [Symbol(trigger_async_id_symbol)]: 3455,
15:11:13.352   [Symbol(kResourceStore)]: undefined,
15:11:13.352   [Symbol(kResourceStore)]: {
15:11:13.352     isStaticGeneration: true,
15:11:13.352     page: '/admin/browser-test/page',
15:11:13.352     fallbackRouteParams: null,
15:11:13.352     route: '/admin/browser-test',
15:11:13.352     incrementalCache: IncrementalCache {
15:11:13.352       locks: Map(0) {},
15:11:13.352       hasCustomCacheHandler: false,
15:11:13.352       dev: false,
15:11:13.352       disableForTestmode: false,
15:11:13.352       minimalMode: true,
15:11:13.352       requestHeaders: {},
15:11:13.352       allowedRevalidateHeaderKeys: undefined,
15:11:13.352       prerenderManifest: [Object],
15:11:13.352       cacheControls: [SharedCacheControls],
15:11:13.352       fetchCacheKeyPrefix: '',
15:11:13.352       cacheHandler: [FileSystemCache]
15:11:13.352     },
15:11:13.352     cacheLifeProfiles: {
15:11:13.352       default: [Object],
15:11:13.352       seconds: [Object],
15:11:13.352       minutes: [Object],
15:11:13.352       hours: [Object],
15:11:13.352       days: [Object],
15:11:13.352       weeks: [Object],
15:11:13.352       max: [Object]
15:11:13.352     },
15:11:13.352     isRevalidate: true,
15:11:13.352     isBuildTimePrerendering: true,
15:11:13.352     hasReadableErrorStacks: false,
15:11:13.352     fetchCache: undefined,
15:11:13.352     isOnDemandRevalidate: undefined,
15:11:13.352     isDraftMode: undefined,
15:11:13.352     requestEndedState: { ended: false },
15:11:13.352     isPrefetchRequest: false,
15:11:13.352     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:13.352     reactLoadableManifest: {
15:11:13.352       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:13.352       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:13.352       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:13.352       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:13.352       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:13.352       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:13.352       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:13.352       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:13.352       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:13.352       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:13.353       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:13.353       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:13.353       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:13.353       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:13.353       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:13.353     },
15:11:13.353     assetPrefix: '',
15:11:13.353     afterContext: eJ {
15:11:13.353       workUnitStores: Set(0) {},
15:11:13.353       waitUntil: [Function: bound ],
15:11:13.353       onClose: [Function: bound onClose],
15:11:13.353       onTaskError: [Function: onTaskError],
15:11:13.353       callbackQueue: [o]
15:11:13.353     },
15:11:13.353     dynamicIOEnabled: false,
15:11:13.353     dev: false,
15:11:13.353     previouslyRevalidatedTags: [],
15:11:13.353     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:13.353     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:13.353     fetchMetrics: [],
15:11:13.353     dynamicUsageDescription: 'cookies',
15:11:13.353     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:13.353       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:13.353       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:13.353       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:13.353       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:13.353       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:13.353       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:13.353       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:13.353       '    at stringify (<anonymous>)\n' +
15:11:13.353       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:13.353       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:13.353   },
15:11:13.353   [Symbol(kResourceStore)]: eg {
15:11:13.353     type: 20,
15:11:13.353     status: 14,
15:11:13.353     flushScheduled: false,
15:11:13.353     fatalError: null,
15:11:13.353     destination: null,
15:11:13.353     bundlerConfig: {
15:11:13.353       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:13.353       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:13.353       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:13.353       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:13.354       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:13.354       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:13.355       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:13.355       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/CalendarIntegrationSection.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/PromptbookSdkTabs.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/WebsiteIntegrationTabs.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/system-message/SystemMessageBookEditor.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/timeouts/AgentTimeoutsClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/textarea/AgentTextareaClient.tsx': [Object],
15:11:13.355       '/vercel/path0/apps/agents-server/src/app/embed/page.tsx': [Object]
15:11:13.355     },
15:11:13.355     cache: Map(1) { [Function: E] => [WeakMap] },
15:11:13.355     cacheController: AbortController { signal: AbortSignal { aborted: true } },
15:11:13.355     nextChunkId: 26,
15:11:13.355     pendingChunks: 0,
15:11:13.355     hints: Set(16) {
15:11:13.355       'L[font]/_next/static/media/0484562807a97172-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.355       'L[font]/_next/static/media/1f54c84255ccf44e-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.355       'L[font]/_next/static/media/3667c091265cf81b-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.355       'L[font]/_next/static/media/437e5f23c97e320c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.355       'L[font]/_next/static/media/5fb5c05ff73c0616-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.355       'L[font]/_next/static/media/7db6c35d839a711c-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.355       'L[font]/_next/static/media/8888a3826f4a3af4-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.355       'L[font]/_next/static/media/b957ea75a84b6ea7-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.355       'L[font]/_next/static/media/eafabf029ad39a43-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.356       'L[font]/_next/static/media/eeb8a9ff846037ce-s.p.woff2?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.356       'L[style]/_next/static/css/de7c0ac3e7516811.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.356       'L[style]/_next/static/css/ed0f0e0535a22473.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.356       'L[style]/_next/static/css/c8cd2869eead0921.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.356       'L[style]/_next/static/css/ce70631e65236ad5.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.356       'L[style]/_next/static/css/07199a57b6717f23.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp',
15:11:13.356       'L[style]/_next/static/css/4090d933613804f1.css?dpl=dpl_45qGgeYqDA9ZM3wpjv2WFx5wcxvp'
15:11:13.356     },
15:11:13.356     abortableTasks: Set(0) {},
15:11:13.356     pingedTasks: [],
15:11:13.356     completedImportChunks: [],
15:11:13.356     completedHintChunks: [],
15:11:13.356     completedRegularChunks: [],
15:11:13.356     completedErrorChunks: [],
15:11:13.356     writtenSymbols: Map(2) {
15:11:13.356       Symbol(react.fragment) => 1,
15:11:13.356       Symbol(react.suspense) => 24
15:11:13.356     },
15:11:13.356     writtenClientReferences: Map(7) {
15:11:13.356       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js#' => 3,
15:11:13.356       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js#' => 4,
15:11:13.356       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#OutletBoundary' => 6,
15:11:13.356       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js#AsyncMetadataOutlet' => 8,
15:11:13.356       '/vercel/path0/apps/agents-server/src/app/global-error.tsx#default' => 19,
15:11:13.356       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#ViewportBoundary' => 21,
15:11:13.356       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js#MetadataBoundary' => 23
15:11:13.356     },
15:11:13.356     writtenServerReferences: Map(0) {},
15:11:13.356     writtenObjects: WeakMap { <items unknown> },
15:11:13.356     temporaryReferences: undefined,
15:11:13.356     identifierPrefix: '',
15:11:13.356     identifierCount: 1,
15:11:13.356     taintCleanupQueue: [],
15:11:13.356     onError: [Function (anonymous)],
15:11:13.356     onPostpone: [Function: X],
15:11:13.356     onAllReady: [Function: X],
15:11:13.356     onFatalError: [Function: X]
15:11:13.356   },
15:11:13.356   [Symbol(kResourceStore)]: undefined,
15:11:13.356   [Symbol(kResourceStore)]: {
15:11:13.357     type: 'prerender-legacy',
15:11:13.357     phase: 'render',
15:11:13.357     rootParams: {},
15:11:13.357     implicitTags: { tags: [Array], expirationsByCacheKind: [Map] },
15:11:13.357     revalidate: 0,
15:11:13.357     expire: 4294967294,
15:11:13.357     stale: 4294967294,
15:11:13.357     tags: [
15:11:13.357       '_N_T_/layout',
15:11:13.357       '_N_T_/admin/layout',
15:11:13.357       '_N_T_/admin/browser-test/layout',
15:11:13.357       '_N_T_/admin/browser-test/page',
15:11:13.357       '_N_T_/admin/browser-test'
15:11:13.357     ]
15:11:13.357   }
15:11:13.357 }
15:11:13.357 Unhandled rejection Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.357     at r (.next/server/chunks/657.js:12:54555)
15:11:13.357     at m (.next/server/chunks/5208.js:1:2857)
15:11:13.357     at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.357     at k (.next/server/chunks/7183.js:31:1134)
15:11:13.357     at e (.next/server/chunks/7183.js:1:4325)
15:11:13.357     at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.357     at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.357     at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.357   description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.357   digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.357 } Promise {
15:11:13.357   <rejected> Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
15:11:13.357       at r (.next/server/chunks/657.js:12:54555)
15:11:13.357       at m (.next/server/chunks/5208.js:1:2857)
15:11:13.357       at <unknown> (.next/server/chunks/7183.js:31:604)
15:11:13.357       at k (.next/server/chunks/7183.js:31:1134)
15:11:13.357       at e (.next/server/chunks/7183.js:1:4325)
15:11:13.357       at <unknown> (.next/server/app/api/github-app/status/route.js:1:20384)
15:11:13.357       at k (.next/server/app/api/github-app/status/route.js:1:20681)
15:11:13.357       at I (.next/server/chunks/9192.js:55:2442) {
15:11:13.357     description: "Route /admin/browser-test couldn't be rendered statically because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
15:11:13.357     digest: 'DYNAMIC_SERVER_USAGE'
15:11:13.357   },
15:11:13.357   [Symbol(async_id_symbol)]: 3463,
15:11:13.357   [Symbol(trigger_async_id_symbol)]: 3432,
15:11:13.357   [Symbol(kResourceStore)]: undefined,
15:11:13.357   [Symbol(kResourceStore)]: {
15:11:13.357     isStaticGeneration: true,
15:11:13.357     page: '/admin/browser-test/page',
15:11:13.357     fallbackRouteParams: null,
15:11:13.357     route: '/admin/browser-test',
15:11:13.357     incrementalCache: IncrementalCache {
15:11:13.357       locks: Map(0) {},
15:11:13.357       hasCustomCacheHandler: false,
15:11:13.357       dev: false,
15:11:13.357       disableForTestmode: false,
15:11:13.357       minimalMode: true,
15:11:13.357       requestHeaders: {},
15:11:13.357       allowedRevalidateHeaderKeys: undefined,
15:11:13.358       prerenderManifest: [Object],
15:11:13.358       cacheControls: [SharedCacheControls],
15:11:13.358       fetchCacheKeyPrefix: '',
15:11:13.358       cacheHandler: [FileSystemCache]
15:11:13.358     },
15:11:13.358     cacheLifeProfiles: {
15:11:13.358       default: [Object],
15:11:13.358       seconds: [Object],
15:11:13.358       minutes: [Object],
15:11:13.358       hours: [Object],
15:11:13.358       days: [Object],
15:11:13.358       weeks: [Object],
15:11:13.358       max: [Object]
15:11:13.358     },
15:11:13.358     isRevalidate: true,
15:11:13.358     isBuildTimePrerendering: true,
15:11:13.358     hasReadableErrorStacks: false,
15:11:13.358     fetchCache: undefined,
15:11:13.358     isOnDemandRevalidate: undefined,
15:11:13.358     isDraftMode: undefined,
15:11:13.358     requestEndedState: { ended: false },
15:11:13.358     isPrefetchRequest: false,
15:11:13.358     buildId: 'QblzfMtGGCI5PjqaYqMuu',
15:11:13.358     reactLoadableManifest: {
15:11:13.358       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> canvg': [Object],
15:11:13.358       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> dompurify': [Object],
15:11:13.358       '../../../node_modules/jspdf/dist/jspdf.es.min.js -> html2canvas': [Object],
15:11:13.358       '../../../src/book-components/Chat/Chat/ChatMessageMap.tsx -> leaflet': [Object],
15:11:13.359       '../../../src/book-components/Qr/PromptbookQrCode.tsx -> qrcode': [Object],
15:11:13.359       '../../../src/commitments/TEAM/TEAM.ts -> ../../llm-providers/agent/RemoteAgent': [Object],
15:11:13.359       'app/agents/[agentName]/DeferredAgentProfileChat.tsx -> ./AgentProfileChat': [Object],
15:11:13.359       'app/swagger/SwaggerPageClient.tsx -> swagger-ui-react': [Object],
15:11:13.359       'components/Homepage/AgentsList.tsx -> ../AgentContextMenu/AgentContextMenu': [Object],
15:11:13.359       'components/Homepage/AgentsList.tsx -> ../FolderContextMenu/FolderContextMenu': [Object],
15:11:13.359       'components/Homepage/AgentsList.tsx -> ./AgentQrCodeModal': [Object],
15:11:13.359       'components/Homepage/AgentsList.tsx -> ./AgentsGraph': [Object],
15:11:13.359       'components/Homepage/AgentsList.tsx -> ./AgentsOffice': [Object],
15:11:13.359       'components/Homepage/AgentsList.tsx -> ./AgentsPixelOffice': [Object],
15:11:13.359       'components/Homepage/AgentsList.tsx -> ./FolderEditDialog': [Object]
15:11:13.359     },
15:11:13.359     assetPrefix: '',
15:11:13.359     afterContext: eJ {
15:11:13.359       workUnitStores: Set(0) {},
15:11:13.359       waitUntil: [Function: bound ],
15:11:13.359       onClose: [Function: bound onClose],
15:11:13.359       onTaskError: [Function: onTaskError],
15:11:13.359       callbackQueue: [o]
15:11:13.359     },
15:11:13.359     dynamicIOEnabled: false,
15:11:13.359     dev: false,
15:11:13.359     previouslyRevalidatedTags: [],
15:11:13.359     refreshTagsByCacheKind: Map(2) { 'default' => [Object], 'remote' => [Object] },
15:11:13.359     runInCleanSnapshot: [Function: bound] { asyncResource: [Getter/Setter] },
15:11:13.359     fetchMetrics: [],
15:11:13.359     dynamicUsageDescription: 'cookies',
15:11:13.359     dynamicUsageStack: "Error: Dynamic server usage: Route /admin/browser-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error\n" +
15:11:13.359       '    at r (/vercel/path0/apps/agents-server/.next/server/chunks/657.js:12:54555)\n' +
15:11:13.359       '    at n (/vercel/path0/apps/agents-server/.next/server/chunks/5208.js:1:9468)\n' +
15:11:13.359       '    at I (/vercel/path0/apps/agents-server/.next/server/chunks/9192.js:55:2892)\n' +
15:11:13.359       '    at ek (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:32629)\n' +
15:11:13.359       '    at e (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:36665)\n' +
15:11:13.359       '    at eI (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:37127)\n' +
15:11:13.359       '    at Array.toJSON (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:34252)\n' +
15:11:13.359       '    at stringify (<anonymous>)\n' +
15:11:13.359       '    at eH (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46044)\n' +
15:11:13.359       '    at ez (/vercel/path0/node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js:5:46422)'
15:11:13.359   },
15:11:13.359   [Symbol(kResourceStore)]: eg {
15:11:13.359     type: 20,
15:11:13.359     status: 14,
15:11:13.359     flushScheduled: false,
15:11:13.359     fatalError: null,
15:11:13.359     destination: null,
15:11:13.359     bundlerConfig: {
15:11:13.359       '/vercel/path0/node_modules/next/dist/client/components/client-page.js': [Object],
15:11:13.359       '/vercel/path0/node_modules/next/dist/esm/client/components/client-page.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/client/components/client-segment.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/esm/client/components/client-segment.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/esm/client/components/http-access-fallback/error-boundary.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/client/components/layout-router.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/esm/client/components/layout-router.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/client/components/metadata/async-metadata.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/async-metadata.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/esm/client/components/metadata/metadata-boundary.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/client/components/render-from-template-context.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/esm/client/components/render-from-template-context.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/esm/lib/metadata/generate/icon-mark.js': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/global-error.tsx': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/client/app-dir/link.js': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/dist/esm/client/app-dir/link.js': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/public/favicon.ico': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/components/LayoutWrapper/LayoutWrapper.tsx': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Barlow_Condensed","arguments":[{"subsets":["latin"],"weight":["300","400","500","600","700"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-barlow-condensed"}],"variableName":"barlowCondensed"}': [Object],
15:11:13.360       '/vercel/path0/node_modules/next/font/google/target.css?{"path":"src/app/layout.tsx","import":"Poppins","arguments":[{"subsets":["latin"],"weight":["400","500","600","700","800"],"display":"swap","fallback":["Arial","Helvetica","sans-serif"],"variable":"--font-poppins"}],"variableName":"poppins"}': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/globals.css': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/error.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/AgentProfileWrapper.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/DeferredAgentProfileChat.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/components/AgentProfile/AgentProfile.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/components/DeletedAgentBanner.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/api-tokens/ApiTokensClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/components/ForbiddenPage/ForbiddenPage.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/backup/BackupClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/browser-test/BrowserTestClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/chat-feedback/ChatFeedbackClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/chat-history/ChatHistoryClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/custom-css/CustomCssClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/custom-js/CustomJsClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/error-simulation/ErrorSimulationClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/files/FilesGalleryClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/image-generator-test/ImageGeneratorTestClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/images/ImagesGalleryClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/messages/MessagesClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/messages/send-email/SendEmailClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/metadata/MetadataClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/search-engine-test/SearchEngineTestClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/servers/ServersClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/task-manager/TaskManagerClient.tsx': [Object],
15:11:13.360       '/vercel/path0/apps/agents-server/src/app/admin/tool-limits/ToolLimitsClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/admin/usage/UsageClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/admin/users/[userId]/UserDetailClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/components/UsersList/UsersList.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/admin/voice-input-test/VoiceInputTestClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/components/Homepage/AgentsList.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/components/Homepage/ExternalAgentsSectionClient.tsx': [Object],
15:11:13.361       '/vercel/path0/src/_packages/components.index.ts': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/components/DocsToolbar/DocsToolbar.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/experiments/story/page.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/search/page.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/system/profile/UserProfileClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/system/settings/KeybindingsSettingsClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/system/user-wallet/UserWalletClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/system/user-memory/UserMemoryClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/MockedChatsEditorClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/system/utilities/mocked-chats/view/MockedChatsViewerClient.tsx': [Object],
15:11:13.361       '/vercel/path0/src/book-components/Chat/MarkdownContent/MarkdownContent.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/components/Homepage/RecycleBinList.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/swagger/SwaggerPageClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/book/BookEditorWrapper.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/export-as-transpiled-code/AgentCodePageClient.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/history/RestoreVersionButton.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/_common/components/CodePreview/CodePreview.tsx': [Object],
15:11:13.361       '/vercel/path0/apps/agents-server/src/app/agents/[agentName]/integration/ApiKeyIntegrationSections.tsx': [Object],
15:11:15.569       '
15:11:15.569    Finalizing page optimization ...
15:11:15.570    Collecting build traces ...
15:11:39.543 
15:11:39.570 Route (app)                                                                     Size  First Load JS
15:11:39.570 ┌ ƒ /                                                                          265 B        1.06 MB
15:11:39.571 ├ ƒ /_not-found                                                                483 B         103 kB
15:11:39.571 ├ ƒ /[agentName]                                                               151 B         142 kB
15:11:39.571 ├ ƒ /[agentName]/[...rest]                                                     483 B         103 kB
15:11:39.571 ├ ƒ /admin/about                                                             2.29 kB         998 kB
15:11:39.571 ├ ƒ /admin/api-tokens                                                        3.06 kB         158 kB
15:11:39.571 ├ ƒ /admin/backup                                                            2.06 kB         157 kB
15:11:39.571 ├ ƒ /admin/browser-test                                                      2.74 kB         158 kB
15:11:39.571 ├ ƒ /admin/chat-feedback                                                     7.71 kB         724 kB
15:11:39.571 ├ ƒ /admin/chat-history                                                      7.58 kB         724 kB
15:11:39.571 ├ ƒ /admin/custom-css                                                        5.74 kB         165 kB
15:11:39.571 ├ ƒ /admin/custom-js                                                          6.9 kB         166 kB
15:11:39.571 ├ ƒ /admin/error-simulation                                                  4.18 kB         163 kB
15:11:39.571 ├ ƒ /admin/files                                                             3.55 kB         162 kB
15:11:39.571 ├ ƒ /admin/image-generator-test                                              10.2 kB         203 kB
15:11:39.571 ├ ƒ /admin/images                                                            4.23 kB         163 kB
15:11:39.571 ├ ƒ /admin/messages                                                           3.4 kB         158 kB
15:11:39.571 ├ ƒ /admin/messages/send-email                                               2.71 kB         163 kB
15:11:39.571 ├ ƒ /admin/metadata                                                          14.3 kB         207 kB
15:11:39.571 ├ ƒ /admin/models                                                            1.03 kB         159 kB
15:11:39.571 ├ ƒ /admin/search-engine-test                                                 2.6 kB         158 kB
15:11:39.571 ├ ƒ /admin/servers                                                           14.7 kB         226 kB
15:11:39.571 ├ ƒ /admin/task-manager                                                      6.36 kB         161 kB
15:11:39.571 ├ ƒ /admin/tool-limits                                                       2.54 kB         158 kB
15:11:39.571 ├ ƒ /admin/usage                                                             6.45 kB         161 kB
15:11:39.571 ├ ƒ /admin/users                                                             2.95 kB         158 kB
15:11:39.571 ├ ƒ /admin/users/[userId]                                                    2.88 kB         161 kB
15:11:39.572 ├ ƒ /admin/voice-input-test                                                  4.08 kB         159 kB
15:11:39.572 ├ ƒ /agents                                                                    265 B        1.06 MB
15:11:39.572 ├ ƒ /agents/[agentName]                                                        151 B         142 kB
15:11:39.572 ├ ƒ /agents/[agentName]/api/book                                               483 B         103 kB
15:11:39.572 ├ ƒ /agents/[agentName]/api/book/history                                       483 B         103 kB
15:11:39.572 ├ ƒ /agents/[agentName]/api/book/missing-agent                                 483 B         103 kB
15:11:39.572 ├ ƒ /agents/[agentName]/api/book/reference-diagnostics                         483 B         103 kB
15:11:39.573 ├ ƒ /agents/[agentName]/api/calendar-connections                               483 B         103 kB
15:11:39.573 ├ ƒ /agents/[agentName]/api/calendar-connections/[connectionId]/disconnect     483 B         103 kB
15:11:39.573 ├ ƒ /agents/[agentName]/api/calendar-events                                    483 B         103 kB
15:11:39.573 ├ ƒ /agents/[agentName]/api/chat                                               483 B         103 kB
15:11:39.573 ├ ƒ /agents/[agentName]/api/feedback                                           483 B         103 kB
15:11:39.573 ├ ƒ /agents/[agentName]/api/mcp                                                483 B         103 kB
15:11:39.573 ├ ƒ /agents/[agentName]/api/meta-disclaimer                                    483 B         103 kB
15:11:39.574 ├ ƒ /agents/[agentName]/api/model-requirements                                 483 B         103 kB
15:11:39.574 ├ ƒ /agents/[agentName]/api/model-requirements/system-message                  483 B         103 kB
15:11:39.574 ├ ƒ /agents/[agentName]/api/openai/chat/completions                            483 B         103 kB
15:11:39.574 ├ ƒ /agents/[agentName]/api/openai/models                                      483 B         103 kB
15:11:39.574 ├ ƒ /agents/[agentName]/api/openai/v1/chat/completions                         483 B         103 kB
15:11:39.574 ├ ƒ /agents/[agentName]/api/openai/v1/models                                   483 B         103 kB
15:11:39.574 ├ ƒ /agents/[agentName]/api/openrouter/chat/completions                        483 B         103 kB
15:11:39.575 ├ ƒ /agents/[agentName]/api/profile                                            483 B         103 kB
15:11:39.575 ├ ƒ /agents/[agentName]/api/share-target/[shareTargetId]/consume               483 B         103 kB
15:11:39.575 ├ ƒ /agents/[agentName]/api/timeouts                                           483 B         103 kB
15:11:39.575 ├ ƒ /agents/[agentName]/api/timeouts/[timeoutId]                               483 B         103 kB
15:11:39.575 ├ ƒ /agents/[agentName]/api/timeouts/actions                                   483 B         103 kB
15:11:39.575 ├ ƒ /agents/[agentName]/api/user-chats                                         483 B         103 kB
15:11:39.575 ├ ƒ /agents/[agentName]/api/user-chats/[chatId]                                483 B         103 kB
15:11:39.576 ├ ƒ /agents/[agentName]/api/user-chats/[chatId]/draft                          483 B         103 kB
15:11:39.576 ├ ƒ /agents/[agentName]/api/user-chats/[chatId]/jobs/[jobId]/cancel            483 B         103 kB
15:11:39.576 ├ ƒ /agents/[agentName]/api/user-chats/[chatId]/messages                       483 B         103 kB
15:11:39.576 ├ ƒ /agents/[agentName]/api/user-chats/[chatId]/stream                         483 B         103 kB
15:11:39.576 ├ ƒ /agents/[agentName]/api/user-chats/[chatId]/timeouts/[timeoutId]/cancel    483 B         103 kB
15:11:39.576 ├ ƒ /agents/[agentName]/api/voice                                              483 B         103 kB
15:11:39.576 ├ ƒ /agents/[agentName]/book                                                  4.5 kB         547 kB
15:11:39.576 ├ ƒ /agents/[agentName]/book+chat                                            6.22 kB        1.02 MB
15:11:39.576 ├ ƒ /agents/[agentName]/chat                                                   199 B        1.03 MB
15:11:39.576 ├ ƒ /agents/[agentName]/chat/chatgpt-like                                      199 B        1.03 MB
15:11:39.576 ├ ƒ /agents/[agentName]/export-as-transpiled-code                            3.23 kB         110 kB
15:11:39.576 ├ ƒ /agents/[agentName]/export-as-transpiled-code/api                          483 B         103 kB
15:11:39.576 ├ ƒ /agents/[agentName]/history                                              2.04 kB         104 kB
15:11:39.576 ├ ƒ /agents/[agentName]/iframe                                                 483 B         103 kB
15:11:39.577 ├ ƒ /agents/[agentName]/images                                                 173 B         106 kB
15:11:39.577 ├ ƒ /agents/[agentName]/images/default-avatar.png                              483 B         103 kB
15:11:39.577 ├ ƒ /agents/[agentName]/images/icon-256.png                                    483 B         103 kB
15:11:39.577 ├ ƒ /agents/[agentName]/images/screenshot-fullhd.png                           483 B         103 kB
15:11:39.577 ├ ƒ /agents/[agentName]/images/screenshot-phone.png                            483 B         103 kB
15:11:39.577 ├ ƒ /agents/[agentName]/integration                                          8.31 kB         168 kB
15:11:39.577 ├ ƒ /agents/[agentName]/opengraph-image                                        483 B         103 kB
15:11:39.577 ├ ƒ /agents/[agentName]/share-target                                           483 B         103 kB
15:11:39.577 ├ ƒ /agents/[agentName]/system-message                                       1.32 kB         485 kB
15:11:39.577 ├ ƒ /agents/[agentName]/textarea                                             8.79 kB         115 kB
15:11:39.577 ├ ƒ /agents/[agentName]/timeouts                                             6.25 kB         112 kB
15:11:39.577 ├ ƒ /agents/[agentName]/website-integration                                  3.04 kB         954 kB
15:11:39.577 ├ ƒ /api/admin-email                                                           483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/backups/books                                                   483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/chat-tasks                                                      483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/chat-tasks/[taskId]/cancel                                      483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/chat-tasks/[taskId]/retry                                       483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/error-simulation                                                483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/servers                                                         483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/servers/[serverId]                                              483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/servers/[serverId]/migrate                                      483 B         103 kB
15:11:39.577 ├ ƒ /api/admin/tool-limits                                                     483 B         103 kB
15:11:39.577 ├ ƒ /api/agent-folders                                                         483 B         103 kB
15:11:39.577 ├ ƒ /api/agent-folders/[folderId]                                              483 B         103 kB
15:11:39.577 ├ ƒ /api/agent-folders/[folderId]/restore                                      483 B         103 kB
15:11:39.577 ├ ƒ /api/agent-folders/[folderId]/visibility                                   483 B         103 kB
15:11:39.577 ├ ƒ /api/agent-organization                                                    483 B         103 kB
15:11:39.577 ├ ƒ /api/agents                                                                483 B         103 kB
15:11:39.577 ├ ƒ /api/agents/[agentName]                                                    483 B         103 kB
15:11:39.577 ├ ƒ /api/agents/[agentName]/clone                                              483 B         103 kB
15:11:39.577 ├ ƒ /api/agents/[agentName]/restore                                            483 B         103 kB
15:11:39.577 ├ ƒ /api/api-tokens                                                            483 B         103 kB
15:11:39.577 ├ ƒ /api/auth/change-password                                                  483 B         103 kB
15:11:39.578 ├ ƒ /api/auth/login                                                            483 B         103 kB
15:11:39.578 ├ ƒ /api/auth/logout                                                           483 B         103 kB
15:11:39.578 ├ ƒ /api/browser-artifacts/[artifactName]                                      483 B         103 kB
15:11:39.578 ├ ƒ /api/browser-test/act                                                      483 B         103 kB
15:11:39.578 ├ ƒ /api/browser-test/screenshot                                               483 B         103 kB
15:11:39.578 ├ ƒ /api/browser-test/scroll-facebook                                          483 B         103 kB
15:11:39.578 ├ ƒ /api/calendar-oauth/callback                                               483 B         103 kB
15:11:39.578 ├ ƒ /api/calendar-oauth/connect                                                483 B         103 kB
15:11:39.578 ├ ƒ /api/calendar-oauth/refresh                                                483 B         103 kB
15:11:39.578 ├ ƒ /api/calendar-oauth/revoke                                                 483 B         103 kB
15:11:39.578 ├ ƒ /api/calendar-oauth/status                                                 483 B         103 kB
15:11:39.578 ├ ƒ /api/chat                                                                  483 B         103 kB
15:11:39.578 ├ ƒ /api/chat-feedback                                                         483 B         103 kB
15:11:39.578 ├ ƒ /api/chat-feedback/[id]                                                    483 B         103 kB
15:11:39.578 ├ ƒ /api/chat-feedback/export                                                  483 B         103 kB
15:11:39.578 ├ ƒ /api/chat-history                                                          483 B         103 kB
15:11:39.578 ├ ƒ /api/chat-history/[id]                                                     483 B         103 kB
15:11:39.578 ├ ƒ /api/chat-history/export                                                   483 B         103 kB
15:11:39.578 ├ ƒ /api/chat-streaming                                                        483 B         103 kB
15:11:39.578 ├ ƒ /api/custom-css                                                            483 B         103 kB
15:11:39.578 ├ ƒ /api/custom-js                                                             483 B         103 kB
15:11:39.578 ├ ƒ /api/docs/book-language.md                                                 483 B         103 kB
15:11:39.578 ├ ƒ /api/docs/book.md                                                          483 B         103 kB
15:11:39.578 ├ ƒ /api/elevenlabs/tts                                                        483 B         103 kB
15:11:39.578 ├ ƒ /api/emails/incoming/sendgrid                                              483 B         103 kB
15:11:39.578 ├ ƒ /api/embed.js                                                              483 B         103 kB
15:11:39.578 ├ ƒ /api/error-reports/application                                             483 B         103 kB
15:11:39.578 ├ ƒ /api/federated-agents                                                      483 B         103 kB
15:11:39.578 ├ ƒ /api/github-app/callback                                                   483 B         103 kB
15:11:39.578 ├ ƒ /api/github-app/connect                                                    483 B         103 kB
15:11:39.578 ├ ƒ /api/github-app/status                                                     483 B         103 kB
15:11:39.578 ├ ƒ /api/images/[filename]                                                     483 B         103 kB
15:11:39.578 ├ ƒ /api/internal/user-chat-jobs/run                                           483 B         103 kB
15:11:39.578 ├ ƒ /api/internal/user-chat-timeouts/run                                       483 B         103 kB
15:11:39.578 ├ ƒ /api/long-running-task                                                     483 B         103 kB
15:11:39.578 ├ ƒ /api/long-streaming                                                        483 B         103 kB
15:11:39.579 ├ ƒ /api/messages                                                              483 B         103 kB
15:11:39.579 ├ ƒ /api/metadata                                                              483 B         103 kB
15:11:39.579 ├ ƒ /api/openai/v1/audio/transcriptions                                        483 B         103 kB
15:11:39.579 ├ ƒ /api/openai/v1/chat/completions                                            483 B         103 kB
15:11:39.579 ├ ƒ /api/openai/v1/models                                                      483 B         103 kB
15:11:39.579 ├ ƒ /api/profile                                                               483 B         103 kB
15:11:39.579 ├ ƒ /api/push-subscriptions                                                    483 B         103 kB
15:11:39.579 ├ ƒ /api/scrape                                                                483 B         103 kB
15:11:39.579 ├ ƒ /api/search                                                                483 B         103 kB
15:11:39.579 ├ ƒ /api/send-email                                                            483 B         103 kB
15:11:39.579 ├ ƒ /api/settings/keybindings                                                  483 B         103 kB
15:11:39.579 ├ ƒ /api/settings/notifications                                                483 B         103 kB
15:11:39.579 ├ ƒ /api/spawn-agent                                                           483 B         103 kB
15:11:39.579 ├ ƒ /api/story/export                                                          483 B         103 kB
15:11:39.579 ├ ƒ /api/system/mocked-chats                                                   483 B         103 kB
15:11:39.579 ├ ƒ /api/team-agent-profile                                                    483 B         103 kB
15:11:39.579 ├ ƒ /api/upload                                                                483 B         103 kB
15:11:39.579 ├ ƒ /api/usage                                                                 483 B         103 kB
15:11:39.579 ├ ƒ /api/user-memory                                                           483 B         103 kB
15:11:39.579 ├ ƒ /api/user-memory/[memoryId]                                                483 B         103 kB
15:11:39.579 ├ ƒ /api/user-wallet                                                           483 B         103 kB
15:11:39.579 ├ ƒ /api/user-wallet/[walletId]                                                483 B         103 kB
15:11:39.579 ├ ƒ /api/users                                                                 483 B         103 kB
15:11:39.579 ├ ƒ /api/users/[username]                                                      483 B         103 kB
15:11:39.579 ├ ƒ /api/v1/agents                                                             483 B         103 kB
15:11:39.579 ├ ƒ /api/v1/agents/[agentId]                                                   483 B         103 kB
15:11:39.579 ├ ƒ /api/v1/folders                                                            483 B         103 kB
15:11:39.579 ├ ƒ /api/v1/folders/[folderId]                                                 483 B         103 kB
15:11:39.579 ├ ƒ /api/v1/folders/[folderId]/agents/[agentId]                                483 B         103 kB
15:11:39.579 ├ ƒ /api/v1/instance                                                           483 B         103 kB
15:11:39.579 ├ ƒ /api/v1/me                                                                 483 B         103 kB
15:11:39.579 ├ ƒ /dashboard                                                               2.68 kB        1.06 MB
15:11:39.579 ├ ƒ /docs                                                                    3.03 kB         957 kB
15:11:39.579 ├ ƒ /docs/[docId]                                                            3.02 kB         957 kB
15:11:39.579 ├ ƒ /embed                                                                   3.88 kB         934 kB
15:11:39.580 ├ ƒ /experiments/story                                                       5.44 kB         495 kB
15:11:39.580 ├ ƒ /humans.txt                                                                483 B         103 kB
15:11:39.580 ├ ƒ /manifest.webmanifest                                                      483 B         103 kB
15:11:39.580 ├ ƒ /openapi.json                                                              483 B         103 kB
15:11:39.580 ├ ƒ /pixel-agents-assets/[...assetPath]                                        483 B         103 kB
15:11:39.580 ├ ƒ /recycle-bin                                                             7.71 kB         126 kB
15:11:39.580 ├ ƒ /restricted                                                                173 B         106 kB
15:11:39.580 ├ ƒ /robots.txt                                                                483 B         103 kB
15:11:39.580 ├ ƒ /search                                                                  4.99 kB         111 kB
15:11:39.580 ├ ƒ /security.txt                                                              483 B         103 kB
15:11:39.580 ├ ƒ /sitemap.xml                                                               483 B         103 kB
15:11:39.580 ├ ƒ /story/[[...story]]                                                        483 B         103 kB
15:11:39.580 ├ ƒ /swagger                                                                 2.48 kB         158 kB
15:11:39.580 ├ ƒ /system/profile                                                           2.3 kB         157 kB
15:11:39.580 ├ ƒ /system/settings                                                          5.5 kB         108 kB
15:11:39.580 ├ ƒ /system/user-memory                                                      3.45 kB         158 kB
15:11:39.580 ├ ƒ /system/user-wallet                                                      6.84 kB         167 kB
15:11:39.580 ├ ƒ /system/utilities                                                        1.03 kB         159 kB
15:11:39.580 ├ ƒ /system/utilities/mocked-chats                                            4.3 kB         164 kB
15:11:39.580 ├ ƒ /system/utilities/mocked-chats/view                                       4.2 kB         725 kB
15:11:39.581 ├ ƒ /test/og-image                                                             483 B         103 kB
15:11:39.581 └ ƒ /test/og-image/opengraph-image                                             483 B         103 kB
15:11:39.581 + First Load JS shared by all                                                 102 kB
15:11:39.581   ├ chunks/1902-b159596e845df47d.js                                          44.6 kB
15:11:39.581   ├ chunks/87c73c54-095cf9a90cf9ee03.js                                      54.1 kB
15:11:39.581   └ other shared chunks (total)                                              3.45 kB
15:11:39.581 
15:11:39.581 
15:11:39.581 ƒ Middleware                                                                  145 kB
15:11:39.581 
15:11:39.583 ƒ  (Dynamic)  server-rendered on demand
15:11:39.583 
15:11:40.076    ▲ Next.js 15.4.11
15:11:40.077    - Local:        http://localhost:4440
15:11:40.077    - Network:      http://192.168.114.112:4440
15:11:40.077 
15:11:40.077  ✓ Starting...
15:11:40.611  ✓ Ready in 719ms
15:11:47.560 importAgent "https://core.ptbk.io/agents/adam"
15:11:51.140 importAgent "https://core.ptbk.io/agents/adam"
15:11:51.991 importAgent "https://core.ptbk.io/agents/adam"
15:11:52.713 importAgent "https://core.ptbk.io/agents/adam"
15:11:53.451 importAgent "https://core.ptbk.io/agents/adam"
15:11:54.505 importAgent "https://core.ptbk.io/agents/adam"
15:11:55.169 importAgent "https://core.ptbk.io/agents/adam"
15:11:56.140 importAgent "https://core.ptbk.io/agents/adam"
15:11:57.181 importAgent "https://core.ptbk.io/agents/adam"
15:11:57.873 importAgent "https://core.ptbk.io/agents/adam"
15:11:58.511 importAgent "https://core.ptbk.io/agents/adam"
15:11:59.163 importAgent "https://core.ptbk.io/agents/adam"
15:11:59.849 importAgent "https://core.ptbk.io/agents/adam"
15:12:00.570 importAgent "https://core.ptbk.io/agents/adam"
15:12:01.200 importAgent "https://core.ptbk.io/agents/adam"
15:12:01.879 importAgent "https://core.ptbk.io/agents/adam"
15:12:03.768 importAgent "https://core-test.ptbk.io/agents/KhD197F1HnQ4YT"
15:12:06.279 importAgent "https://core-test.ptbk.io/agents/jxo42ppGwEh27B"
15:12:07.172 importAgent "https://core-test.ptbk.io/agents/recursive-0"
15:16:41.640 Prerender homepage failed: Unable to reach http://127.0.0.1:4440/ within 15000ms
15:16:41.662 Error: Command "npm run build" exited with 1
```