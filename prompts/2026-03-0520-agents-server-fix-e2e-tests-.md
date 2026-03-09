[ ]

[✨✦] Fix E2E tests for the Agents Server

````bash
$ npm run test-app-agents-server

> promptbook-engine@0.111.0-11 test-app-agents-server
> (cd ./apps/agents-server/ && npm run test)


> test
> npm run lint && npm run test-build && npm run test-e2e


> lint
> next lint --max-warnings=0

 ⚠ Warning: Found multiple lockfiles. Selecting C:\Users\me\work\ai\promptbook\package-lock.json.
   Consider removing the lockfiles at:
   * C:\Users\me\work\ai\promptbook\apps\agents-server\package-lock.json

✔ No ESLint warnings or errors

> pretest-build
> npx kill-port 4021

Process on port 4021 killed

> test-build
> next build && node ./scripts/prerender-homepage.js

 ⚠ Warning: Found multiple lockfiles. Selecting C:\Users\me\work\ai\promptbook\package-lock.json.
   Consider removing the lockfiles at:
   * C:\Users\me\work\ai\promptbook\apps\agents-server\package-lock.json

   ▲ Next.js 15.4.11
   - Environments: .env
   - Experiments (use with caution):
     ✓ externalDir

   Creating an optimized production build ...
 ✓ Compiled successfully in 92s
 ✓ Linting and checking validity of types
   Collecting page data  ..(node:55308) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
   Collecting page data  ..(node:56356) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:10808) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.
Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
   Collecting page data  ...(node:55640) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ⚠ Using edge runtime on a page currently disables static generation for that page
(node:30696) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.
Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ✓ Collecting page data
(node:55708) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.
Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:20764) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.
Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ✓ Generating static pages (81/81)
 ✓ Collecting build traces
 ✓ Finalizing page optimization

