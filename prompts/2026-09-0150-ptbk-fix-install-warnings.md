[ ]

[✨👉] When installing `ptbk` there are lot of peer dependency warnings, fix it

**Installing on Mac:**

```console
hejny@Mac vibehack-26-09-10 % npm i ptbk
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @ai-sdk/deepseek@0.1.17
npm warn Found: zod@4.3.6
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/openai-compatible@0.1.17
npm warn   node_modules/@ai-sdk/deepseek/node_modules/@ai-sdk/openai-compatible
npm warn     @ai-sdk/openai-compatible@"0.1.17" from @ai-sdk/deepseek@0.1.17
npm warn     node_modules/@ai-sdk/deepseek
npm warn
npm warn Could not resolve dependency:
npm warn peer zod@"^3.0.0" from @ai-sdk/deepseek@0.1.17
npm warn node_modules/@ai-sdk/deepseek
npm warn   @ai-sdk/deepseek@"0.1.17" from @promptbook/cli@0.114.0-33
npm warn   node_modules/@promptbook/cli
npm warn   2 more (@promptbook/deepseek, @promptbook/wizard)
npm warn
npm warn Conflicting peer dependency: zod@3.25.76
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/deepseek@0.1.17
npm warn   node_modules/@ai-sdk/deepseek
npm warn     @ai-sdk/deepseek@"0.1.17" from @promptbook/cli@0.114.0-33
npm warn     node_modules/@promptbook/cli
npm warn     2 more (@promptbook/deepseek, @promptbook/wizard)
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @ai-sdk/google@1.0.17
npm warn Found: zod@4.3.6
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/openai-compatible@0.1.17
npm warn   node_modules/@ai-sdk/deepseek/node_modules/@ai-sdk/openai-compatible
npm warn     @ai-sdk/openai-compatible@"0.1.17" from @ai-sdk/deepseek@0.1.17
npm warn     node_modules/@ai-sdk/deepseek
npm warn
npm warn Could not resolve dependency:
npm warn peer zod@"^3.0.0" from @ai-sdk/google@1.0.17
npm warn node_modules/@ai-sdk/google
npm warn   @ai-sdk/google@"1.0.17" from @promptbook/cli@0.114.0-33
npm warn   node_modules/@promptbook/cli
npm warn   2 more (@promptbook/google, @promptbook/wizard)
npm warn
npm warn Conflicting peer dependency: zod@3.25.76
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/google@1.0.17
npm warn   node_modules/@ai-sdk/google
npm warn     @ai-sdk/google@"1.0.17" from @promptbook/cli@0.114.0-33
npm warn     node_modules/@promptbook/cli
npm warn     2 more (@promptbook/google, @promptbook/wizard)
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @ai-sdk/openai@1.0.20
npm warn Found: zod@4.3.6
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/openai-compatible@0.1.17
npm warn   node_modules/@ai-sdk/deepseek/node_modules/@ai-sdk/openai-compatible
npm warn     @ai-sdk/openai-compatible@"0.1.17" from @ai-sdk/deepseek@0.1.17
npm warn     node_modules/@ai-sdk/deepseek
npm warn
npm warn Could not resolve dependency:
npm warn peer zod@"^3.0.0" from @ai-sdk/openai@1.0.20
npm warn node_modules/@ai-sdk/openai
npm warn   @ai-sdk/openai@"1.0.20" from @promptbook/cli@0.114.0-33
npm warn   node_modules/@promptbook/cli
npm warn
npm warn Conflicting peer dependency: zod@3.25.76
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/openai@1.0.20
npm warn   node_modules/@ai-sdk/openai
npm warn     @ai-sdk/openai@"1.0.20" from @promptbook/cli@0.114.0-33
npm warn     node_modules/@promptbook/cli
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn deprecated crypto@1.0.1: This package is no longer supported. It's now a built-in Node module. If you've depended on crypto, you should switch to the one that's built-in.
npm warn deprecated y-websocket-server@1.0.2: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated lodash.get@4.4.2: This package is deprecated. Use the optional chaining (?.) operator instead.
npm warn deprecated glob@8.1.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version.
npm warn deprecated crypto-js@4.2.0: Active development of CryptoJS has been discontinued. This library is no longer maintained.
npm warn deprecated @azure/openai@1.0.0-beta.13: The Azure OpenAI client library for JavaScript beta has been retired. Please migrate to the stable OpenAI SDK for JavaScript using the migration guide: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/openai/openai/MIGRATION.md.

added 1219 packages, and audited 1220 packages in 1m

175 packages are looking for funding
  run `npm fund` for details

66 vulnerabilities (8 low, 31 moderate, 24 high, 3 critical)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

**Installing on Windows (git bash):**

```console
me@DESKTOP-2QD9KQQ MINGW64 ~/work/tmp/ptbk-install
$ npm i ptbk
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @ai-sdk/deepseek@0.1.17
npm warn Found: zod@4.3.6
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/openai-compatible@0.1.17
npm warn   node_modules/@ai-sdk/deepseek/node_modules/@ai-sdk/openai-compatible
npm warn     @ai-sdk/openai-compatible@"0.1.17" from @ai-sdk/deepseek@0.1.17
npm warn     node_modules/@ai-sdk/deepseek
npm warn
npm warn Could not resolve dependency:
npm warn peer zod@"^3.0.0" from @ai-sdk/deepseek@0.1.17
npm warn node_modules/@ai-sdk/deepseek
npm warn   @ai-sdk/deepseek@"0.1.17" from @promptbook/cli@0.114.0-31
npm warn   node_modules/@promptbook/cli
npm warn   2 more (@promptbook/deepseek, @promptbook/wizard)
npm warn
npm warn Conflicting peer dependency: zod@3.25.76
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/deepseek@0.1.17
npm warn   node_modules/@ai-sdk/deepseek
npm warn     @ai-sdk/deepseek@"0.1.17" from @promptbook/cli@0.114.0-31
npm warn     node_modules/@promptbook/cli
npm warn     2 more (@promptbook/deepseek, @promptbook/wizard)
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @ai-sdk/google@1.0.17
npm warn Found: zod@4.3.6
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/openai-compatible@0.1.17
npm warn   node_modules/@ai-sdk/deepseek/node_modules/@ai-sdk/openai-compatible
npm warn     @ai-sdk/openai-compatible@"0.1.17" from @ai-sdk/deepseek@0.1.17
npm warn     node_modules/@ai-sdk/deepseek
npm warn
npm warn Could not resolve dependency:
npm warn peer zod@"^3.0.0" from @ai-sdk/google@1.0.17
npm warn node_modules/@ai-sdk/google
npm warn   @ai-sdk/google@"1.0.17" from @promptbook/cli@0.114.0-31
npm warn   node_modules/@promptbook/cli
npm warn   2 more (@promptbook/google, @promptbook/wizard)
npm warn
npm warn Conflicting peer dependency: zod@3.25.76
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/google@1.0.17
npm warn   node_modules/@ai-sdk/google
npm warn     @ai-sdk/google@"1.0.17" from @promptbook/cli@0.114.0-31
npm warn     node_modules/@promptbook/cli
npm warn     2 more (@promptbook/google, @promptbook/wizard)
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @ai-sdk/openai@1.0.20
npm warn Found: zod@4.3.6
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/openai-compatible@0.1.17
npm warn   node_modules/@ai-sdk/deepseek/node_modules/@ai-sdk/openai-compatible
npm warn     @ai-sdk/openai-compatible@"0.1.17" from @ai-sdk/deepseek@0.1.17
npm warn     node_modules/@ai-sdk/deepseek
npm warn
npm warn Could not resolve dependency:
npm warn peer zod@"^3.0.0" from @ai-sdk/openai@1.0.20
npm warn node_modules/@ai-sdk/openai
npm warn   @ai-sdk/openai@"1.0.20" from @promptbook/cli@0.114.0-31
npm warn   node_modules/@promptbook/cli
npm warn
npm warn Conflicting peer dependency: zod@3.25.76
npm warn node_modules/zod
npm warn   peer zod@"^3.0.0" from @ai-sdk/openai@1.0.20
npm warn   node_modules/@ai-sdk/openai
npm warn     @ai-sdk/openai@"1.0.20" from @promptbook/cli@0.114.0-31
npm warn     node_modules/@promptbook/cli
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn ERESOLVE overriding peer dependency
npm warn deprecated crypto@1.0.1: This package is no longer supported. It's now a built-in Node module. If you've depended on crypto, you should switch to the one that's built-in.
npm warn deprecated y-websocket-server@1.0.2: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated lodash.get@4.4.2: This package is deprecated. Use the optional chaining (?.) operator instead.
npm warn deprecated glob@8.1.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version.
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.
npm warn deprecated crypto-js@4.2.0: Active development of CryptoJS has been discontinued. This library is no longer maintained.
npm warn deprecated @azure/openai@1.0.0-beta.13: The Azure OpenAI client library for JavaScript beta has been retired. Please migrate to the stable OpenAI SDK for JavaScript using the migration guide: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/openai/openai/MIGRATION.md.

added 1221 packages, and audited 1222 packages in 8m

174 packages are looking for funding
  run `npm fund` for details

66 vulnerabilities (8 low, 31 moderate, 24 high, 3 critical)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
