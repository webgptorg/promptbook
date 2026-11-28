[x]

[✨🔒] Fix Agent server infinite redirects

```log
[🐱‍🚀] Creating NEW execution tools
 ✓ Compiled in 5.9s (728 modules)
 ✓ Compiled in 4.2s (714 modules)
 ○ Compiling /[agentName]/[...rest] ...
 GET / 200 in 59301ms
 ✓ Compiled /api/users in 36.2s (3671 modules)
 GET /api/users 200 in 28404ms
[Error: kill EPERM] { errno: -4048, code: 'EPERM', syscall: 'kill' }
 ⨯ uncaughtException: [Error: kill EPERM] { errno: -4048, code: 'EPERM', syscall: 'kill' }
 ⨯ uncaughtException:  [Error: kill EPERM] { errno: -4048, code: 'EPERM', syscall: 'kill' }
 GET /.well-known/appspecific/com.chrome.devtools.json 307 in 43384ms
 GET /agents/.well-known/appspecific/com.chrome.devtools.json 307 in 613ms
 GET /agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 594ms
 GET /agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 631ms
 GET /agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 637ms
 GET /agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 656ms
 GET /agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 603ms
 GET /agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 714ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 728ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 643ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 804ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 716ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 936ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 581ms GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 753ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 645ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 735ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 617ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 658ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 608ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 606ms
```

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