Route (app)                                                       Size  First Load JS
┌ ƒ /                                                            215 B        1.13 MB
├ ƒ /_not-found                                                  366 B         101 kB
├ ƒ /[agentName]                                                 198 B         993 kB
├ ƒ /[agentName]/[...rest]                                       366 B         101 kB
├ ƒ /admin/about                                               13.4 kB        1.02 MB
├ ƒ /admin/api-tokens                                          2.46 kB         152 kB
├ ƒ /admin/backup                                              1.43 kB         151 kB
├ ƒ /admin/browser-test                                        2.13 kB         151 kB
├ ƒ /admin/chat-feedback                                       4.68 kB         594 kB
├ ƒ /admin/chat-history                                        4.56 kB         594 kB
├ ƒ /admin/custom-css                                          4.88 kB         158 kB
├ ƒ /admin/custom-js                                           6.19 kB         160 kB
├ ƒ /admin/error-simulation                                    3.56 kB         156 kB
├ ƒ /admin/files                                               2.98 kB         156 kB
├ ƒ /admin/image-generator-test                                5.26 kB         196 kB
├ ƒ /admin/images                                              3.67 kB         156 kB
├ ƒ /admin/messages                                             2.8 kB         152 kB
├ ƒ /admin/messages/send-email                                 7.34 kB         157 kB
├ ƒ /admin/metadata                                            8.41 kB         200 kB
├ ƒ /admin/models                                                284 B         153 kB
├ ƒ /admin/search-engine-test                                  2.01 kB         151 kB
├ ƒ /admin/usage                                               5.86 kB         155 kB
├ ƒ /admin/users                                               2.37 kB         152 kB
├ ƒ /admin/users/[userId]                                      2.28 kB         155 kB
├ ƒ /admin/voice-input-test                                    3.17 kB         152 kB
├ ƒ /agents                                                      214 B        1.13 MB
├ ƒ /agents/[agentName]                                          199 B         993 kB
├ ƒ /agents/[agentName]/api/book                                 366 B         101 kB
├ ƒ /agents/[agentName]/api/book/history                         366 B         101 kB
├ ƒ /agents/[agentName]/api/book/missing-agent                   366 B         101 kB
├ ƒ /agents/[agentName]/api/book/reference-diagnostics           366 B         101 kB
├ ƒ /agents/[agentName]/api/chat                                 366 B         101 kB
├ ƒ /agents/[agentName]/api/feedback                             366 B         101 kB
├ ƒ /agents/[agentName]/api/mcp                                  366 B         101 kB
├ ƒ /agents/[agentName]/api/meta-disclaimer                      366 B         101 kB
├ ƒ /agents/[agentName]/api/model-requirements                   366 B         101 kB
├ ƒ /agents/[agentName]/api/model-requirements/system-message    366 B         101 kB
├ ƒ /agents/[agentName]/api/openai/chat/completions              366 B         101 kB
├ ƒ /agents/[agentName]/api/openai/models                        366 B         101 kB
├ ƒ /agents/[agentName]/api/openai/v1/chat/completions           366 B         101 kB
├ ƒ /agents/[agentName]/api/openai/v1/models                     366 B         101 kB
├ ƒ /agents/[agentName]/api/openrouter/chat/completions          366 B         101 kB
├ ƒ /agents/[agentName]/api/profile                              366 B         101 kB
├ ƒ /agents/[agentName]/api/user-chats                           366 B         101 kB
├ ƒ /agents/[agentName]/api/user-chats/[chatId]                  366 B         101 kB
├ ƒ /agents/[agentName]/api/user-chats/[chatId]/draft            366 B         101 kB
├ ƒ /agents/[agentName]/api/voice                                366 B         101 kB
├ ƒ /agents/[agentName]/book                                   7.35 kB         383 kB
├ ƒ /agents/[agentName]/book+chat                              7.69 kB        1.03 MB
├ ƒ /agents/[agentName]/chat                                   6.27 kB        1.02 MB
├ ƒ /agents/[agentName]/export-as-transpiled-code              2.79 kB         108 kB
├ ƒ /agents/[agentName]/export-as-transpiled-code/api            366 B         101 kB
├ ƒ /agents/[agentName]/history                                2.04 kB         103 kB
├ ƒ /agents/[agentName]/iframe                                   366 B         101 kB
├ ƒ /agents/[agentName]/images                                   172 B         104 kB
├ ƒ /agents/[agentName]/images/default-avatar.png                366 B         101 kB
├ ƒ /agents/[agentName]/images/icon-256.png                      366 B         101 kB
├ ƒ /agents/[agentName]/images/screenshot-fullhd.png             366 B         101 kB
├ ƒ /agents/[agentName]/images/screenshot-phone.png              366 B         101 kB
├ ƒ /agents/[agentName]/integration                            5.22 kB         159 kB
├ ƒ /agents/[agentName]/opengraph-image                          366 B         101 kB
├ ƒ /agents/[agentName]/system-message                           468 B         328 kB
├ ƒ /agents/[agentName]/textarea                               1.41 kB         102 kB
├ ƒ /agents/[agentName]/website-integration                    14.9 kB         978 kB
├ ƒ /api/admin-email                                             366 B         101 kB
├ ƒ /api/admin/backups/books                                     366 B         101 kB
├ ƒ /api/admin/error-simulation                                  366 B         101 kB
├ ƒ /api/agent-folders                                           366 B         101 kB
├ ƒ /api/agent-folders/[folderId]                                366 B         101 kB
├ ƒ /api/agent-folders/[folderId]/restore                        366 B         101 kB
├ ƒ /api/agent-folders/[folderId]/visibility                     366 B         101 kB
├ ƒ /api/agent-organization                                      366 B         101 kB
├ ƒ /api/agents                                                  366 B         101 kB
├ ƒ /api/agents/[agentName]                                      366 B         101 kB
├ ƒ /api/agents/[agentName]/clone                                366 B         101 kB
├ ƒ /api/agents/[agentName]/restore                              366 B         101 kB
├ ƒ /api/api-tokens                                              366 B         101 kB
├ ƒ /api/auth/change-password                                    366 B         101 kB
├ ƒ /api/auth/login                                              366 B         101 kB
├ ƒ /api/auth/logout                                             366 B         101 kB
├ ƒ /api/browser-artifacts/[artifactName]                        366 B         101 kB
├ ƒ /api/browser-test/act                                        366 B         101 kB
├ ƒ /api/browser-test/screenshot                                 366 B         101 kB
├ ƒ /api/browser-test/scroll-facebook                            366 B         101 kB
├ ƒ /api/chat                                                    366 B         101 kB
├ ƒ /api/chat-feedback                                           366 B         101 kB
├ ƒ /api/chat-feedback/[id]                                      366 B         101 kB
├ ƒ /api/chat-feedback/export                                    366 B         101 kB
├ ƒ /api/chat-history                                            366 B         101 kB
├ ƒ /api/chat-history/[id]                                       366 B         101 kB
├ ƒ /api/chat-history/export                                     366 B         101 kB
├ ƒ /api/chat-streaming                                          366 B         101 kB
├ ƒ /api/custom-css                                              366 B         101 kB
├ ƒ /api/custom-js                                               366 B         101 kB
├ ○ /api/docs/book.md                                            366 B         101 kB
├ ƒ /api/elevenlabs/tts                                          366 B         101 kB
├ ƒ /api/emails/incoming/sendgrid                                366 B         101 kB
├ ƒ /api/embed.js                                                366 B         101 kB
├ ƒ /api/error-reports/application                               366 B         101 kB
├ ƒ /api/federated-agents                                        366 B         101 kB
├ ƒ /api/github-app/callback                                     366 B         101 kB
├ ƒ /api/github-app/connect                                      366 B         101 kB
├ ƒ /api/github-app/status                                       366 B         101 kB
├ ƒ /api/images/[filename]                                       366 B         101 kB
├ ƒ /api/long-running-task                                       366 B         101 kB
├ ƒ /api/long-streaming                                          366 B         101 kB
├ ƒ /api/messages                                                366 B         101 kB
├ ƒ /api/metadata                                                366 B         101 kB
├ ƒ /api/openai/v1/audio/transcriptions                          366 B         101 kB
├ ƒ /api/openai/v1/chat/completions                              366 B         101 kB
├ ƒ /api/openai/v1/models                                        366 B         101 kB
├ ƒ /api/profile                                                 366 B         101 kB
├ ƒ /api/scrape                                                  366 B         101 kB
├ ƒ /api/search                                                  366 B         101 kB
├ ƒ /api/send-email                                              366 B         101 kB
├ ƒ /api/spawn-agent                                             366 B         101 kB
├ ƒ /api/story/export                                            366 B         101 kB
├ ƒ /api/team-agent-profile                                      366 B         101 kB
├ ƒ /api/upload                                                  366 B         101 kB
├ ƒ /api/usage                                                   366 B         101 kB
├ ƒ /api/user-memory                                             366 B         101 kB
├ ƒ /api/user-memory/[memoryId]                                  366 B         101 kB
├ ƒ /api/user-wallet                                             366 B         101 kB
├ ƒ /api/user-wallet/[walletId]                                  366 B         101 kB
├ ƒ /api/users                                                   366 B         101 kB
├ ƒ /api/users/[username]                                        366 B         101 kB
├ ƒ /docs                                                        257 B         981 kB
├ ƒ /docs/[docId]                                                245 B         981 kB
├ ƒ /embed                                                       866 B         958 kB
├ ƒ /experiments/story                                         4.76 kB         338 kB
├ ƒ /humans.txt                                                  366 B         101 kB
├ ƒ /manifest.webmanifest                                        366 B         101 kB
├ ƒ /recycle-bin                                               18.8 kB         123 kB
├ ƒ /restricted                                                  172 B         104 kB
├ ƒ /robots.txt                                                  366 B         101 kB
├ ƒ /search                                                    4.97 kB         109 kB
├ ƒ /security.txt                                                366 B         101 kB
├ ƒ /sitemap.xml                                                 366 B         101 kB
├ ƒ /story/[[...story]]                                          366 B         101 kB
├ ƒ /swagger                                                   1.36 kB         102 kB
├ ƒ /system/profile                                            1.66 kB         151 kB
├ ƒ /system/user-memory                                        2.84 kB         152 kB
├ ƒ /system/user-wallet                                        9.74 kB         159 kB
├ ƒ /test/og-image                                               366 B         101 kB
└ ƒ /test/og-image/opengraph-image                               366 B         101 kB
+ First Load JS shared by all                                   101 kB
  ├ chunks/1902-6c00c0ddb76957dc.js                            44.4 kB
  ├ chunks/87c73c54-095cf9a90cf9ee03.js                        54.1 kB
  └ other shared chunks (total)                                2.43 kB


