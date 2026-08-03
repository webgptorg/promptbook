[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation $11.10 4 hours; Testing 22 minutes

[✨📭] Optimize and speed up the `npx ts-node ./scripts/generate-packages/generate-packages.ts`

```console

me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ npx ts-node ./scripts/generate-packages/generate-packages.ts
📦  Generating packages
0️⃣  Prepare the needed information about the packages
Promptbook version 0.113.1-0
1️⃣  Generate entry file for each package
Generated index file ./src/_packages/anthropic-claude.index.ts
Generated index file ./src/_packages/azure-openai.index.ts
Generated index file ./src/_packages/browser.index.ts
Generated index file ./src/_packages/cli.index.ts
Generated index file ./src/_packages/color.index.ts
Generated index file ./src/_packages/components.index.ts
Generated index file ./src/_packages/core.index.ts
Generated index file ./src/_packages/deepseek.index.ts
Generated index file ./src/_packages/documents.index.ts
Generated index file ./src/_packages/editable.index.ts
Generated index file ./src/_packages/fake-llm.index.ts
Generated index file ./src/_packages/google.index.ts
Generated index file ./src/_packages/javascript.index.ts
Generated index file ./src/_packages/legacy-documents.index.ts
Generated index file ./src/_packages/markdown-utils.index.ts
Generated index file ./src/_packages/markitdown.index.ts
Generated index file ./src/_packages/node.index.ts
Generated index file ./src/_packages/ollama.index.ts
Generated index file ./src/_packages/openai.index.ts
Generated index file ./src/_packages/pdf.index.ts
Generated index file ./src/_packages/remote-client.index.ts
Generated index file ./src/_packages/remote-server.index.ts
Generated index file ./src/_packages/templates.index.ts
Generated index file ./src/_packages/types.index.ts
Generated index file ./src/_packages/utils.index.ts
Generated index file ./src/_packages/vercel.index.ts
Generated index file ./src/_packages/website-crawler.index.ts
Generated index file ./src/_packages/wizard.index.ts
2️⃣  Generate package.json, README and other crucial files for each package
3️⃣  Cleanup build directories for each package
4️⃣  Generate bundle for each package
--- @promptbook/anthropic-claude ---
📦 Building package 1/28: @promptbook/anthropic-claude
C:\Users\me\work\ai\promptbook C:\Users\me\.nvm\versions\node\v22.11.0\bin\node.exe --max-old-space-size=32000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js
Building @promptbook/anthropic-claude v0.113.1-0 (pre-release)

./src/_packages/anthropic-claude.index.ts → ./packages/anthropic-claude/esm/index.es.js, ./packages/anthropic-claude/umd/index.umd.js...
::group::Node Used resources
🕑 Building 1 minutes
🧠 Memory: rss=129.8MB heapUsed=266.2MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 28ms
📦 Active bundle: @promptbook/anthropic-claude
🆔 Rollup PID: 12008
🔇 Time since last Rollup output: 54s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 2 minutes
🧠 Memory: rss=15.4MB heapUsed=266.2MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: -3ms
📦 Active bundle: @promptbook/anthropic-claude
🆔 Rollup PID: 12008
🔇 Time since last Rollup output: 1m 54s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 3 minutes
🧠 Memory: rss=15.5MB heapUsed=266.2MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 83ms
📦 Active bundle: @promptbook/anthropic-claude
🆔 Rollup PID: 12008
🔇 Time since last Rollup output: 2m 55s
🧾 Rollup state: Received stderr output
::endgroup::
(!) Missing global variable names
Use output.globals to specify browser global variable names corresponding to external modules
spacetrim (guessing 'spacetrim')
@anthropic-ai/sdk (guessing 'Anthropic')
bottleneck (guessing 'Bottleneck')
colors (guessing 'colors')
crypto-js (guessing 'CryptoJS')
socket.io-client (guessing 'socket_ioClient')
(!) Circular dependency
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
created ./packages/anthropic-claude/esm/index.es.js, ./packages/anthropic-claude/umd/index.umd.js in 3m 34.2s
✅ Package @promptbook/anthropic-claude built successfully
--- @promptbook/azure-openai ---
📦 Building package 2/28: @promptbook/azure-openai
C:\Users\me\work\ai\promptbook C:\Users\me\.nvm\versions\node\v22.11.0\bin\node.exe --max-old-space-size=32000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js
Building @promptbook/azure-openai v0.113.1-0 (pre-release)

./src/_packages/azure-openai.index.ts → ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js...
::group::Node Used resources
🕑 Building 4 minutes
🧠 Memory: rss=22.6MB heapUsed=265.6MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 40ms
📦 Active bundle: @promptbook/azure-openai
🆔 Rollup PID: 21164
🔇 Time since last Rollup output: 12s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 5 minutes
🧠 Memory: rss=22.6MB heapUsed=265.6MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
📦 Active bundle: @promptbook/azure-openai
🆔 Rollup PID: 21164
🔇 Time since last Rollup output: 1m 12s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 6 minutes
🧠 Memory: rss=22.6MB heapUsed=265.6MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: -22ms
📦 Active bundle: @promptbook/azure-openai
🆔 Rollup PID: 21164
🔇 Time since last Rollup output: 2m 12s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 7 minutes
🧠 Memory: rss=13.4MB heapUsed=265.6MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
📦 Active bundle: @promptbook/azure-openai
🆔 Rollup PID: 21164
🔇 Time since last Rollup output: 3m 12s
🧾 Rollup state: Received stderr output
::endgroup::
(!) Missing global variable names
Use output.globals to specify browser global variable names corresponding to external modules
@azure/openai (guessing 'openai')
bottleneck (guessing 'Bottleneck')
colors (guessing 'colors')
spacetrim (guessing 'spacetrim')
crypto-js (guessing 'CryptoJS')
(!) Circular dependency
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
created ./packages/azure-openai/esm/index.es.js, ./packages/azure-openai/umd/index.umd.js in 3m 56.2s
✅ Package @promptbook/azure-openai built successfully
--- @promptbook/browser ---
📦 Building package 3/28: @promptbook/browser
C:\Users\me\work\ai\promptbook C:\Users\me\.nvm\versions\node\v22.11.0\bin\node.exe --max-old-space-size=32000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js
Building @promptbook/browser v0.113.1-0 (pre-release)

./src/_packages/browser.index.ts → ./packages/browser/esm/index.es.js, ./packages/browser/umd/index.umd.js...
::group::Node Used resources
🕑 Building 8 minutes
🧠 Memory: rss=16.6MB heapUsed=265.8MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 11ms
📦 Active bundle: @promptbook/browser
🆔 Rollup PID: 53032
🔇 Time since last Rollup output: 12s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 9 minutes
🧠 Memory: rss=16.7MB heapUsed=265.8MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 27ms
📦 Active bundle: @promptbook/browser
🆔 Rollup PID: 53032
🔇 Time since last Rollup output: 1m 12s
🧾 Rollup state: Received stderr output
::endgroup::
(!) Missing shims for Node.js built-ins
Creating a browser bundle that depends on "path". You might need to include https://github.com/FredKSchott/rollup-plugin-polyfill-node
::group::Node Used resources
🕑 Building 10 minutes
🧠 Memory: rss=16.8MB heapUsed=265.8MB heapTotal=272.6MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 47ms
📦 Active bundle: @promptbook/browser
🆔 Rollup PID: 53032
🔇 Time since last Rollup output: 55s
🧾 Rollup state: Received stderr output
::endgroup::
(!) Missing global variable names
Use output.globals to specify browser global variable names corresponding to external modules
spacetrim (guessing 'spacetrim')
destroyable (guessing 'destroyable')
rxjs (guessing 'rxjs')
crypto-js (guessing 'CryptoJS')
crypto-js/enc-hex (guessing 'hexEncoder')
path (guessing 'path')
moment (guessing 'moment')
mime-types (guessing 'mimeTypes')
waitasecond (guessing 'waitasecond')
crypto-js/sha256 (guessing 'sha256')
papaparse (guessing 'papaparse')
@openai/agents (guessing 'agents')
colors (guessing 'colors')
bottleneck (guessing 'Bottleneck')
openai (guessing 'OpenAI')

...

🕑 Building 88 minutes
🧠 Memory: rss=11.5MB heapUsed=266.2MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 18ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 34m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 89 minutes
🧠 Memory: rss=11.5MB heapUsed=266.3MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 47ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 35m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 90 minutes
🧠 Memory: rss=11.5MB heapUsed=266.3MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 48ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 36m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 91 minutes
🧠 Memory: rss=11.6MB heapUsed=266.3MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 24ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 37m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 92 minutes
🧠 Memory: rss=9.2MB heapUsed=266.3MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 28ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 38m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 93 minutes
🧠 Memory: rss=9.2MB heapUsed=266.3MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 24ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 39m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 94 minutes
🧠 Memory: rss=9.2MB heapUsed=266.3MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 20ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 40m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 95 minutes
🧠 Memory: rss=10.3MB heapUsed=266.4MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 32ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 41m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 96 minutes
🧠 Memory: rss=10.3MB heapUsed=266.4MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 16ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 42m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 97 minutes
🧠 Memory: rss=9.5MB heapUsed=266.4MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 19ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 43m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 98 minutes
🧠 Memory: rss=9.5MB heapUsed=266.4MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 40ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 44m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 99 minutes
🧠 Memory: rss=9.5MB heapUsed=266.4MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 8ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 45m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 100 minutes
🧠 Memory: rss=9.5MB heapUsed=266.4MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 26ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 46m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 101 minutes
🧠 Memory: rss=9.6MB heapUsed=266.4MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 46ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 47m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 102 minutes
🧠 Memory: rss=10.3MB heapUsed=266.5MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 45ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 48m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 103 minutes
🧠 Memory: rss=10.3MB heapUsed=266.5MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 10ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 49m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 104 minutes
🧠 Memory: rss=10.4MB heapUsed=266.5MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 42ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 50m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 105 minutes
🧠 Memory: rss=10.4MB heapUsed=266.5MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 14ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 51m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 106 minutes
🧠 Memory: rss=10.4MB heapUsed=266.5MB heapTotal=272.9MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 17ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 52m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 107 minutes
🧠 Memory: rss=15.3MB heapUsed=265.8MB heapTotal=273.1MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 40ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 53m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 108 minutes
🧠 Memory: rss=9.5MB heapUsed=265.8MB heapTotal=273.1MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 35ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 54m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 109 minutes
🧠 Memory: rss=9.6MB heapUsed=265.8MB heapTotal=273.1MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 20ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 55m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 110 minutes
🧠 Memory: rss=9.6MB heapUsed=265.8MB heapTotal=273.1MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 35ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 56m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 111 minutes
🧠 Memory: rss=9.6MB heapUsed=265.8MB heapTotal=273.1MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 17ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 57m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 112 minutes
🧠 Memory: rss=9.6MB heapUsed=265.8MB heapTotal=273.1MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 12ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 58m 41s
🧾 Rollup state: Received stderr output
::endgroup::
::group::Node Used resources
🕑 Building 113 minutes
🧠 Memory: rss=3.8MB heapUsed=265.8MB heapTotal=273.1MB
⚙️ CPU load (1m): 0.00
⌛ Event loop lag: 100ms
📦 Active bundle: @promptbook/openai
🆔 Rollup PID: 37252
🔇 Time since last Rollup output: 59m 42s
🧾 Rollup state: Received stderr output
::endgroup::
Package bundling looks stuck.

Rollup produced no output for 1h 0m 3s.
Package: `@promptbook/openai`
Package basename: `openai`
PID: 37252
Build runtime: 1h 3m 28s
Time since last output: 1h 0m 3s
Last lifecycle event: Rollup produced no output for 1h 0m 3s.
Rollup has not reported the final bundle creation line yet.
C:\Users\me\work\ai\promptbook\scripts\generate-packages\buildGeneratedPackageBundles.ts:338
            hangError = new UnexpectedError(
                        ^
UnexpectedError: Package bundling got stuck for `@promptbook/openai`.

Rollup produced no output for 1h 0m 3s.
Package: `@promptbook/openai`
Package basename: `openai`
PID: 37252
Build runtime: 1h 3m 28s
Time since last output: 1h 0m 3s
Last lifecycle event: Rollup produced no output for 1h 0m 3s.
Rollup has not reported the final bundle creation line yet.

The Rollup subprocess was terminated to prevent waiting forever.
```


- Now it takes extremely and unacceptably long amount of time to build the packages and generate the packages for NPM
- Sometimes it just doesn't end and fails with timeout. 
- But do not degrade the quality of the build or reduce functionality of the generated packages.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

