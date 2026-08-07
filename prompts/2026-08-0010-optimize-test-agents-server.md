[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$1.58 an hour; Testing 19 minutes

---

[ ]

[✨📭] Optimize and speed up the `npm run test-app-agents-server`

-   Now it takes extremely and unacceptably long amount of time to run the tests or the build of the agent server itself
-   The longest part is:

```console
> build
> node ./scripts/build-agents-ser
```

-   Also when installing or updating the agent server, it takes extremely long.
-   The goal is to reduce the time it takes to run the tests, build, and install/update the agent server without removing functionality or degrading the quality of the tests.
-   But do not degrade the quality of the tests.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is from fast device:**

```console
hejny@Pavols-MacBook-Air promptbook % time npm run test-app-agents-server

> promptbook@0.114.0-5 test-app-agents-server
> (cd ./apps/agents-server/ && npm run test)


> test
> npm run test-e2e


> pretest-e2e
> npx kill-port 4021 4440 || exit 0

Could not kill process on port 4021,4440. No process running on port.
Could not kill process on port 4021,4440. No process running on port.

> test-e2e
> node ./scripts/run-e2e-tests.js


> lint
> eslint src/ --max-warnings=0


> build-e2e
> node ./scripts/build-e2e.js --no-lint


> prebuild
> npm run generate-reserved-paths && node ./scripts/clearNextGeneratedTypes.js && npx kill-port 4440 ||  exit 0


> generate-reserved-paths
> ts-node ./scripts/generate-reserved-paths/generate-reserved-paths.ts

Generated /Users/hejny/work/promptbook/apps/agents-server/src/generated/reservedPaths.ts with 31 reserved paths:
_data, _next, admin, agents, api, dashboard, docs, embed, experiments, favicon.ico, fonts, humans.txt, logo-blue-white-256.png, manifest.webmanifest, openapi.json, promptbook-logo-blue.png, promptbook-logo-white.png, recycle-bin, restricted, robots.txt, s3, search, security.txt, sitemap.xml, sounds, story, superadmin, sw.js, swagger, system, test
Could not kill process on port 4440. No process running on port.

> build
> node ./scripts/build-agents-server.js --no-lint

 ⚠ Linting is disabled.
   ▲ Next.js 15.4.11
   - Experiments (use with caution):
     ✓ externalDir
     · clientTraceMetadata

   Creating an optimized production build ...
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (127kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (139kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (126kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
 ⚠ Compiled with warnings in 41s

../../node_modules/better-sqlite3/lib/database.js
Critical dependency: require function is used in a way in which dependencies cannot be statically extracted

Import trace for requested module:
../../node_modules/better-sqlite3/lib/database.js
../../node_modules/better-sqlite3/lib/index.js
./src/database/sqlite/$provideAgentsServerSqliteDatabase.ts
./src/database/sqlite/standaloneServerRegistryStore.ts
./src/instrumentation-node.ts

 ✓ Checking validity of types
 ⚠ Using edge runtime on a page currently disables static generation for that page
 ✓ Collecting page data
 ✓ Generating static pages (143/143)
 ✓ Collecting build traces
 ✓ Finalizing page optimization

Route (app)                                                                     Size  First Load JS
┌ ƒ /                                                                        1.38 kB        1.47 MB
├ ƒ /_not-found                                                                595 B         183 kB
├ ƒ /[agentName]                                                               585 B         333 kB
├ ƒ /[agentName]/[...rest]                                                     595 B         183 kB
├ ƒ /admin/about                                                              1.7 kB        1.77 MB
├ ƒ /admin/api-tokens                                                        6.21 kB         252 kB
├ ƒ /admin/backup                                                            3.95 kB         231 kB
├ ƒ /admin/browser-test                                                      3.13 kB         240 kB
├ ƒ /admin/chat-feedback                                                     20.1 kB        1.66 MB
├ ƒ /admin/chat-history                                                      23.3 kB        1.67 MB
├ ƒ /admin/core-agents                                                        2.4 kB        1.77 MB
├ ƒ /admin/custom-css                                                        9.52 kB         262 kB
├ ƒ /admin/custom-js                                                         11.3 kB         264 kB
├ ƒ /admin/email-server                                                      2.44 kB         235 kB
├ ƒ /admin/error-simulation                                                  4.82 kB         232 kB
├ ƒ /admin/files                                                             7.49 kB         263 kB
├ ƒ /admin/image-generator-test                                              13.9 kB         270 kB
├ ƒ /admin/images                                                            8.14 kB         264 kB
├ ƒ /admin/internal-s3                                                       1.65 kB         229 kB
├ ƒ /admin/limits                                                            2.31 kB         233 kB
├ ƒ /admin/login-methods/shibboleth                                           5.3 kB         251 kB
├ ƒ /admin/messages                                                          6.68 kB         253 kB
├ ƒ /admin/messages/send-email                                               5.27 kB         236 kB
├ ƒ /admin/metadata                                                          19.3 kB         306 kB
├ ƒ /admin/models                                                            1.65 kB         229 kB
├ ƒ /admin/projects                                                          1.65 kB         229 kB
├ ƒ /admin/search-engine-test                                                3.24 kB         230 kB
├ ƒ /admin/task-manager                                                        153 B         268 kB
├ ƒ /admin/task-manager-vps                                                    595 B         183 kB
├ ƒ /admin/task-manager/[taskId]                                             2.34 kB         263 kB
├ ƒ /admin/tool-limits                                                       1.64 kB         229 kB
├ ƒ /admin/transcriptions                                                    6.52 kB         240 kB
├ ƒ /admin/usage                                                             9.87 kB         266 kB
├ ƒ /admin/users                                                             2.08 kB         255 kB
├ ƒ /admin/users/[userId]                                                    6.57 kB         253 kB
├ ƒ /admin/voice-input-test                                                  5.13 kB         232 kB
├ ƒ /agents                                                                  1.38 kB        1.47 MB
├ ƒ /agents/[agentName]                                                        244 B         333 kB
├ ƒ /agents/[agentName]/api/book                                               595 B         183 kB
├ ƒ /agents/[agentName]/api/book/download                                      595 B         183 kB
├ ƒ /agents/[agentName]/api/book/history                                       595 B         183 kB
├ ƒ /agents/[agentName]/api/book/missing-agent                                 595 B         183 kB
├ ƒ /agents/[agentName]/api/book/reference-diagnostics                         595 B         183 kB
├ ƒ /agents/[agentName]/api/calendar-connections                               595 B         183 kB
├ ƒ /agents/[agentName]/api/calendar-connections/[connectionId]/disconnect     595 B         183 kB
├ ƒ /agents/[agentName]/api/calendar-events                                    595 B         183 kB
├ ƒ /agents/[agentName]/api/chat                                               595 B         183 kB
├ ƒ /agents/[agentName]/api/feedback                                           595 B         183 kB
├ ƒ /agents/[agentName]/api/mcp                                                595 B         183 kB
├ ƒ /agents/[agentName]/api/meta-disclaimer                                    595 B         183 kB
├ ƒ /agents/[agentName]/api/model-requirements                                 595 B         183 kB
├ ƒ /agents/[agentName]/api/model-requirements/system-message                  595 B         183 kB
├ ƒ /agents/[agentName]/api/openai/chat/completions                            595 B         183 kB
├ ƒ /agents/[agentName]/api/openai/models                                      595 B         183 kB
├ ƒ /agents/[agentName]/api/openai/v1/chat/completions                         595 B         183 kB
├ ƒ /agents/[agentName]/api/openai/v1/models                                   595 B         183 kB
├ ƒ /agents/[agentName]/api/openrouter/chat/completions                        595 B         183 kB
├ ƒ /agents/[agentName]/api/profile                                            595 B         183 kB
├ ƒ /agents/[agentName]/api/share-target/[shareTargetId]/consume               595 B         183 kB
├ ƒ /agents/[agentName]/api/timeouts                                           595 B         183 kB
├ ƒ /agents/[agentName]/api/timeouts/[timeoutId]                               595 B         183 kB
├ ƒ /agents/[agentName]/api/user-chats                                         595 B         183 kB
├ ƒ /agents/[agentName]/api/user-chats/[chatId]                                595 B         183 kB
├ ƒ /agents/[agentName]/api/user-chats/[chatId]/draft                          595 B         183 kB
├ ƒ /agents/[agentName]/api/user-chats/[chatId]/jobs/[jobId]/cancel            595 B         183 kB
├ ƒ /agents/[agentName]/api/user-chats/[chatId]/messages                       595 B         183 kB
├ ƒ /agents/[agentName]/api/user-chats/[chatId]/stream                         595 B         183 kB
├ ƒ /agents/[agentName]/api/user-chats/[chatId]/timeouts/[timeoutId]/cancel    595 B         183 kB
├ ƒ /agents/[agentName]/api/voice                                              595 B         183 kB
├ ƒ /agents/[agentName]/book                                                 11.9 kB         326 kB
├ ƒ /agents/[agentName]/book+chat                                            3.74 kB        1.81 MB
├ ƒ /agents/[agentName]/chat                                                 31.7 kB        1.83 MB
├ ƒ /agents/[agentName]/export-as-transpiled-code                            6.65 kB         287 kB
├ ƒ /agents/[agentName]/export-as-transpiled-code/api                          595 B         183 kB
├ ƒ /agents/[agentName]/export-as-transpiled-code/api/download                 595 B         183 kB
├ ƒ /agents/[agentName]/goal                                                 1.64 kB         229 kB
├ ƒ /agents/[agentName]/history                                              2.51 kB         230 kB
├ ƒ /agents/[agentName]/iframe                                                 595 B         183 kB
├ ƒ /agents/[agentName]/images                                                 172 B         184 kB
├ ƒ /agents/[agentName]/images/default-avatar.png                              595 B         183 kB
├ ƒ /agents/[agentName]/images/icon-256.png                                    595 B         183 kB
├ ƒ /agents/[agentName]/images/screenshot-fullhd.png                           595 B         183 kB
├ ƒ /agents/[agentName]/images/screenshot-phone.png                            595 B         183 kB
├ ƒ /agents/[agentName]/integration                                          10.7 kB         271 kB
├ ƒ /agents/[agentName]/opengraph-image                                        595 B         183 kB
├ ƒ /agents/[agentName]/projects                                             1.65 kB         229 kB
├ ƒ /agents/[agentName]/projects/[projectName]                               2.02 kB        1.77 MB
├ ƒ /agents/[agentName]/projects/[projectName]/files/[...filePath]             595 B         183 kB
├ ƒ /agents/[agentName]/projects/[projectName]/vscode                          595 B         183 kB
├ ƒ /agents/[agentName]/share-target                                           595 B         183 kB
├ ƒ /agents/[agentName]/system-message                                       3.96 kB         257 kB
├ ƒ /agents/[agentName]/textarea                                             9.85 kB         251 kB
├ ƒ /agents/[agentName]/website-integration                                  2.47 kB        1.77 MB
├ ƒ /api/admin-email                                                           595 B         183 kB
├ ƒ /api/admin/backups/books                                                   595 B         183 kB
├ ƒ /api/admin/backups/server                                                  595 B         183 kB
├ ƒ /api/admin/chat-tasks                                                      595 B         183 kB
├ ƒ /api/admin/chat-tasks/[taskId]                                             595 B         183 kB
├ ƒ /api/admin/chat-tasks/[taskId]/cancel                                      595 B         183 kB
├ ƒ /api/admin/chat-tasks/[taskId]/retry                                       595 B         183 kB
├ ƒ /api/admin/chat-tasks/[taskId]/terminal                                    595 B         183 kB
├ ƒ /api/admin/chat-tasks/cancel-all                                           595 B         183 kB
├ ƒ /api/admin/cli-access                                                      595 B         183 kB
├ ƒ /api/admin/database/studio                                                 595 B         183 kB
├ ƒ /api/admin/default-agents/reinstate                                        595 B         183 kB
├ ƒ /api/admin/dns-records/cloudflare                                          595 B         183 kB
├ ƒ /api/admin/environment                                                     595 B         183 kB
├ ƒ /api/admin/error-simulation                                                595 B         183 kB
├ ƒ /api/admin/harness-auth                                                    595 B         183 kB
├ ƒ /api/admin/harness-auth/authentication                                     595 B         183 kB
├ ƒ /api/admin/limits                                                          595 B         183 kB
├ ƒ /api/admin/logs                                                            595 B         183 kB
├ ƒ /api/admin/servers                                                         595 B         183 kB
├ ƒ /api/admin/servers/[serverId]                                              595 B         183 kB
├ ƒ /api/admin/servers/[serverId]/migrate                                      595 B         183 kB
├ ƒ /api/admin/tool-limits                                                     595 B         183 kB
├ ƒ /api/admin/update                                                          595 B         183 kB
├ ƒ /api/admin/update/commits                                                  595 B         183 kB
├ ƒ /api/admin/update/log                                                      595 B         183 kB
├ ƒ /api/admin/update/versions                                                 595 B         183 kB
├ ƒ /api/admin/vps/chat-tasks                                                  595 B         183 kB
├ ƒ /api/admin/vps/chat-tasks/cancel-all                                       595 B         183 kB
├ ƒ /api/agent-folders                                                         595 B         183 kB
├ ƒ /api/agent-folders/[folderId]                                              595 B         183 kB
├ ƒ /api/agent-folders/[folderId]/restore                                      595 B         183 kB
├ ƒ /api/agent-folders/[folderId]/visibility                                   595 B         183 kB
├ ƒ /api/agent-organization                                                    595 B         183 kB
├ ƒ /api/agent-project-runtime-auth                                            595 B         183 kB
├ ƒ /api/agent-project-vscode-auth/[sessionId]                                 595 B         183 kB
├ ƒ /api/agents                                                                595 B         183 kB
├ ƒ /api/agents/[agentName]                                                    595 B         183 kB
├ ƒ /api/agents/[agentName]/clone                                              595 B         183 kB
├ ƒ /api/agents/[agentName]/restore                                            595 B         183 kB
├ ƒ /api/agents/export                                                         595 B         183 kB
├ ƒ /api/agents/import                                                         595 B         183 kB
├ ƒ /api/api-tokens                                                            595 B         183 kB
├ ƒ /api/auth/change-password                                                  595 B         183 kB
├ ƒ /api/auth/login                                                            595 B         183 kB
├ ƒ /api/auth/logout                                                           595 B         183 kB
├ ƒ /api/auth/shibboleth/acs                                                   595 B         183 kB
├ ƒ /api/auth/shibboleth/login                                                 595 B         183 kB
├ ƒ /api/auth/shibboleth/metadata                                              595 B         183 kB
├ ƒ /api/auth/shibboleth/status                                                595 B         183 kB
├ ƒ /api/browser-artifacts/[artifactName]                                      595 B         183 kB
├ ƒ /api/browser-test/act                                                      595 B         183 kB
├ ƒ /api/browser-test/screenshot                                               595 B         183 kB
├ ƒ /api/browser-test/scroll-facebook                                          595 B         183 kB
├ ƒ /api/calendar-oauth/callback                                               595 B         183 kB
├ ƒ /api/calendar-oauth/connect                                                595 B         183 kB
├ ƒ /api/calendar-oauth/refresh                                                595 B         183 kB
├ ƒ /api/calendar-oauth/revoke                                                 595 B         183 kB
├ ƒ /api/calendar-oauth/status                                                 595 B         183 kB
├ ƒ /api/chat                                                                  595 B         183 kB
├ ƒ /api/chat-feedback                                                         595 B         183 kB
├ ƒ /api/chat-feedback/[id]                                                    595 B         183 kB
├ ƒ /api/chat-feedback/export                                                  595 B         183 kB
├ ƒ /api/chat-history                                                          595 B         183 kB
├ ƒ /api/chat-history/[id]                                                     595 B         183 kB
├ ƒ /api/chat-history/export                                                   595 B         183 kB
├ ƒ /api/chat-history/threads                                                  595 B         183 kB
├ ƒ /api/chat-streaming                                                        595 B         183 kB
├ ƒ /api/chat/citation-label                                                   595 B         183 kB
├ ƒ /api/chat/export/pdf                                                       595 B         183 kB
├ ƒ /api/custom-css                                                            595 B         183 kB
├ ƒ /api/custom-js                                                             595 B         183 kB
├ ƒ /api/docs/book-language.md                                                 595 B         183 kB
├ ƒ /api/docs/book-language.pdf                                                595 B         183 kB
├ ƒ /api/docs/book.md                                                          595 B         183 kB
├ ƒ /api/elevenlabs/tts                                                        595 B         183 kB
├ ƒ /api/emails/incoming/sendgrid                                              595 B         183 kB
├ ƒ /api/emails/incoming/stalwart                                              595 B         183 kB
├ ƒ /api/embed.js                                                              595 B         183 kB
├ ƒ /api/error-reports/application                                             595 B         183 kB
├ ƒ /api/federated-agents                                                      595 B         183 kB
├ ƒ /api/github-app/callback                                                   595 B         183 kB
├ ƒ /api/github-app/connect                                                    595 B         183 kB
├ ƒ /api/github-app/status                                                     595 B         183 kB
├ ƒ /api/health                                                                595 B         183 kB
├ ƒ /api/images/[filename]                                                     595 B         183 kB
├ ƒ /api/internal/agent-project-runtimes                                       595 B         183 kB
├ ƒ /api/internal/agent-runner-limits                                          595 B         183 kB
├ ƒ /api/internal/user-chat-jobs/run                                           595 B         183 kB
├ ƒ /api/internal/user-chat-timeouts/run                                       595 B         183 kB
├ ƒ /api/long-running-task                                                     595 B         183 kB
├ ƒ /api/messages                                                              595 B         183 kB
├ ƒ /api/metadata                                                              595 B         183 kB
├ ƒ /api/metadata/export                                                       595 B         183 kB
├ ƒ /api/metadata/import                                                       595 B         183 kB
├ ƒ /api/onboarding/book                                                       595 B         183 kB
├ ƒ /api/onboarding/evaluate                                                   595 B         183 kB
├ ƒ /api/onboarding/test                                                       595 B         183 kB
├ ƒ /api/openai/v1/audio/transcriptions                                        595 B         183 kB
├ ƒ /api/openai/v1/chat/completions                                            595 B         183 kB
├ ƒ /api/openai/v1/models                                                      595 B         183 kB
├ ƒ /api/page-preview/check                                                    595 B         183 kB
├ ƒ /api/page-preview/input                                                    595 B         183 kB
├ ƒ /api/page-preview/screenshot                                               595 B         183 kB
├ ƒ /api/page-preview/state                                                    595 B         183 kB
├ ƒ /api/page-preview/stream                                                   595 B         183 kB
├ ƒ /api/profile                                                               595 B         183 kB
├ ƒ /api/push-subscriptions                                                    595 B         183 kB
├ ƒ /api/scrape                                                                595 B         183 kB
├ ƒ /api/search                                                                595 B         183 kB
├ ƒ /api/send-email                                                            595 B         183 kB
├ ƒ /api/settings/keybindings                                                  595 B         183 kB
├ ƒ /api/settings/notifications                                                595 B         183 kB
├ ƒ /api/settings/theme                                                        595 B         183 kB
├ ƒ /api/spawn-agent                                                           595 B         183 kB
├ ƒ /api/story/export                                                          595 B         183 kB
├ ƒ /api/system/mocked-chats                                                   595 B         183 kB
├ ƒ /api/team-agent-profile                                                    595 B         183 kB
├ ƒ /api/upload                                                                595 B         183 kB
├ ƒ /api/usage                                                                 595 B         183 kB
├ ƒ /api/user-memory                                                           595 B         183 kB
├ ƒ /api/user-memory/[memoryId]                                                595 B         183 kB
├ ƒ /api/user-wallet                                                           595 B         183 kB
├ ƒ /api/user-wallet/[walletId]                                                595 B         183 kB
├ ƒ /api/users                                                                 595 B         183 kB
├ ƒ /api/users/[username]                                                      595 B         183 kB
├ ƒ /api/v1/agents                                                             595 B         183 kB
├ ƒ /api/v1/agents/[agentId]                                                   595 B         183 kB
├ ƒ /api/v1/folders                                                            595 B         183 kB
├ ƒ /api/v1/folders/[folderId]                                                 595 B         183 kB
├ ƒ /api/v1/folders/[folderId]/agents/[agentId]                                595 B         183 kB
├ ƒ /api/v1/instance                                                           595 B         183 kB
├ ƒ /api/v1/me                                                                 595 B         183 kB
├ ƒ /dashboard                                                               1.88 kB         1.5 MB
├ ƒ /docs                                                                    3.02 kB        1.77 MB
├ ƒ /docs/[docId]                                                            3.01 kB        1.77 MB
├ ƒ /embed                                                                      7 kB        1.71 MB
├ ƒ /experiments/story                                                       6.19 kB         259 kB
├ ƒ /humans.txt                                                                595 B         183 kB
├ ƒ /manifest.webmanifest                                                      595 B         183 kB
├ ƒ /openapi.json                                                              595 B         183 kB
├ ƒ /recycle-bin                                                             3.63 kB         311 kB
├ ƒ /restricted                                                                172 B         184 kB
├ ƒ /robots.txt                                                                595 B         183 kB
├ ƒ /s3/[first]/[second]/[hash]/[filename]                                     595 B         183 kB
├ ƒ /search                                                                  6.46 kB         190 kB
├ ƒ /security.txt                                                              595 B         183 kB
├ ƒ /sitemap.xml                                                               595 B         183 kB
├ ƒ /story/[[...story]]                                                        595 B         183 kB
├ ƒ /superadmin/cli-access                                                   3.05 kB         234 kB
├ ƒ /superadmin/database                                                     2.74 kB         230 kB
├ ƒ /superadmin/email-server                                                 2.08 kB         229 kB
├ ƒ /superadmin/environment                                                  5.72 kB         233 kB
├ ƒ /superadmin/harness-auth                                                 6.04 kB         237 kB
├ ƒ /superadmin/internal-s3                                                    595 B         183 kB
├ ƒ /superadmin/logs                                                         3.73 kB         231 kB
├ ƒ /superadmin/resource-monitor                                             7.72 kB         235 kB
├ ƒ /superadmin/servers                                                      22.9 kB         303 kB
├ ƒ /superadmin/task-manager                                                   153 B         268 kB
├ ƒ /superadmin/update                                                       14.6 kB         266 kB
├ ƒ /swagger                                                                 4.17 kB         247 kB
├ ƒ /system/profile                                                          2.87 kB         230 kB
├ ƒ /system/settings                                                         5.71 kB         228 kB
├ ƒ /system/user-memory                                                      5.49 kB         252 kB
├ ƒ /system/user-wallet                                                      9.42 kB         262 kB
├ ƒ /system/utilities                                                        1.64 kB         229 kB
├ ƒ /system/utilities/mocked-chats                                           19.1 kB         265 kB
├ ƒ /system/utilities/mocked-chats/view                                      5.16 kB        1.64 MB
├ ƒ /test/og-image                                                             595 B         183 kB
└ ƒ /test/og-image/opengraph-image                                             595 B         183 kB
+ First Load JS shared by all                                                 182 kB
  ├ chunks/1458-4d35639bf08d49d1.js                                           123 kB
  ├ chunks/87c73c54-3c195070c5cbb22b.js                                      54.1 kB
  └ other shared chunks (total)                                              5.57 kB

Route (pages)                                                                   Size  First Load JS
┌   /_app                                                                        0 B         144 kB
└ ○ /500 (986 ms)                                                            3.87 kB         148 kB
+ First Load JS shared by all                                                 176 kB
  ├ chunks/framework-415b41e54b4434c6.js                                     57.7 kB
  ├ chunks/main-df51e911f90e5917.js                                          82.9 kB
  ├ css/8dea0fe5d6c118a7.css                                                 31.4 kB
  └ other shared chunks (total)                                              3.69 kB

ƒ Middleware                                                                  374 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

   ▲ Next.js 15.4.11
   - Local:        http://localhost:4440
   - Network:      http://10.12.19.179:4440

 ✓ Starting...
 ✓ Ready in 669ms
⚠️ POSTGRES_URL or DATABASE_URL is not defined. Skipping automatic migrations.
Error loading server registry in middleware: DatabaseError: Failed to load server registry from `_Server`.

TypeError: fetch failed
    at n (.next-e2e/server/src/middleware.js:182:19137)
    at async o (.next-e2e/server/src/middleware.js:192:145)
    at async bB (.next-e2e/server/src/middleware.js:17:41799)
    at async hE (.next-e2e/server/src/middleware.js:135:4896)
    at async middleware (.next-e2e/server/src/middleware.js:135:35314)
    at async handler (.next-e2e/server/src/middleware.js:135:36544)
    at async (.next-e2e/server/src/middleware.js:17:37339)
    at async bh (.next-e2e/server/src/middleware.js:17:33733) {

}
Failed to load custom stylesheet CSS Error: Failed to load custom stylesheets: TypeError: fetch failed
    at m (.next-e2e/server/app/api/custom-css/route.js:1:5441)
    at async l (.next-e2e/server/app/api/custom-css/route.js:1:5238)
    at async n (.next-e2e/server/app/api/custom-css/route.js:1:5548)
    at async aD (.next-e2e/server/chunks/7633.js:2146:7648)
    at async aK (.next-e2e/server/chunks/7633.js:2146:11103)
Failed to load custom JavaScript Error: Failed to load custom JavaScript: TypeError: fetch failed
    at q (.next-e2e/server/app/api/custom-js/route.js:45:846)
    at async p (.next-e2e/server/app/api/custom-js/route.js:45:647)
    at async r (.next-e2e/server/app/api/custom-js/route.js:45:952)
    at async s (.next-e2e/server/app/api/custom-js/route.js:45:1041)
    at async aD (.next-e2e/server/chunks/7633.js:2146:7648)
    at async aK (.next-e2e/server/chunks/7633.js:2146:11103)
Prerendered home page and saved to /Users/hejny/work/promptbook/apps/agents-server/.next-e2e/prerendered/home.html
[WebServer] [mock-supabase] listening on http://127.0.0.1:54321
[WebServer]
[WebServer] > start
[WebServer] > next start -p 4440
[WebServer]
[WebServer]    ▲ Next.js 15.4.11
[WebServer]    - Local:        http://localhost:4440
[WebServer]    - Network:      http://10.12.19.179:4440
[WebServer]
[WebServer]  ✓ Starting...
[WebServer]  ✓ Ready in 515ms
[WebServer] ⚠️ POSTGRES_URL or DATABASE_URL is not defined. Skipping automatic migrations.

Running 19 tests using 1 worker

  ✓   1 …Server API authorization › returns unauthorized metadata API response for anonymous users (238ms)
  ✓   2 …rization › allows admin metadata API access and blocks admin password changes through API (858ms)
[WebServer] Failed to generate metadata for agent get-started Error [NotFoundError]: Agent with name or id "get-started" not found
[WebServer]     at o.getAgentPermanentId (.next-e2e/server/chunks/3396.js:16:292)
[WebServer]     at async p (.next-e2e/server/app/agents/[agentName]/api/calendar-connections/route.js:112:18974)
[WebServer]     at async i (.next-e2e/server/chunks/3969.js:33:5841)
[WebServer]     at async (.next-e2e/server/chunks/3969.js:33:4404)
[WebServer]     at async (.next-e2e/server/chunks/4092.js:5:1257)
[WebServer]     at async u (.next-e2e/server/chunks/8374.js:1:1700)
[WebServer] Failed to generate metadata for agent manifest Error [NotFoundError]: Agent with name or id "manifest" not found
[WebServer]     at o.getAgentPermanentId (.next-e2e/server/chunks/3396.js:16:292)
[WebServer]     at async p (.next-e2e/server/app/agents/[agentName]/api/calendar-connections/route.js:112:18974)
[WebServer]     at async i (.next-e2e/server/chunks/3969.js:33:5841)
[WebServer]     at async (.next-e2e/server/chunks/3969.js:33:4404)
[WebServer]     at async (.next-e2e/server/chunks/4092.js:5:1257)
[WebServer]     at async u (.next-e2e/server/chunks/8374.js:1:1700)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
      3 …age on the profile page without a temporary hello fallback, even while profile loading is delayed
[WebServer] Failed to generate metadata for agent get-started Error [NotFoundError]: Agent with name or id "get-started" not found
[WebServer]     at o.getAgentPermanentId (.next-e2e/server/chunks/3396.js:16:292)
[WebServer]     at async p (.next-e2e/server/app/agents/[agentName]/api/calendar-connections/route.js:112:18974)
[WebServer]     at async i (.next-e2e/server/chunks/3969.js:33:5841)
[WebServer]     at async (.next-e2e/server/chunks/3969.js:33:4404)
[WebServer]     at async (.next-e2e/server/chunks/4092.js:5:1257)
[WebServer]     at async u (.next-e2e/server/chunks/8374.js:1:1700)
[WebServer] Failed to generate metadata for agent manifest Error [NotFoundError]: Agent with name or id "manifest" not found
[WebServer]     at o.getAgentPermanentId (.next-e2e/server/chunks/3396.js:16:292)
[WebServer]     at async p (.next-e2e/server/app/agents/[agentName]/api/calendar-connections/route.js:112:18974)
[WebServer]     at async i (.next-e2e/server/chunks/3969.js:33:5841)
[WebServer]     at async (.next-e2e/server/chunks/3969.js:33:4404)
[WebServer]     at async (.next-e2e/server/chunks/4092.js:5:1257)
[WebServer]     at async u (.next-e2e/server/chunks/8374.js:1:1700)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer] [pre-index] scheduled {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   triggerReason: 'AGENT_CREATED',
[WebServer]   runAfter: '2026-08-07T19:22:15.909Z',
[WebServer]   mode: 'insert',
[WebServer]   counters: { scheduled: 1, started: 0, skipped: 0, completed: 0, failed: 0 }
[WebServer] }
  ✘   3 …he profile page without a temporary hello fallback, even while profile loading is delayed (634ms)
      4 … › shows the first user message immediately as sending when starting a chat from the profile page
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘   4 … the first user message immediately as sending when starting a chat from the profile page (10.8s)
      5 …navigation › processes two rapid sends on a freshly created chat without a chat-not-found failure
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘   5 …on › processes two rapid sends on a freshly created chat without a chat-not-found failure (10.7s)
      6 …t history navigation › navigates from the profile page when opening an existing chat preview card
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer] [pre-index] started {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   jobId: 1,
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   triggerReason: 'AGENT_CREATED',
[WebServer]   retryCount: 0,
[WebServer]   counters: { scheduled: 1, started: 1, skipped: 0, completed: 0, failed: 0 }
[WebServer] }
[WebServer] [pre-index] failed {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   jobId: 1,
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   retryCount: 1,
[WebServer]   nextRetryAt: '2026-08-07T19:22:46.050Z',
[WebServer]   error: 'Cyclic `FROM` reference detected while resolving agent source.\n' +
[WebServer]     '\n' +
[WebServer]     'Resolution chain:\n' +
[WebServer]     '- `http://127.0.0.1:4440/agents/adam`\n' +
[WebServer]     '- `http://127.0.0.1:4440/agents/adam`',
[WebServer]   counters: { scheduled: 1, started: 1, skipped: 0, completed: 0, failed: 1 }
[WebServer] }
[WebServer] [pre-index] started {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   jobId: 1,
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   triggerReason: 'AGENT_CREATED',
[WebServer]   retryCount: 1,
[WebServer]   counters: { scheduled: 1, started: 2, skipped: 0, completed: 0, failed: 1 }
[WebServer] }
[WebServer] [pre-index] failed {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   jobId: 1,
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   retryCount: 2,
[WebServer]   nextRetryAt: '2026-08-07T19:23:16.073Z',
[WebServer]   error: 'Cyclic `FROM` reference detected while resolving agent source.\n' +
[WebServer]     '\n' +
[WebServer]     'Resolution chain:\n' +
[WebServer]     '- `http://127.0.0.1:4440/agents/adam`\n' +
[WebServer]     '- `http://127.0.0.1:4440/agents/adam`',
[WebServer]   counters: { scheduled: 1, started: 2, skipped: 0, completed: 0, failed: 2 }
[WebServer] }
  ✘   6 …y navigation › navigates from the profile page when opening an existing chat preview card (10.7s)
      7 …er chat history navigation › navigates from the profile page for quick buttons and composer sends
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘   7 …history navigation › navigates from the profile page for quick buttons and composer sends (10.8s)
      8 …9 › Agents Server chat history navigation › sends quick-button prompts from the durable chat page
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘   8 …ts Server chat history navigation › sends quick-button prompts from the durable chat page (10.8s)
      9 …s the newly created chat selected after a delayed stale refresh and does not open a native dialog
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘   9 …wly created chat selected after a delayed stale refresh and does not open a native dialog (10.7s)
     10 …istory navigation › creates a fresh chat when the durable route is opened directly with ?chat=new
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘  10 …avigation › creates a fresh chat when the durable route is opened directly with ?chat=new (11.5s)
     11 …igation › keeps the last clicked chat selected when an earlier navigation response finishes later
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘  11 …› keeps the last clicked chat selected when an earlier navigation response finishes later (10.9s)
     12 … agent-view navigation › navigates between profile and chat from the active agent breadcrumb menu
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer] [pre-index] started {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   jobId: 1,
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   triggerReason: 'AGENT_CREATED',
[WebServer]   retryCount: 2,
[WebServer]   counters: { scheduled: 1, started: 3, skipped: 0, completed: 0, failed: 2 }
[WebServer] }
[WebServer] [pre-index] failed {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   jobId: 1,
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   retryCount: 3,
[WebServer]   nextRetryAt: '2026-08-07T19:25:16.199Z',
[WebServer]   error: 'Cyclic `FROM` reference detected while resolving agent source.\n' +
[WebServer]     '\n' +
[WebServer]     'Resolution chain:\n' +
[WebServer]     '- `http://127.0.0.1:4440/agents/adam`\n' +
[WebServer]     '- `http://127.0.0.1:4440/agents/adam`',
[WebServer]   counters: { scheduled: 1, started: 3, skipped: 0, completed: 0, failed: 3 }
[WebServer] }
[WebServer] [pre-index] started {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   jobId: 1,
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   triggerReason: 'AGENT_CREATED',
[WebServer]   retryCount: 3,
[WebServer]   counters: { scheduled: 1, started: 4, skipped: 0, completed: 0, failed: 3 }
[WebServer] }
[WebServer] [pre-index] failed {
[WebServer]   tablePrefix: '',
[WebServer]   agentPermanentId: 'AdbZtmYcKxj6A8',
[WebServer]   jobId: 1,
[WebServer]   fingerprint: 'fa9b4006fe70d0e46e6400f08c4122c3c9c01137d93727c893a5fbb56da8ddb0',
[WebServer]   retryCount: 4,
[WebServer]   nextRetryAt: '2026-08-07T19:27:16.218Z',
[WebServer]   error: 'Cyclic `FROM` reference detected while resolving agent source.\n' +
[WebServer]     '\n' +
[WebServer]     'Resolution chain:\n' +
[WebServer]     '- `http://127.0.0.1:4440/agents/adam`\n' +
[WebServer]     '- `http://127.0.0.1:4440/agents/adam`',
[WebServer]   counters: { scheduled: 1, started: 4, skipped: 0, completed: 0, failed: 4 }
[WebServer] }
  ✘  12 …iew navigation › navigates between profile and chat from the active agent breadcrumb menu (10.8s)
  ✓  13 …header homepage navigation › navigates to the homepage from the desktop header brand link (862ms)
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
  ✓  14 …epage navigation › navigates to the homepage from the compact header brand link on mobile (598ms)
     15 …avigation › navigates to the homepage from the desktop header brand link on an agent profile page
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘  15 …n › navigates to the homepage from the desktop header brand link on an agent profile page (10.7s)
     16 …avigation › navigates to the homepage from the mobile drawer server link on an agent profile page
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘  16 …n › navigates to the homepage from the mobile drawer server link on an agent profile page (10.8s)
  ✓  17 …header homepage navigation › navigates to the homepage from the mobile drawer server link (625ms)
     18 …i.spec.ts:44:9 › Agents Server management API › supports OpenAPI docs and owner-scoped CRUD flows
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘  18 …s:44:9 › Agents Server management API › supports OpenAPI docs and owner-scoped CRUD flows (10.7s)
     19 …c.ts:76:9 › new agent redirect › opens the newly created agent chat immediately from the homepage