ƒ Middleware                                                     80 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

   ▲ Next.js 15.4.11
   - Local:        http://localhost:4440
   - Network:      http://172.22.16.1:4440

 ✓ Starting...
 ⚠ Warning: Found multiple lockfiles. Selecting C:\Users\me\work\ai\promptbook\package-lock.json.
   Consider removing the lockfiles at:
   * C:\Users\me\work\ai\promptbook\apps\agents-server\package-lock.json

 ✓ Ready in 1808ms
(node:54596) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.
Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
ReferenceError: window is not defined
    at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
    at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24151)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
    at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
 ⨯ unhandledRejection:  ReferenceError: window is not defined
    at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
    at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24151)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
    at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
Unhandled rejection ReferenceError: window is not defined
    at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
    at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24151)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
    at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143) Promise {
  <rejected> ReferenceError: window is not defined
      at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
      at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
      at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
      at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24151)
      at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
      at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
      at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143),
  [Symbol(async_id_symbol)]: 19196,
  [Symbol(trigger_async_id_symbol)]: 19195,
  [Symbol(kResourceStore)]: undefined,
  [Symbol(kResourceStore)]: undefined,
  [Symbol(kResourceStore)]: undefined,
  [Symbol(kResourceStore)]: undefined
}
ReferenceError: window is not defined
    at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
    at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24151)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 913057 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\app\admin\chat-feedback\page.js:2:11091)
    at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
 ⨯ unhandledRejection:  ReferenceError: window is not defined
    at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
    at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24151)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 913057 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\app\admin\chat-feedback\page.js:2:11091)
    at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
Unhandled rejection ReferenceError: window is not defined
    at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
    at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24151)
    at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
    at 913057 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\app\admin\chat-feedback\page.js:2:11091)
    at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143) Promise {
  <rejected> ReferenceError: window is not defined
      at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
      at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
      at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
      at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24151)
      at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
      at 913057 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\app\admin\chat-feedback\page.js:2:11091)
      at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143),
  [Symbol(async_id_symbol)]: 27015,
  [Symbol(trigger_async_id_symbol)]: 27014,
  [Symbol(kResourceStore)]: undefined,
  [Symbol(kResourceStore)]: undefined,
  [Symbol(kResourceStore)]: undefined,
  [Symbol(kResourceStore)]: undefined
}
Prerendered home page and saved to C:\Users\me\work\ai\promptbook\apps\agents-server\.next\prerendered\home.html

> test-e2e
> playwright test

