[ ] !

[✨🥈] Fix publishing

```bash
fs/promises (guessing 'promises')
child_process (guessing 'child_process')
waitasecond (guessing 'waitasecond')
crypto-js (guessing 'CryptoJS')
crypto-js/enc-hex (guessing 'hexEncoder')
path (guessing 'path')
@mozilla/readability (guessing 'readability')
jsdom (guessing 'jsdom')
showdown (guessing 'showdown')
dotenv (guessing 'dotenv')
crypto-js/sha256 (guessing 'sha256')
jszip (guessing 'JSZip')
rxjs (guessing 'rxjs')
moment (guessing 'moment')
mime-types (guessing 'mimeTypes')
papaparse (guessing 'papaparse')
@openai/agents (guessing 'agents')
openai (guessing 'OpenAI')
(!) Circular dependencies
src/utils/take/take.ts -> src/utils/take/classes/TakeChain.ts -> src/utils/take/take.ts
src/execution/createPipelineExecutor/00-createPipelineExecutor.ts -> src/execution/createPipelineExecutor/10-executePipeline.ts -> src/prepare/preparePipeline.ts -> src/execution/createPipelineExecutor/00-createPipelineExecutor.ts
src/execution/createPipelineExecutor/00-createPipelineExecutor.ts -> src/execution/createPipelineExecutor/10-executePipeline.ts -> src/prepare/preparePipeline.ts -> src/personas/preparePersona.ts -> src/execution/createPipelineExecutor/00-createPipelineExecutor.ts
src/book-2.0/agent-source/createAgentModelRequirements.ts -> src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.ts -> src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments/augmentAgentModelRequirementsFromSource.ts -> src/book-2.0/agent-source/createAgentModelRequirements.ts
(!) Unresolved dependencies
https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
@openai/agents (imported by src/llm-providers/openai/OpenAiAgentKitExecutionTools.ts, src/llm-providers/openai/OpenAiAgentKitExecutionToolsToolBuilder.ts)
(!) Use of eval is strongly discouraged
https://rollupjs.org/guide/en/#avoiding-eval
src/scripting/javascript/utils/extractVariablesFromJavascript.ts
19:         for (let i = 0; i < LOOP_LIMIT; i++)
20:             try {
21:                 eval(script); // <- TODO: Use `JavascriptExecutionTools.execute` here
                    ^
22:             }
23:             catch (error) {
src/scripting/javascript/JavascriptEvalExecutionTools.ts
160:         let result;
161:         try {
162:             result = await eval(statementToEvaluate);
                                ^
163:             if (this.options.isVerbose) {
164:                 console.info(_spaceTrim((block) => `
created ./packages/wizard/esm/index.es.js, ./packages/wizard/umd/index.umd.js in 38s
✅ Package @promptbook/wizard built successfully
✅✅ All packages built successfully
5️⃣  Postprocess the generated bundle
6️⃣  Add dependencies for each package
7️⃣  Copy agents-server app to CLI package
Copying ./apps/agents-server to ./packages/cli/apps/agents-server
Copying ./apps/_common to ./packages/cli/apps/_common
Copying ./src to ./packages/cli/src
Copying ./books to ./packages/cli/books
Copying ./servers.ts to ./packages/cli/servers.ts
Copying ./security.config.ts to ./packages/cli/security.config.ts
Agents-server app copied successfully
8️⃣  Test that nothing what should not be published is published
Error in generate-packages.ts
Error: Things marked with [⚫] should never be released in any bundle

**Steps to fix the issue:**

1) Look why the marker [⚫] is released in the bundle to NPM
2) Analyze the import chain which leads to usage in the released bundle
3) Fix the issue:
    A) If the code is indeed not meant to be published, fix the consuming code
    B) If the code is accidentally marked as non-publishable, remove the [⚫] marker from the source code

Note: Purpose of this mechanism is to prevent accidental leaks of code that is not meant to be published in NPM packages.
This can include code that is only meant for internal use within the repository, code that is meant to run only in development environments, or any other code that should not be part of the public API of the packages.

./packages/cli/esm/index.es.js
In line 71886:
// Note: [⚫] Code in this file should never be published in any package
    at assertBundleFileDoesNotContainNeverPublishMarker (/home/runner/work/promptbook/promptbook/scripts/generate-packages/assertGeneratedBundlesArePublishSafe.ts:183:11)
    at assertPackageBundleIsPublishSafe (/home/runner/work/promptbook/promptbook/scripts/generate-packages/assertGeneratedBundlesArePublishSafe.ts:84:9)
    at async assertGeneratedBundlesArePublishSafe (/home/runner/work/promptbook/promptbook/scripts/generate-packages/assertGeneratedBundlesArePublishSafe.ts:63:9)
    at async generatePackages (/home/runner/work/promptbook/promptbook/scripts/generate-packages/generate-packages.ts:170:5)
```
