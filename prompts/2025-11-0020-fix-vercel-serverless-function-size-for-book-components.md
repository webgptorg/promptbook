[ ]

[✨‼️] Fix Vercel serverless function size for `apps/book-components`

Here is the problem:

```log
10:42:50.789 Running build in Washington, D.C., USA (East) – iad1
10:42:50.789 Build machine configuration: 4 cores, 8 GB
10:42:50.910 Cloning github.com/webgptorg/promptbook (Branch: main, Commit: 19bfe67)
10:43:00.711 Cloning completed: 9.801s
10:43:01.135 Restored build cache from previous deployment (79QjdVxDTazks5oXMdHDpFxGSG63)
10:43:02.348 Running "vercel build"
10:43:02.890 Vercel CLI 48.9.0
10:43:03.225 Installing dependencies...
10:43:03.917 
10:43:03.917 > postinstall
10:43:03.917 > cd ../../ && npm ci
10:43:03.917 
10:43:09.940 npm warn deprecated y-websocket-server@1.0.2: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
10:43:10.001 npm warn deprecated urix@0.1.0: Please see https://github.com/lydell/urix#deprecated
10:43:10.513 npm warn deprecated source-map-url@0.4.1: See https://github.com/lydell/source-map-url#deprecated
10:43:10.575 npm warn deprecated stable@0.1.8: Modern JS already guarantees Array#sort() is a stable sort, so this library is deprecated. See the compatibility table on MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#browser_compatibility
10:43:10.648 npm warn deprecated source-map-resolve@0.5.3: See https://github.com/lydell/source-map-resolve#deprecated
10:43:11.050 npm warn deprecated rimraf@2.7.1: Rimraf versions prior to v4 are no longer supported
10:43:11.051 npm warn deprecated resolve-url@0.2.1: https://github.com/lydell/resolve-url#deprecated
10:43:11.897 npm warn deprecated move-concurrently@1.0.1: This package is no longer supported.
10:43:12.063 npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version.
10:43:12.358 npm warn deprecated lodash.get@4.4.2: This package is deprecated. Use the optional chaining (?.) operator instead.
10:43:12.939 npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
10:43:12.972 npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
10:43:13.296 npm warn deprecated glob@8.1.0: Glob versions prior to v9 are no longer supported
10:43:13.350 npm warn deprecated figgy-pudding@3.5.2: This module is no longer supported.
10:43:13.381 npm warn deprecated fs-write-stream-atomic@1.0.10: This package is no longer supported.
10:43:13.723 npm warn deprecated rollup-plugin-visualizer@5.13.1: Contains unintended breaking changes
10:43:14.256 npm warn deprecated crypto@1.0.1: This package is no longer supported. It's now a built-in Node module. If you've depended on crypto, you should switch to the one that's built-in.
10:43:14.351 npm warn deprecated copy-concurrently@1.0.5: This package is no longer supported.
10:43:16.381 npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
10:43:16.426 npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
10:43:17.839 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:43:18.025 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:43:18.315 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:43:18.699 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:43:19.165 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:43:19.166 npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
10:43:19.304 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:43:19.566 npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
10:43:21.531 npm warn deprecated @azure/openai@1.0.0-beta.13: The Azure OpenAI client library for JavaScript beta has been retired. Please migrate to the stable OpenAI SDK for JavaScript using the migration guide: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/openai/openai/MIGRATION.md.
10:43:24.505 npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.
10:43:39.467 
10:43:39.467 added 1889 packages, and audited 1890 packages in 35s
10:43:39.467 
10:43:39.467 335 packages are looking for funding
10:43:39.467   run `npm fund` for details
10:43:39.505 
10:43:39.505 18 vulnerabilities (8 moderate, 10 high)
10:43:39.506 
10:43:39.506 To address issues that do not require attention, run:
10:43:39.506   npm audit fix
10:43:39.506 
10:43:39.506 To address all issues (including breaking changes), run:
10:43:39.506   npm audit fix --force
10:43:39.506 
10:43:39.506 Run `npm audit` for details.
10:43:39.565 
10:43:39.565 up to date in 36s
10:43:39.599 Detected Next.js version: 15.4.7
10:43:39.602 Running "npm run build"
10:43:39.718 
10:43:39.718 > build
10:43:39.718 > (npx kill-port 4022 || true) && next build
10:43:39.718 
10:43:40.244 npm warn exec The following package was not found and will be installed: kill-port@2.0.1
10:43:40.529 Process on port 4022 killed
10:43:41.528    ▲ Next.js 15.4.7
10:43:41.529    - Experiments (use with caution):
10:43:41.529      ✓ externalDir
10:43:41.529 
10:43:41.557    Creating an optimized production build ...
10:44:16.986  ✓ Compiled successfully in 31.0s
10:44:16.991    Linting and checking validity of types ...
10:44:27.726    Collecting page data ...
10:44:29.971    Generating static pages (0/9) ...
10:44:31.010    Generating static pages (2/9) 
10:44:31.010    Generating static pages (4/9) 
10:44:31.010    Generating static pages (6/9) 
10:44:31.010  ✓ Generating static pages (9/9)
10:44:31.886    Finalizing page optimization ...
10:44:31.893    Collecting build traces ...
10:44:57.131 
10:44:57.134 Route (app)                                 Size  First Load JS
10:44:57.135 ┌ ○ /                                    2.17 kB         592 kB
10:44:57.135 ├ ○ /_not-found                            997 B         103 kB
10:44:57.135 ├ ƒ /api/books                             132 B         102 kB
10:44:57.135 ├ ƒ /api/books/[bookId]                    132 B         102 kB
10:44:57.135 ├ ƒ /component/[id]                      2.38 kB         592 kB
10:44:57.136 ├ ○ /playground                           2.7 kB         105 kB
10:44:57.136 ├ ƒ /utility/[id]                        1.98 kB         592 kB
10:44:57.136 ├ ○ /utility/counting-utilities           7.7 kB         123 kB
10:44:57.136 └ ○ /utility/humanize-ai-text            5.38 kB         121 kB
10:44:57.136 + First Load JS shared by all             102 kB
10:44:57.136   ├ chunks/1902-4c6fa32f8f283b65.js      44.4 kB
10:44:57.136   ├ chunks/87c73c54-095cf9a90cf9ee03.js  54.1 kB
10:44:57.136   └ other shared chunks (total)          3.69 kB
10:44:57.137 
10:44:57.137 
10:44:57.137 ○  (Static)   prerendered as static content
10:44:57.137 ƒ  (Dynamic)  server-rendered on demand
10:44:57.137 
10:44:57.300 Traced Next.js server files in: 92.873ms
10:45:00.166 Warning: Max serverless function size of 250 MB uncompressed reached
10:45:00.166 Serverless Function's page: component/[id].js
10:45:00.168 Large Dependencies           Uncompressed size
10:45:00.168 apps/book-components/.next           569.66 MB
10:45:00.168 node_modules/next/dist                 4.14 MB
10:45:00.168 apps/book-components/public             3.1 MB
10:45:00.168 node_modules/react-dom/cjs             1.74 MB
10:45:00.168 
10:45:00.168 All dependencies                     579.49 MB
10:45:00.168 Serverless Function's page: index.js
10:45:00.169 Large Dependencies           Uncompressed size
10:45:00.169 apps/book-components/.next           569.65 MB
10:45:00.169 node_modules/next/dist                 4.14 MB
10:45:00.169 apps/book-components/public             3.1 MB
10:45:00.169 node_modules/react-dom/cjs             1.74 MB
10:45:00.169 
10:45:00.169 All dependencies                     579.48 MB
10:45:00.169 Serverless Function's page: utility/[id].js
10:45:00.170 Large Dependencies           Uncompressed size
10:45:00.171 apps/book-components/.next           569.66 MB
10:45:00.171 node_modules/next/dist                 4.14 MB
10:45:00.171 apps/book-components/public             3.1 MB
10:45:00.171 node_modules/react-dom/cjs             1.74 MB
10:45:00.171 
10:45:00.171 All dependencies                     579.49 MB
10:45:00.171 Max serverless function size was exceeded for 3 functions
10:45:00.217 Created all serverless functions in: 2.917s
10:45:00.232 Collected static files (public/, static/, .next/static): 9.854ms
10:45:00.389 Build Completed in /vercel/output [2m]
10:45:00.556 Deploying outputs...
10:45:34.652 Error: A Serverless Function has exceeded the unzipped maximum size of 250 MB. : https://vercel.link/serverless-function-size
```

- The `apps/playground` is working fine
- The `apps/book-components` is exceeding the Vercel serverless function size limit of 250 MB uncompressed
- Fix the problem

---

[ ]

[✨‼️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨‼️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨‼️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`