[WebServer] [mock-supabase] listening on http://127.0.0.1:54321
[WebServer]
[WebServer] > prebuild
[WebServer] > npm run generate-reserved-paths && npx kill-port 4440 ||  exit 0
[WebServer]
[WebServer]
[WebServer] > generate-reserved-paths
[WebServer] > ts-node ./scripts/generate-reserved-paths/generate-reserved-paths.ts
[WebServer]
[WebServer] Generated C:\Users\me\work\ai\promptbook\apps\agents-server\src\generated\reservedPaths.ts with 27 reserved paths:
[WebServer] _data, _next, admin, agents, api, dashboard, docs, embed, experiments, favicon.ico, fonts, humans.txt, logo-blue-white-256.png, manifest.webmanifest, recycle-bin, restricted, robots.txt, search, security.txt, sitemap.xml, sounds, story, sw.js, swagger, swagger.json, system, test
[WebServer] Process on port 4440 killed
[WebServer]
[WebServer] > build
[WebServer] > next build && node ./scripts/prerender-homepage.js
[WebServer]
[WebServer]  ⚠ Warning: Found multiple lockfiles. Selecting C:\Users\me\work\ai\promptbook\package-lock.json.
[WebServer]    Consider removing the lockfiles at:
[WebServer]    * C:\Users\me\work\ai\promptbook\apps\agents-server\package-lock.json
[WebServer]
[WebServer]    ▲ Next.js 15.4.11
[WebServer]    - Environments: .env
[WebServer]    - Experiments (use with caution):
[WebServer]      ✓ externalDir
[WebServer]
[WebServer]    Creating an optimized production build ...
[WebServer]  ✓ Compiled successfully in 69s
[WebServer]    Linting and checking validity of types ...
[WebServer]    Collecting page data ...
[WebServer] (node:57316) [DEP0040] DeprecationWarning: The `punycode` module is
deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] (node:56780) [DEP0040] DeprecationWarning: The `punycode` module is
deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] (node:12220) [DEP0040] DeprecationWarning: The `punycode` module is
deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] (node:32988) [DEP0040] DeprecationWarning: The `punycode` module is
deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer]  ⚠ Using edge runtime on a page currently disables static generation for that page
[WebServer] (node:10808) [DEP0040] DeprecationWarning: The `punycode` module is
deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer]    Generating static pages (0/81) ...
[WebServer]    Generating static pages (20/81)
[WebServer]    Generating static pages (40/81)
[WebServer] (node:8288) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer]    Generating static pages (60/81)
[WebServer] (node:5144) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer]  ✓ Generating static pages (81/81)
[WebServer]    Finalizing page optimization ...
[WebServer]    Collecting build traces ...
[WebServer]
[WebServer] Route (app)                                                       Size  First Load JS
[WebServer] ┌ ƒ /                                                            215 B        1.13 MB
[WebServer] ├ ƒ /_not-found                                                  366 B         101 kB
[WebServer] ├ ƒ /[agentName]                                                 198 B         993 kB
[WebServer] ├ ƒ /[agentName]/[...rest]                                       366 B         101 kB
[WebServer] ├ ƒ /admin/about                                               13.4
kB        1.02 MB
[WebServer] ├ ƒ /admin/api-tokens                                          2.46
kB         152 kB
[WebServer] ├ ƒ /admin/backup                                              1.43
kB         151 kB
[WebServer] ├ ƒ /admin/browser-test                                        2.13
kB         151 kB
[WebServer] ├ ƒ /admin/chat-feedback                                       4.68
kB         594 kB
[WebServer] ├ ƒ /admin/chat-history                                        4.56
kB         594 kB
[WebServer] ├ ƒ /admin/custom-css                                          4.88
kB         158 kB
[WebServer] ├ ƒ /admin/custom-js                                           6.19
kB         160 kB
[WebServer] ├ ƒ /admin/error-simulation                                    3.56
kB         156 kB
[WebServer] ├ ƒ /admin/files                                               2.98
kB         156 kB
[WebServer] ├ ƒ /admin/image-generator-test                                5.26
kB         196 kB
[WebServer] ├ ƒ /admin/images                                              3.67
kB         156 kB
[WebServer] ├ ƒ /admin/messages                                             2.8
kB         152 kB
[WebServer] ├ ƒ /admin/messages/send-email                                 7.34
kB         157 kB
[WebServer] ├ ƒ /admin/metadata                                            8.41
kB         200 kB
[WebServer] ├ ƒ /admin/models                                                284 B         153 kB
[WebServer] ├ ƒ /admin/search-engine-test                                  2.01
kB         151 kB
[WebServer] ├ ƒ /admin/usage                                               5.86
kB         155 kB
[WebServer] ├ ƒ /admin/users                                               2.37
kB         152 kB
[WebServer] ├ ƒ /admin/users/[userId]                                      2.28
kB         155 kB
[WebServer] ├ ƒ /admin/voice-input-test                                    3.17
kB         152 kB
[WebServer] ├ ƒ /agents                                                      214 B        1.13 MB
[WebServer] ├ ƒ /agents/[agentName]                                          199 B         993 kB
[WebServer] ├ ƒ /agents/[agentName]/api/book                                 366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/book/history                         366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/book/missing-agent                   366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/book/reference-diagnostics           366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/chat                                 366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/feedback                             366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/mcp                                  366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/meta-disclaimer                      366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/model-requirements                   366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/model-requirements/system-message    366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/openai/chat/completions              366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/openai/models                        366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/openai/v1/chat/completions           366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/openai/v1/models                     366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/openrouter/chat/completions          366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/profile                              366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/user-chats                           366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/user-chats/[chatId]                  366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/user-chats/[chatId]/draft            366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/api/voice                                366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/book                                   7.35
kB         383 kB
[WebServer] ├ ƒ /agents/[agentName]/book+chat                              7.69
kB        1.03 MB
[WebServer] ├ ƒ /agents/[agentName]/chat                                   6.27
kB        1.02 MB
[WebServer] ├ ƒ /agents/[agentName]/export-as-transpiled-code              2.79
kB         108 kB
[WebServer] ├ ƒ /agents/[agentName]/export-as-transpiled-code/api            366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/history                                2.04
kB         103 kB
[WebServer] ├ ƒ /agents/[agentName]/iframe                                   366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/images                                   172 B         104 kB
[WebServer] ├ ƒ /agents/[agentName]/images/default-avatar.png                366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/images/icon-256.png                      366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/images/screenshot-fullhd.png             366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/images/screenshot-phone.png              366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/integration                            5.22
kB         159 kB
[WebServer] ├ ƒ /agents/[agentName]/opengraph-image                          366 B         101 kB
[WebServer] ├ ƒ /agents/[agentName]/system-message                           468 B         328 kB
[WebServer] ├ ƒ /agents/[agentName]/textarea                               1.41
kB         102 kB
[WebServer] ├ ƒ /agents/[agentName]/website-integration                    14.9
kB         978 kB
[WebServer] ├ ƒ /api/admin-email                                             366 B         101 kB
[WebServer] ├ ƒ /api/admin/backups/books                                     366 B         101 kB
[WebServer] ├ ƒ /api/admin/error-simulation                                  366 B         101 kB
[WebServer] ├ ƒ /api/agent-folders                                           366 B         101 kB
[WebServer] ├ ƒ /api/agent-folders/[folderId]                                366 B         101 kB
[WebServer] ├ ƒ /api/agent-folders/[folderId]/restore                        366 B         101 kB
[WebServer] ├ ƒ /api/agent-folders/[folderId]/visibility                     366 B         101 kB
[WebServer] ├ ƒ /api/agent-organization                                      366 B         101 kB
[WebServer] ├ ƒ /api/agents                                                  366 B         101 kB
[WebServer] ├ ƒ /api/agents/[agentName]                                      366 B         101 kB
[WebServer] ├ ƒ /api/agents/[agentName]/clone                                366 B         101 kB
[WebServer] ├ ƒ /api/agents/[agentName]/restore                              366 B         101 kB
[WebServer] ├ ƒ /api/api-tokens                                              366 B         101 kB
[WebServer] ├ ƒ /api/auth/change-password                                    366 B         101 kB
[WebServer] ├ ƒ /api/auth/login                                              366 B         101 kB
[WebServer] ├ ƒ /api/auth/logout                                             366 B         101 kB
[WebServer] ├ ƒ /api/browser-artifacts/[artifactName]                        366 B         101 kB
[WebServer] ├ ƒ /api/browser-test/act                                        366 B         101 kB
[WebServer] ├ ƒ /api/browser-test/screenshot                                 366 B         101 kB
[WebServer] ├ ƒ /api/browser-test/scroll-facebook                            366 B         101 kB
[WebServer] ├ ƒ /api/chat                                                    366 B         101 kB
[WebServer] ├ ƒ /api/chat-feedback                                           366 B         101 kB
[WebServer] ├ ƒ /api/chat-feedback/[id]                                      366 B         101 kB
[WebServer] ├ ƒ /api/chat-feedback/export                                    366 B         101 kB
[WebServer] ├ ƒ /api/chat-history                                            366 B         101 kB
[WebServer] ├ ƒ /api/chat-history/[id]                                       366 B         101 kB
[WebServer] ├ ƒ /api/chat-history/export                                     366 B         101 kB
[WebServer] ├ ƒ /api/chat-streaming                                          366 B         101 kB
[WebServer] ├ ƒ /api/custom-css                                              366 B         101 kB
[WebServer] ├ ƒ /api/custom-js                                               366 B         101 kB
[WebServer] ├ ○ /api/docs/book.md                                            366 B         101 kB
[WebServer] ├ ƒ /api/elevenlabs/tts                                          366 B         101 kB
[WebServer] ├ ƒ /api/emails/incoming/sendgrid                                366 B         101 kB
[WebServer] ├ ƒ /api/embed.js                                                366 B         101 kB
[WebServer] ├ ƒ /api/error-reports/application                               366 B         101 kB
[WebServer] ├ ƒ /api/federated-agents                                        366 B         101 kB
[WebServer] ├ ƒ /api/github-app/callback                                     366 B         101 kB
[WebServer] ├ ƒ /api/github-app/connect                                      366 B         101 kB
[WebServer] ├ ƒ /api/github-app/status                                       366 B         101 kB
[WebServer] ├ ƒ /api/images/[filename]                                       366 B         101 kB
[WebServer] ├ ƒ /api/long-running-task                                       366 B         101 kB
[WebServer] ├ ƒ /api/long-streaming                                          366 B         101 kB
[WebServer] ├ ƒ /api/messages                                                366 B         101 kB
[WebServer] ├ ƒ /api/metadata                                                366 B         101 kB
[WebServer] ├ ƒ /api/openai/v1/audio/transcriptions                          366 B         101 kB
[WebServer] ├ ƒ /api/openai/v1/chat/completions                              366 B         101 kB
[WebServer] ├ ƒ /api/openai/v1/models                                        366 B         101 kB
[WebServer] ├ ƒ /api/profile                                                 366 B         101 kB
[WebServer] ├ ƒ /api/scrape                                                  366 B         101 kB
[WebServer] ├ ƒ /api/search                                                  366 B         101 kB
[WebServer] ├ ƒ /api/send-email                                              366 B         101 kB
[WebServer] ├ ƒ /api/spawn-agent                                             366 B         101 kB
[WebServer] ├ ƒ /api/story/export                                            366 B         101 kB
[WebServer] ├ ƒ /api/team-agent-profile                                      366 B         101 kB
[WebServer] ├ ƒ /api/upload                                                  366 B         101 kB
[WebServer] ├ ƒ /api/usage                                                   366 B         101 kB
[WebServer] ├ ƒ /api/user-memory                                             366 B         101 kB
[WebServer] ├ ƒ /api/user-memory/[memoryId]                                  366 B         101 kB
[WebServer] ├ ƒ /api/user-wallet                                             366 B         101 kB
[WebServer] ├ ƒ /api/user-wallet/[walletId]                                  366 B         101 kB
[WebServer] ├ ƒ /api/users                                                   366 B         101 kB
[WebServer] ├ ƒ /api/users/[username]                                        366 B         101 kB
[WebServer] ├ ƒ /docs                                                        257 B         981 kB
[WebServer] ├ ƒ /docs/[docId]                                                245 B         981 kB
[WebServer] ├ ƒ /embed                                                       866 B         958 kB
[WebServer] ├ ƒ /experiments/story                                         4.76
kB         338 kB
[WebServer] ├ ƒ /humans.txt                                                  366 B         101 kB
[WebServer] ├ ƒ /manifest.webmanifest                                        366 B         101 kB
[WebServer] ├ ƒ /recycle-bin                                               18.8
kB         123 kB
[WebServer] ├ ƒ /restricted                                                  172 B         104 kB
[WebServer] ├ ƒ /robots.txt                                                  366 B         101 kB
[WebServer] ├ ƒ /search                                                    4.97
kB         109 kB
[WebServer] ├ ƒ /security.txt                                                366 B         101 kB
[WebServer] ├ ƒ /sitemap.xml                                                 366 B         101 kB
[WebServer] ├ ƒ /story/[[...story]]                                          366 B         101 kB
[WebServer] ├ ƒ /swagger                                                   1.36
kB         102 kB
[WebServer] ├ ƒ /system/profile                                            1.66
kB         151 kB
[WebServer] ├ ƒ /system/user-memory                                        2.84
kB         152 kB
[WebServer] ├ ƒ /system/user-wallet                                        9.74
kB         159 kB
[WebServer] ├ ƒ /test/og-image                                               366 B         101 kB
[WebServer] └ ƒ /test/og-image/opengraph-image                               366 B         101 kB
[WebServer] + First Load JS shared by all                                   101
kB
[WebServer]   ├ chunks/1902-6c00c0ddb76957dc.js                            44.4
kB
[WebServer]   ├ chunks/87c73c54-095cf9a90cf9ee03.js                        54.1
kB
[WebServer]   └ other shared chunks (total)                                2.43
kB
[WebServer]
[WebServer]
[WebServer] ƒ Middleware                                                     80
kB
[WebServer]
[WebServer] ○  (Static)   prerendered as static content
[WebServer] ƒ  (Dynamic)  server-rendered on demand
[WebServer]
[WebServer]    ▲ Next.js 15.4.11
[WebServer]    - Local:        http://localhost:4440
[WebServer]    - Network:      http://172.22.16.1:4440
[WebServer]
[WebServer]  ✓ Starting...
[WebServer]  ⚠ Warning: Found multiple lockfiles. Selecting C:\Users\me\work\ai\promptbook\package-lock.json.
[WebServer]    Consider removing the lockfiles at:
[WebServer]    * C:\Users\me\work\ai\promptbook\apps\agents-server\package-lock.json
[WebServer]
[WebServer]  ✓ Ready in 1779ms
[WebServer] (node:25428) [DEP0040] DeprecationWarning: The `punycode` module is
deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] ReferenceError: window is not defined
[WebServer]     at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]     at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
[WebServer]     at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]  ⨯ unhandledRejection:  ReferenceError: window is not defined
[WebServer]     at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]     at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
[WebServer]     at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer] Unhandled rejection ReferenceError: window is not defined
[WebServer]     at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]     at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
[WebServer]     at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143) Promise {
[WebServer]   <rejected> ReferenceError: window is not defined
[WebServer]       at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]       at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]       at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]       at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]       at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]       at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
[WebServer]       at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143),
[WebServer]   [Symbol(async_id_symbol)]: 12999,
[WebServer]   [Symbol(trigger_async_id_symbol)]: 12998,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined
[WebServer] }
[WebServer] Prerendered home page and saved to C:\Users\me\work\ai\promptbook\apps\agents-server\.next\prerendered\home.html