[WebServer] Failed to generate metadata for agent get-started Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Failed to generate metadata for agent manifest Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066)
[WebServer] Authentication attempt succeeded { purpose: 'login', username: 'admin', requestIp: '::ffff:127.0.0.1' }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
[WebServer]  ⨯ Error [ParseError]: Cyclic `FROM` reference detected while resolving agent source.
[WebServer]
[WebServer] Resolution chain:
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer] - `http://127.0.0.1:4440/agents/adam`
[WebServer]     at <unknown> (.next-e2e/server/chunks/2540.js:22:409)
[WebServer]     at t (.next-e2e/server/chunks/2540.js:27:17)
[WebServer]     at u (.next-e2e/server/chunks/2540.js:33:96)
[WebServer]     at async y (.next-e2e/server/chunks/2540.js:45:1066) {
[WebServer]   digest: '3350563155'
[WebServer] }
  ✘  19 …9 › new agent redirect › opens the newly created agent chat immediately from the homepage (11.4s)


  1) [chromium] › tests/e2e/chat-history-navigation.spec.ts:70:9 › Agents Server chat history navigation › renders the configured initial message on the profile page without a temporary hello fallback, even while profile loading is delayed

    Error: page.evaluate: Error: Failed to create test agent: 500
        at eval (eval at evaluate (:311:30), <anonymous>:18:13)
        at async <anonymous>:337:30
        at eval (eval at evaluate (:311:30), <anonymous>:18:13)
        at async <anonymous>:337:30
        at Object.createTestAgent (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/AgentManagementApi.ts:135:17)
        at createChatHistoryTestAgent (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:53:31)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:74:23

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-48098--profile-loading-is-delayed-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-48098--profile-loading-is-delayed-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-48098--profile-loading-is-delayed-chromium/error-context.md

  2) [chromium] › tests/e2e/chat-history-navigation.spec.ts:102:9 › Agents Server chat history navigation › shows the first user message immediately as sending when starting a chat from the profile page

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:67:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-90997--chat-from-the-profile-page-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-90997--chat-from-the-profile-page-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-90997--chat-from-the-profile-page-chromium/error-context.md

  3) [chromium] › tests/e2e/chat-history-navigation.spec.ts:139:9 › Agents Server chat history navigation › processes two rapid sends on a freshly created chat without a chat-not-found failure

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:67:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-34a78-ut-a-chat-not-found-failure-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-34a78-ut-a-chat-not-found-failure-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-34a78-ut-a-chat-not-found-failure-chromium/error-context.md

  4) [chromium] › tests/e2e/chat-history-navigation.spec.ts:201:9 › Agents Server chat history navigation › navigates from the profile page when opening an existing chat preview card

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:67:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-6000a--existing-chat-preview-card-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-6000a--existing-chat-preview-card-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-6000a--existing-chat-preview-card-chromium/error-context.md

  5) [chromium] › tests/e2e/chat-history-navigation.spec.ts:223:9 › Agents Server chat history navigation › navigates from the profile page for quick buttons and composer sends

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:67:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-22a7f--buttons-and-composer-sends-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-22a7f--buttons-and-composer-sends-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-22a7f--buttons-and-composer-sends-chromium/error-context.md

  6) [chromium] › tests/e2e/chat-history-navigation.spec.ts:289:9 › Agents Server chat history navigation › sends quick-button prompts from the durable chat page

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:67:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-dad4e--from-the-durable-chat-page-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-dad4e--from-the-durable-chat-page-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-dad4e--from-the-durable-chat-page-chromium/error-context.md

  7) [chromium] › tests/e2e/chat-history-navigation.spec.ts:325:9 › Agents Server chat history navigation › keeps the newly created chat selected after a delayed stale refresh and does not open a native dialog

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:67:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-2355b-es-not-open-a-native-dialog-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-2355b-es-not-open-a-native-dialog-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-2355b-es-not-open-a-native-dialog-chromium/error-context.md

  8) [chromium] › tests/e2e/chat-history-navigation.spec.ts:388:9 › Agents Server chat history navigation › creates a fresh chat when the durable route is opened directly with ?chat=new

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:67:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-2c27b-ened-directly-with-chat-new-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-2c27b-ened-directly-with-chat-new-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-2c27b-ened-directly-with-chat-new-chromium/error-context.md

  9) [chromium] › tests/e2e/chat-history-navigation.spec.ts:411:9 › Agents Server chat history navigation › keeps the last clicked chat selected when an earlier navigation response finishes later

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/chat-history-navigation.spec.ts:67:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-af217-ion-response-finishes-later-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/chat-history-navigation-Ag-af217-ion-response-finishes-later-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/chat-history-navigation-Ag-af217-ion-response-finishes-later-chromium/error-context.md

  10) [chromium] › tests/e2e/header-agent-view-navigation.spec.ts:26:9 › header agent-view navigation › navigates between profile and chat from the active agent breadcrumb menu

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/header-agent-view-navigation.spec.ts:28:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/header-agent-view-navigati-c4b41-ctive-agent-breadcrumb-menu-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/header-agent-view-navigati-c4b41-ctive-agent-breadcrumb-menu-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/header-agent-view-navigati-c4b41-ctive-agent-breadcrumb-menu-chromium/error-context.md

  11) [chromium] › tests/e2e/header-homepage-navigation.spec.ts:79:9 › header homepage navigation › navigates to the homepage from the desktop header brand link on an agent profile page

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/header-homepage-navigation.spec.ts:81:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/header-homepage-navigation-825c5-nk-on-an-agent-profile-page-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/header-homepage-navigation-825c5-nk-on-an-agent-profile-page-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/header-homepage-navigation-825c5-nk-on-an-agent-profile-page-chromium/error-context.md

  12) [chromium] › tests/e2e/header-homepage-navigation.spec.ts:98:9 › header homepage navigation › navigates to the homepage from the mobile drawer server link on an agent profile page

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/header-homepage-navigation.spec.ts:101:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/header-homepage-navigation-ae63d-nk-on-an-agent-profile-page-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/header-homepage-navigation-ae63d-nk-on-an-agent-profile-page-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/header-homepage-navigation-ae63d-nk-on-an-agent-profile-page-chromium/error-context.md

  13) [chromium] › tests/e2e/management-api.spec.ts:44:9 › Agents Server management API › supports OpenAPI docs and owner-scoped CRUD flows

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/management-api.spec.ts:46:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/management-api-Agents-Serv-4a68a-and-owner-scoped-CRUD-flows-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/management-api-Agents-Serv-4a68a-and-owner-scoped-CRUD-flows-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/management-api-Agents-Serv-4a68a-and-owner-scoped-CRUD-flows-chromium/error-context.md

  14) [chromium] › tests/e2e/new-agent-redirect.spec.ts:76:9 › new agent redirect › opens the newly created agent chat immediately from the homepage

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('button', { name: /admin/i })
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" with timeout 10000ms
      - waiting for getByRole('button', { name: /admin/i })


       at support/auth.ts:82

      80 |     }
      81 |
    > 82 |     await expect(desktopAdminButton).toBeVisible();
         |                                      ^
      83 | }
      84 |
      85 | /**
        at loginAsAdmin (/Users/hejny/work/promptbook/apps/agents-server/tests/e2e/support/auth.ts:82:38)
        at /Users/hejny/work/promptbook/apps/agents-server/tests/e2e/new-agent-redirect.spec.ts:78:9

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/new-agent-redirect-new-age-25d0a-mediately-from-the-homepage-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    ../../other/integration-tests/videos/new-agent-redirect-new-age-25d0a-mediately-from-the-homepage-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: ../../other/integration-tests/videos/new-agent-redirect-new-age-25d0a-mediately-from-the-homepage-chromium/error-context.md

  14 failed
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:70:9 › Agents Server chat history navigation › renders the configured initial message on the profile page without a temporary hello fallback, even while profile loading is delayed
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:102:9 › Agents Server chat history navigation › shows the first user message immediately as sending when starting a chat from the profile page
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:139:9 › Agents Server chat history navigation › processes two rapid sends on a freshly created chat without a chat-not-found failure
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:201:9 › Agents Server chat history navigation › navigates from the profile page when opening an existing chat preview card
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:223:9 › Agents Server chat history navigation › navigates from the profile page for quick buttons and composer sends
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:289:9 › Agents Server chat history navigation › sends quick-button prompts from the durable chat page
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:325:9 › Agents Server chat history navigation › keeps the newly created chat selected after a delayed stale refresh and does not open a native dialog
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:388:9 › Agents Server chat history navigation › creates a fresh chat when the durable route is opened directly with ?chat=new
    [chromium] › tests/e2e/chat-history-navigation.spec.ts:411:9 › Agents Server chat history navigation › keeps the last clicked chat selected when an earlier navigation response finishes later
    [chromium] › tests/e2e/header-agent-view-navigation.spec.ts:26:9 › header agent-view navigation › navigates between profile and chat from the active agent breadcrumb menu
    [chromium] › tests/e2e/header-homepage-navigation.spec.ts:79:9 › header homepage navigation › navigates to the homepage from the desktop header brand link on an agent profile page
    [chromium] › tests/e2e/header-homepage-navigation.spec.ts:98:9 › header homepage navigation › navigates to the homepage from the mobile drawer server link on an agent profile page
    [chromium] › tests/e2e/management-api.spec.ts:44:9 › Agents Server management API › supports OpenAPI docs and owner-scoped CRUD flows
    [chromium] › tests/e2e/new-agent-redirect.spec.ts:76:9 › new agent redirect › opens the newly created agent chat immediately from the homepage
  5 passed (2.5m)
npm run test-app-agents-server  140.62s user 31.19s system 67% cpu 4:13.70 total
hejny@Pavols-MacBook-Air promptbook %
```