Running 6 tests using 1 worker

[WebServer]
[WebServer] > start
[WebServer] > next start -p 4440
[WebServer]
[WebServer]    ▲ Next.js 15.4.11
[WebServer]    - Local:        http://localhost:4440
[WebServer]    - Network:      http://172.22.16.1:4440
[WebServer]
[WebServer]  ✓ Starting...
[WebServer]  ⚠ Warning: Found multiple lockfiles. Selecting C:\Users\me\work\ai\promptbook\package-lock.json.
[WebServer]    Consider removing the lockfiles at:
[WebServer]    * C:\Users\me\work\ai\promptbook\apps\agents-server\package-lock.json
[WebServer]
     1 …ization › returns unauthorized metadata API response for anonymous users[WebServer]  ✓ Ready in 2.5s
[WebServer] (node:9480) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
[WebServer] ReferenceError: window is not defined
[WebServer]     at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]     at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
[WebServer]     at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]  ⨯ unhandledRejection:  ReferenceError: window is not defined
[WebServer]     at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]     at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
[WebServer]     at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer] Unhandled rejection ReferenceError: window is not defined
[WebServer]     at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]     at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
[WebServer]     at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143) Promise {
[WebServer]   <rejected> ReferenceError: window is not defined
[WebServer]       at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]       at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]       at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]       at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]       at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]       at 248315 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6374.js:1:2009)
[WebServer]       at Function.c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143),
[WebServer]   [Symbol(async_id_symbol)]: 12511,
[WebServer]   [Symbol(trigger_async_id_symbol)]: 12510,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined,
[WebServer]   [Symbol(kResourceStore)]: undefined
[WebServer] }
  ✓  1 … › returns unauthorized metadata API response for anonymous users (8.1s)  ✓  2 …metadata API access and blocks admin password changes through API (2.8s)[WebServer] Login attempt for user: admin
  ✓  3 … › shows forbidden state for protected System page when anonymous (1.1s)     4 …navigation › allows admin to sign in, navigate major menus, and sign out[WebServer] Login attempt for user: admin
[WebServer]  ⨯ ReferenceError: window is not defined
[WebServer]     at <unknown> (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:42332)
[WebServer]     at 258455 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\6369.js:1:188840)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 330802 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9933.js:1:24580)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 147739 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9141.js:2:17834)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 894499 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\chunks\9141.js:10:3684)
[WebServer]     at c (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\webpack-runtime.js:1:143)
[WebServer]     at 396621 (C:\Users\me\work\ai\promptbook\apps\agents-server\.next\server\app\agents\[agentName]\website-integration\page.js:20:10924) {
[WebServer]   digest: '800464117'
[WebServer] }
  ✘  4 …ion › allows admin to sign in, navigate major menus, and sign out (1.1m)  ✓  5 …ion › keeps nested header submenu items tappable on touch devices (4.0s)[WebServer] Login attempt for user: admin
     6 …› protects clone prompt against accidental close when the input is dirty[WebServer] Login attempt for user: admin
[WebServer] [pre-index] scheduled {
[WebServer]   tablePrefix: 'server_1270014440_',
[WebServer]   agentPermanentId: 'YQg5CvCYJMnN9u',
[WebServer]   fingerprint: '19188fbfa023ee3e60d447db9b9eb54272ba852472324a77c404f2de6fe5130d',
[WebServer]   triggerReason: 'AGENT_CREATED',
[WebServer]   runAfter: '2026-03-09T14:29:25.977Z',
[WebServer]   mode: 'insert',
[WebServer]   counters: { scheduled: 1, started: 0, skipped: 0, completed: 0, failed: 0 }
[WebServer] }
[WebServer] [🐱‍🚀] Creating NEW execution tools
[WebServer] Cache miss for key: generate-default-ava-a5b977d6a {
[WebServer]   prompt: {
[WebServer]     title: 'Generate default avatar for YQg5CvCYJMnN9u',
[WebServer]     content: '            Create an animated, non-photorealistic portrait of the AI agent persona "Olivia White".\n' +
[WebServer]       '\n' +
[WebServer]       '            -  Create a non-photorealistic animated illustration with rich, hand-crafted digital rendering and confident business polish.\n'
+
[WebServer]       '-  The character should feel like a friendly, wise mentor: warm, composed, approachable, and clearly competent without looking childish.\n' +[WebServer]       '-  Avoid cold technocratic aesthetics; favor tactile brushwork, gentle gradients, and elegant stylization that feels modern and human.\n' +
[WebServer]       '\n' +
[WebServer]       '            Persona summary:\n' +
[WebServer]       '            ```\n' +
[WebServer]       '            Serious and focused AI consultant.\n' +
[WebServer]       '            ```\n' +
[WebServer]       '\n' +
[WebServer]       '            Motifs & palette:\n' +
[WebServer]       '            -  Color palette rooted in graphite with iridescent sapphire accents, harmonized with warm ambers, terracotta, peach, or muted gold to create welcoming contrast.\n' +
[WebServer]       '-  Reference a modern geometric sans serif only as abstract shape language (rhythm, geometry, spacing), never as readable letters or words.\n' +
[WebServer]       '-  Use symbolic motifs of guidance and intelligence (constellations, pathways, lantern glow, layered maps, subtle geometric halos) in a mature business context.\n' +
[WebServer]       '\n' +
[WebServer]       '            Composition:\n' +
[WebServer]       '            -  Vertical composition with a clearly readable central character and clean silhouette, suitable for small avatar crops.\n' +
[WebServer]       '-  Each agent should feel visually distinct through unique accessories, framing motifs, mood, and scene geometry so users can quickly tell them apart.\n' +
[WebServer]       '-  Background should be rich but uncluttered, using layered animated-style textures and soft depth cues rather than realistic photography.\n' +
[WebServer]       '\n' +
[WebServer]       '            Lighting & texture:\n' +
[WebServer]       '            -  Use warm cinematic lighting with soft bounce light and subtle rim accents to communicate safety, clarity, and helpful presence.\n' +
[WebServer]       '-  Keep material rendering stylized and illustrative (not photoreal), with smooth gradients and selective detail that reads cleanly at avatar size.\n' +
[WebServer]       '\n' +
[WebServer]       '            Hard constraints:\n' +
[WebServer]       '            -  No photorealism.\n' +
[WebServer]       '            -  No text, letters, logos, or readable typography in the image.\n' +
[WebServer]       '            -  Professional business-friendly tone: warm and
welcoming, never childish or goofy.\n' +
[WebServer]       '\n' +
[WebServer]       '            Atmosphere should feel like a welcoming, wise advisor: a trustworthy assistant rendered in a distinctive animated visual language.',
[WebServer]     parameters: {},
[WebServer]     modelRequirements: {
[WebServer]       modelVariant: 'IMAGE_GENERATION',
[WebServer]       modelName: 'gemini-3-pro-image-preview',
[WebServer]       size: '1024x1792',
[WebServer]       quality: 'hd',
[WebServer]       style: 'natural'
[WebServer]     }
[WebServer]   },
[WebServer]   'prompt.title': 'Generate default avatar for YQg5CvCYJMnN9u',
[WebServer]   MAX_FILENAME_LENGTH: 30,
[WebServer]   keyHashBase: {
[WebServer]     relevantParameters: {},
[WebServer]     normalizedContent: 'Create an animated, non-photorealistic portrait of the AI agent persona "Olivia White". - Create a non-photorealistic animated illustration with rich, hand-crafted digital rendering and confident business polish. - The character should feel like a friendly, wise mentor: warm, composed, approachable, and clearly competent without looking childish. - Avoid cold technocratic aesthetics; favor tactile brushwork, gentle gradients, and elegant stylization that feels modern and human. Persona summary: ``` Serious and focused
AI consultant. ``` Motifs & palette: - Color palette rooted in graphite with iridescent sapphire accents, harmonized with warm ambers, terracotta, peach, or muted gold to create welcoming contrast. - Reference a modern geometric sans serif
only as abstract shape language (rhythm, geometry, spacing), never as readable letters or words. - Use symbolic motifs of guidance and intelligence (constellations, pathways, lantern glow, layered maps, subtle geometric halos) in a mature business context. Composition: - Vertical composition with a clearly readable central character and clean silhouette, suitable for small avatar crops. - Each agent should feel visually distinct through unique accessories, framing motifs, mood, and scene geometry so users can quickly tell them apart. - Background should
be rich but uncluttered, using layered animated-style textures and soft depth cues rather than realistic photography. Lighting & texture: - Use warm cinematic lighting with soft bounce light and subtle rim accents to communicate safety, clarity, and helpful presence. - Keep material rendering stylized and illustrative
(not photoreal), with smooth gradients and selective detail that reads cleanly at avatar size. Hard constraints: - No photorealism. - No text, letters, logos, or readable typography in the image. - Professional business-friendly tone: warm
and welcoming, never childish or goofy. Atmosphere should feel like a welcoming, wise advisor: a trustworthy assistant rendered in a distinctive animated visual language.',
[WebServer]     modelRequirements: {
[WebServer]       modelVariant: 'IMAGE_GENERATION',
[WebServer]       modelName: 'gemini-3-pro-image-preview',
[WebServer]       size: '1024x1792',
[WebServer]       quality: 'hd',
[WebServer]       style: 'natural'
[WebServer]     }
[WebServer]   },
[WebServer]   parameters: {},
[WebServer]   relevantParameters: {},
[WebServer]   content: '            Create an animated, non-photorealistic portrait of the AI agent persona "Olivia White".\n' +
[WebServer]     '\n' +
[WebServer]     '            -  Create a non-photorealistic animated illustration with rich, hand-crafted digital rendering and confident business polish.\n' +
[WebServer]     '-  The character should feel like a friendly, wise mentor: warm, composed, approachable, and clearly competent without looking childish.\n' +
[WebServer]     '-  Avoid cold technocratic aesthetics; favor tactile brushwork, gentle gradients, and elegant stylization that feels modern and human.\n' +
[WebServer]     '\n' +
[WebServer]     '            Persona summary:\n' +
[WebServer]     '            ```\n' +
[WebServer]     '            Serious and focused AI consultant.\n' +
[WebServer]     '            ```\n' +
[WebServer]     '\n' +
[WebServer]     '            Motifs & palette:\n' +
[WebServer]     '            -  Color palette rooted in graphite with iridescent sapphire accents, harmonized with warm ambers, terracotta, peach, or muted gold to create welcoming contrast.\n' +
[WebServer]     '-  Reference a modern geometric sans serif only as abstract shape language (rhythm, geometry, spacing), never as readable letters or words.\n'
+
[WebServer]     '-  Use symbolic motifs of guidance and intelligence (constellations, pathways, lantern glow, layered maps, subtle geometric halos) in a mature
business context.\n' +
[WebServer]     '\n' +
[WebServer]     '            Composition:\n' +
[WebServer]     '            -  Vertical composition with a clearly readable central character and clean silhouette, suitable for small avatar crops.\n' +
[WebServer]     '-  Each agent should feel visually distinct through unique accessories, framing motifs, mood, and scene geometry so users can quickly tell them apart.\n' +
[WebServer]     '-  Background should be rich but uncluttered, using layered animated-style textures and soft depth cues rather than realistic photography.\n' +[WebServer]     '\n' +
[WebServer]     '            Lighting & texture:\n' +
[WebServer]     '            -  Use warm cinematic lighting with soft bounce light and subtle rim accents to communicate safety, clarity, and helpful presence.\n' +
[WebServer]     '-  Keep material rendering stylized and illustrative (not photoreal), with smooth gradients and selective detail that reads cleanly at avatar size.\n' +
[WebServer]     '\n' +
[WebServer]     '            Hard constraints:\n' +
[WebServer]     '            -  No photorealism.\n' +
[WebServer]     '            -  No text, letters, logos, or readable typography
in the image.\n' +
[WebServer]     '            -  Professional business-friendly tone: warm and welcoming, never childish or goofy.\n' +
[WebServer]     '\n' +
[WebServer]     '            Atmosphere should feel like a welcoming, wise advisor: a trustworthy assistant rendered in a distinctive animated visual language.',
[WebServer]   normalizedContent: 'Create an animated, non-photorealistic portrait of the AI agent persona "Olivia White". - Create a non-photorealistic animated illustration with rich, hand-crafted digital rendering and confident business polish. - The character should feel like a friendly, wise mentor: warm, composed, approachable, and clearly competent without looking childish. - Avoid cold technocratic aesthetics; favor tactile brushwork, gentle gradients, and elegant stylization that feels modern and human. Persona summary: ``` Serious and focused AI consultant. ``` Motifs & palette: - Color palette rooted in graphite with iridescent sapphire accents, harmonized with warm ambers, terracotta, peach, or muted gold to create welcoming contrast. - Reference a modern geometric sans serif only as abstract shape language (rhythm, geometry, spacing), never as readable letters or words. - Use symbolic motifs of guidance and intelligence (constellations, pathways, lantern glow, layered maps, subtle geometric halos) in a mature business context. Composition: - Vertical composition with a clearly readable central character and clean silhouette, suitable for small avatar crops. - Each agent should feel visually distinct through unique accessories, framing motifs, mood, and scene geometry so users can quickly tell them apart. - Background should be rich but uncluttered, using layered animated-style textures and soft depth cues rather than realistic photography. Lighting & texture: - Use warm cinematic lighting with soft bounce light and subtle rim accents to communicate safety, clarity, and helpful presence. - Keep material rendering stylized and illustrative (not photoreal), with smooth gradients and selective detail that reads cleanly at
avatar size. Hard constraints: - No photorealism. - No text, letters, logos, or
readable typography in the image. - Professional business-friendly tone: warm and welcoming, never childish or goofy. Atmosphere should feel like a welcoming, wise advisor: a trustworthy assistant rendered in a distinctive animated visual language.',
[WebServer]   modelRequirements: {
[WebServer]     modelVariant: 'IMAGE_GENERATION',
[WebServer]     modelName: 'gemini-3-pro-image-preview',
[WebServer]     size: '1024x1792',
[WebServer]     quality: 'hd',
[WebServer]     style: 'natural'
[WebServer]   }
[WebServer] }
  ✓  6 …cts clone prompt against accidental close when the input is dirty (5.2s)

  1) [chromium] › tests\e2e\authentication-and-navigation.spec.ts:68:9 › Agents
Server authentication and navigation › allows admin to sign in, navigate major menus, and sign out

    Test timeout of 60000ms exceeded.

    Error: locator.click: Test timeout of 60000ms exceeded.
    Call log:
      - waiting for getByRole('link', { name: 'Profile' })


      82 |
      83 |         await openHeaderMenu(page, 'System');
    > 84 |         await page.getByRole('link', { name: 'Profile' }).click();
         |                                                           ^
      85 |         await expect(page).toHaveURL(/\/system\/profile$/);
      86 |         await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
      87 |
        at C:\Users\me\work\ai\promptbook\apps\agents-server\tests\e2e\authentication-and-navigation.spec.ts:84:59

    attachment #1: screenshot (image/png) ──────────────────────────────────────    ..\..\other\integration-tests\videos\authentication-and-navigat-31cc9-te-major-menus-and-sign-out-chromium\test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────
    attachment #2: video (video/webm) ──────────────────────────────────────────    ..\..\other\integration-tests\videos\authentication-and-navigat-31cc9-te-major-menus-and-sign-out-chromium\video.webm
    ────────────────────────────────────────────────────────────────────────────
    Error Context: ..\..\other\integration-tests\videos\authentication-and-navigat-31cc9-te-major-menus-and-sign-out-chromium\error-context.md

  1 failed
    [chromium] › tests\e2e\authentication-and-navigation.spec.ts:68:9 › Agents Server authentication and navigation › allows admin to sign in, navigate major menus, and sign out
  5 passed (3.7m)
````

-   You are working with the [Agents Server](apps/agents-server)
