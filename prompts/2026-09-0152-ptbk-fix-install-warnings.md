[ ]

[✨👉] When installing npm packages there are lot of peer dependency warnings, fix it

**Installing on Windows (git bash):**

```console
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ npm i
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: react-copy-to-clipboard@5.1.0
npm warn Found: react@19.1.2
npm warn node_modules/react
npm warn   dev react@"19.1.2" from the root project
npm warn   26 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^15.3.0 || 16 || 17 || 18" from react-copy-to-clipboard@5.1.0
npm warn node_modules/swagger-ui-react/node_modules/react-copy-to-clipboard
npm warn   react-copy-to-clipboard@"5.1.0" from swagger-ui-react@5.31.2
npm warn   node_modules/swagger-ui-react
npm warn
npm warn Conflicting peer dependency: react@18.3.1
npm warn node_modules/react
npm warn   peer react@"^15.3.0 || 16 || 17 || 18" from react-copy-to-clipboard@5.1.0
npm warn   node_modules/swagger-ui-react/node_modules/react-copy-to-clipboard
npm warn     react-copy-to-clipboard@"5.1.0" from swagger-ui-react@5.31.2
npm warn     node_modules/swagger-ui-react
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: react-debounce-input@3.3.0
npm warn Found: react@19.1.2
npm warn node_modules/react
npm warn   dev react@"19.1.2" from the root project
npm warn   26 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^15.3.0 || 16 || 17 || 18" from react-debounce-input@3.3.0
npm warn node_modules/swagger-ui-react/node_modules/react-debounce-input
npm warn   react-debounce-input@"=3.3.0" from swagger-ui-react@5.31.2
npm warn   node_modules/swagger-ui-react
npm warn
npm warn Conflicting peer dependency: react@18.3.1
npm warn node_modules/react
npm warn   peer react@"^15.3.0 || 16 || 17 || 18" from react-debounce-input@3.3.0
npm warn   node_modules/swagger-ui-react/node_modules/react-debounce-input
npm warn     react-debounce-input@"=3.3.0" from swagger-ui-react@5.31.2
npm warn     node_modules/swagger-ui-react
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: react-inspector@6.0.2
npm warn Found: react@19.1.2
npm warn node_modules/react
npm warn   dev react@"19.1.2" from the root project
npm warn   26 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^16.8.4 || ^17.0.0 || ^18.0.0" from react-inspector@6.0.2
npm warn node_modules/swagger-ui-react/node_modules/react-inspector
npm warn   react-inspector@"^6.0.1" from swagger-ui-react@5.31.2
npm warn   node_modules/swagger-ui-react
npm warn
npm warn Conflicting peer dependency: react@18.3.1
npm warn node_modules/react
npm warn   peer react@"^16.8.4 || ^17.0.0 || ^18.0.0" from react-inspector@6.0.2
npm warn   node_modules/swagger-ui-react/node_modules/react-inspector
npm warn     react-inspector@"^6.0.1" from swagger-ui-react@5.31.2
npm warn     node_modules/swagger-ui-react

up to date, audited 2154 packages in 13s

313 packages are looking for funding
  run `npm fund` for details

96 vulnerabilities (4 low, 49 moderate, 40 high, 3 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.

Run `npm audit` for details.

me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ npm audit
# npm audit report

@ai-sdk/provider-utils  3.0.31 - 3.0.37 || 4.0.0-beta.10 - 4.0.32 || 4.0.41 - 4.0.45
Severity: moderate
@ai-sdk/provider-utils has an Uncontrolled Resource Consumption issue - https://github.com/advisories/GHSA-866g-f22w-33x8
Depends on vulnerable versions of undici
fix available via `npm audit fix --force`
Will install @ai-sdk/openai@4.0.66, which is a breaking change
node_modules/@ai-sdk/deepseek/node_modules/@ai-sdk/provider-utils
node_modules/@ai-sdk/google/node_modules/@ai-sdk/provider-utils
node_modules/@ai-sdk/openai/node_modules/@ai-sdk/provider-utils
node_modules/@ai-sdk/provider-utils
  @ai-sdk/deepseek  1.0.49 - 1.0.57 || 2.0.51 - 2.0.55
  Depends on vulnerable versions of @ai-sdk/provider-utils
  node_modules/@ai-sdk/deepseek
  @ai-sdk/gateway  <=0.0.0-98261322-20260122142521 || 1.1.0-beta.0 - 2.0.0-beta.93 || 3.0.0 - 3.0.138
  Depends on vulnerable versions of @ai-sdk/provider-utils
  node_modules/@ai-sdk/gateway
    ai  <=0.0.0-fd764a60-20260114143805 || 5.1.0-beta.0 - 6.0.213 || 7.0.0-beta.0 - 7.0.0-beta.1-gr2m-test
    Depends on vulnerable versions of @ai-sdk/gateway
    Depends on vulnerable versions of @ai-sdk/provider-utils
    node_modules/ai
  @ai-sdk/google  2.0.86 - 2.0.97 || 3.0.103 - 3.0.109
  Depends on vulnerable versions of @ai-sdk/provider-utils
  node_modules/@ai-sdk/google
  @ai-sdk/openai  2.0.117 - 2.0.127 || 3.0.90 - 3.0.96
  Depends on vulnerable versions of @ai-sdk/provider-utils
  node_modules/@ai-sdk/openai

@babel/core  <=7.29.0
@babel/core: Arbitrary File Read via sourceMappingURL Comment - https://github.com/advisories/GHSA-4x5r-pxfx-6jf8
fix available via `npm audit fix`
node_modules/@babel/core

@hono/node-server  <1.19.15
Severity: moderate
Node.js Adapter for Hono: Path traversal in `serve-static` on Windows via encoded backslash (`%5C`) - https://github.com/advisories/GHSA-frvp-7c67-39w9
fix available via `npm audit fix`
node_modules/@hono/node-server

@modelcontextprotocol/sdk  1.3.0 - 1.25.3
Severity: high
@modelcontextprotocol/sdk has cross-client data leak via shared server/transport instance reuse - https://github.com/advisories/GHSA-345p-7cg4-v4c7
Anthropic's MCP TypeScript SDK has a ReDoS vulnerability - https://github.com/advisories/GHSA-8r9q-7v3j-jr4g
fix available via `npm audit fix --force`
Will install @modelcontextprotocol/sdk@1.30.0, which is outside the stated dependency range
node_modules/@modelcontextprotocol/sdk

@xmldom/xmldom  <=0.8.14 || 0.9.0-beta.1 - 0.9.11
Severity: high
xmldom: XML injection via unsafe CDATA serialization allows attacker-controlled markup insertion - https://github.com/advisories/GHSA-wh4c-j3r5-mjhp
xmldom: Uncontrolled recursion in XML serialization leads to DoS - https://github.com/advisories/GHSA-2v35-w6hq-6mfw
xmldom has XML injection through unvalidated DocumentType serialization - https://github.com/advisories/GHSA-f6ww-3ggp-fr8hxmldom has XML node injection through unvalidated processing instruction serialization - https://github.com/advisories/GHSA-x6wf-f3px-wcqx
xmldom has XML node injection through unvalidated comment serialization - https://github.com/advisories/GHSA-j759-j44w-7fr8xmldom: XML fragment injection via invalid EntityReference.nodeName during requireWellFormed serialization - https://github.com/advisories/GHSA-6gmq-8vp8-gcm6
xmldom: XML fragment injection via invalid EntityReference.nodeName during requireWellFormed serialization - https://github.com/advisories/GHSA-6gmq-8vp8-gcm6
xmldom: HTML raw-text closing-tag case mismatch causes output amplification - https://github.com/advisories/GHSA-6mj3-qw4j-hgrw
xmldom PI grammar regex ReDoS: quadratic backtracking on unterminated processing instructions - https://github.com/advisories/GHSA-g53g-w8rj-fmg7
xmldom: Element name injection via createElement() bypasses requireWellFormed - https://github.com/advisories/GHSA-w2rr-34g9-rvrj
xmldom: Element name injection via createElement() bypasses requireWellFormed - https://github.com/advisories/GHSA-w2rr-34g9-rvrj
xmldom: Attribute name injection via setAttribute() bypasses requireWellFormed - https://github.com/advisories/GHSA-4w3w-2rp5-g8jm
xmldom: Attribute name injection via setAttribute() bypasses requireWellFormed - https://github.com/advisories/GHSA-4w3w-2rp5-g8jm
xmldom: Processing Instruction Target Injection Bypasses requireWellFormed - https://github.com/advisories/GHSA-c7q8-3ch8-vqpv
xmldom: Processing Instruction Target Injection Bypasses requireWellFormed - https://github.com/advisories/GHSA-c7q8-3ch8-vqpv
xmldom: DocType `name` Injection Bypasses requireWellFormed - https://github.com/advisories/GHSA-27p8-2357-5qqv
xmldom: DocType `name` Injection Bypasses requireWellFormed - https://github.com/advisories/GHSA-27p8-2357-5qqv
xmldom: Creation-time XML Name/QName validation is bypassable via an embedded line terminator, allowing injection on the default serialization path - https://github.com/advisories/GHSA-3px3-54cx-rmw9
xmldom: requireWellFormed DocType publicId/systemId validation is bypassable via an embedded line terminator - https://github.com/advisories/GHSA-vr34-hp96-76pp
xmldom: Parser silently accepts a not-well-formed end tag whose name is followed by a line break and trailing content - https://github.com/advisories/GHSA-6h8r-xr42-gp59
xmldom: Parser silently accepts a not-well-formed end tag whose name is followed by a line break and trailing content - https://github.com/advisories/GHSA-6h8r-xr42-gp59
xmldom: Quadratic-time attribute deduplication - https://github.com/advisories/GHSA-8344-3jmq-59r6
xmldom: Quadratic-time attribute deduplication - https://github.com/advisories/GHSA-8344-3jmq-59r6
xmldom: End-tag Whitespace-Trim Regex ReDoS — quadratic backtracking in the 0.8.x end-tag parser - https://github.com/advisories/GHSA-x4fp-j954-r2f4
xmldom: Quadratic-memory consumption - https://github.com/advisories/GHSA-965w-775f-mr7g
xmldom: Quadratic-memory consumption - https://github.com/advisories/GHSA-965w-775f-mr7g
xmldom: Quadratic-time parsing via the malformed-input recovery path — `parseElementStartPart` re-scan and `normalize()` adjacent-text merge - https://github.com/advisories/GHSA-93r5-fhx6-vmg9
xmldom: Quadratic-time parsing via the malformed-input recovery path — `parseElementStartPart` re-scan and `normalize()` adjacent-text merge - https://github.com/advisories/GHSA-93r5-fhx6-vmg9
fix available via `npm audit fix`
node_modules/@node-saml/node-saml/node_modules/@xmldom/xmldom
node_modules/@xmldom/xmldom
node_modules/mammoth/node_modules/@xmldom/xmldom
node_modules/xml-crypto/node_modules/@xmldom/xmldom
node_modules/xml-encryption/node_modules/@xmldom/xmldom

ajv  <6.14.0 || >=7.0.0-alpha.0 <8.18.0
Severity: moderate
ajv has ReDoS when using `$data` option - https://github.com/advisories/GHSA-2g4f-4pwh-qvx6
ajv has ReDoS when using `$data` option - https://github.com/advisories/GHSA-2g4f-4pwh-qvx6
fix available via `npm audit fix`
node_modules/@modelcontextprotocol/sdk/node_modules/ajv
node_modules/ajv
node_modules/ajv-formats/node_modules/ajv
node_modules/express-openapi-validator/node_modules/ajv

axios  <=0.32.0 || 1.0.0 - 1.17.0
Severity: high
Axios Cross-Site Request Forgery Vulnerability - https://github.com/advisories/GHSA-wf5p-g6vw-rhxx
axios Requests Vulnerable To Possible SSRF and Credential Leakage via Absolute URL - https://github.com/advisories/GHSA-jr5f-v2jv-69x6
Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF - https://github.com/advisories/GHSA-3p68-rc4w-qgx5
Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy - https://github.com/advisories/GHSA-w9j2-pvgh-6h63
Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0 - https://github.com/advisories/GHSA-pmwg-cvhr-8vh7
Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams - https://github.com/advisories/GHSA-xhjh-pmcv-23jwAxios: no_proxy bypass via IP alias allows SSRF - https://github.com/advisories/GHSA-m7pr-hjqh-92cm
Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0 - https://github.com/advisories/GHSA-5c9x-8gcm-mpgx
Axios: HTTP adapter streamed responses bypass maxContentLength - https://github.com/advisories/GHSA-vf2m-468p-8v99
Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking - https://github.com/advisories/GHSA-pf86-5x62-jrwf
Axios: Header Injection via Prototype Pollution - https://github.com/advisories/GHSA-6chq-wfr3-2hj9
Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion - https://github.com/advisories/GHSA-xx6v-rp6x-q39c
Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig - https://github.com/advisories/GHSA-43fc-jf86-j433
Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain - https://github.com/advisories/GHSA-fvcv-3m26-pcqx
Axios: unbounded recursion in toFormData causes DoS via deeply nested request data - https://github.com/advisories/GHSA-62hf-57xw-28j9
Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection - https://github.com/advisories/GHSA-hfxv-24rg-xrqf
Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection - https://github.com/advisories/GHSA-hfxv-24rg-xrqf
Allocation of Resources Without Limits or Throttling in Axios - https://github.com/advisories/GHSA-777c-7fjr-54vf
Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter - https://github.com/advisories/GHSA-p92q-9vqr-4j8v
Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter - https://github.com/advisories/GHSA-p92q-9vqr-4j8v
Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection - https://github.com/advisories/GHSA-j5f8-grm9-p9fc
Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection - https://github.com/advisories/GHSA-j5f8-grm9-p9fc
axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge - https://github.com/advisories/GHSA-3g43-6gmg-66jw
axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy` - https://github.com/advisories/GHSA-35jp-ww65-95wh
axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions - https://github.com/advisories/GHSA-898c-q2cr-xwhg
axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions - https://github.com/advisories/GHSA-898c-q2cr-xwhg
Axios has a Patch Bypass: Proxy-Authorization Header Injection via Prototype Pollution — Incomplete Null-Prototype Fix - https://github.com/advisories/GHSA-654m-c8p4-x5fp
axios's shouldBypassProxy does not recognize IPv4-mapped IPv6 addresses, allowing NO_PROXY bypass (incomplete fix for CVE-2025-62718) - https://github.com/advisories/GHSA-pjwm-pj3p-43mv
axios's shouldBypassProxy does not recognize IPv4-mapped IPv6 addresses, allowing NO_PROXY bypass (incomplete fix for CVE-2025-62718) - https://github.com/advisories/GHSA-pjwm-pj3p-43mv
Axios: Prototype pollution auth subfields can inject Basic auth - https://github.com/advisories/GHSA-xj6q-8x83-jv6g
Axios: Prototype pollution gadgets can alter axios request construction - https://github.com/advisories/GHSA-mmx7-hfxf-jppxAxios: Prototype pollution gadgets can alter axios request construction - https://github.com/advisories/GHSA-mmx7-hfxf-jppxAxios: Deep formToJSON Key Recursion Can Cause Denial of Service - https://github.com/advisories/GHSA-pmv8-rq9r-6j72
Axios: HTTP/2 streamed uploads bypass `maxBodyLength` - https://github.com/advisories/GHSA-mwf2-3pr3-8698
Axios Node HTTP adapter can use an inherited proxy after interceptor config cloning - https://github.com/advisories/GHSA-gcfj-64vw-6mp9
Axios: Nested axios option objects can consume polluted prototype values - https://github.com/advisories/GHSA-7q8q-rj6j-mhjq
Axios: Nested axios option objects can consume polluted prototype values - https://github.com/advisories/GHSA-7q8q-rj6j-mhjq
Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength` - https://github.com/advisories/GHSA-jqh4-m9w3-8hp9
Axios: NO_PROXY bypass for 0.0.0.0 local addresses in axios - https://github.com/advisories/GHSA-f4gw-2p7v-4548
Axios: Excessive recursion in formDataToJSON can cause denial of service - https://github.com/advisories/GHSA-42h9-826w-cgv3
Axios form serializer maxDepth bypass via {} metatoken - https://github.com/advisories/GHSA-hcpx-6fm6-wx23
fix available via `npm audit fix --force`
Will install localtunnel@1.8.3, which is a breaking change
node_modules/axios
node_modules/localtunnel/node_modules/axios
  localtunnel  >=1.9.0
  Depends on vulnerable versions of axios
  node_modules/localtunnel

baseline-browser-mapping  >=2.0.0 <2.11.0
Severity: moderate
baseline-browser-mapping process termination on invalid input causes denial of service - https://github.com/advisories/GHSA-w5vr-8v7q-w6rv
fix available via `npm audit fix`
node_modules/baseline-browser-mapping

body-parser  <=1.20.6 || 2.0.0-beta.1 - 2.2.2
Severity: moderate
body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement - https://github.com/advisories/GHSA-v422-hmwv-36x6
body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement - https://github.com/advisories/GHSA-v422-hmwv-36x6
Depends on vulnerable versions of qs
fix available via `npm audit fix --force`
Will install express@4.22.3, which is outside the stated dependency range
node_modules/@modelcontextprotocol/sdk/node_modules/body-parser
node_modules/@openai/agents-core/node_modules/body-parser
node_modules/body-parser
  express  4.0.0-rc1 - 4.22.2 || 5.0.0-alpha.1 - 5.0.1
  Depends on vulnerable versions of body-parser
  Depends on vulnerable versions of path-to-regexp
  Depends on vulnerable versions of qs
  node_modules/express

brace-expansion  <=1.1.17 || 2.0.0 - 2.1.3 || 3.0.0 - 5.0.8
Severity: high
brace-expansion: Zero-step sequence causes process hang and memory exhaustion - https://github.com/advisories/GHSA-f886-m6hf-6m8v
brace-expansion: Zero-step sequence causes process hang and memory exhaustion - https://github.com/advisories/GHSA-f886-m6hf-6m8v
brace-expansion: Large numeric range defeats documented `max` DoS protection - https://github.com/advisories/GHSA-jxxr-4gwj-5jf2
brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups - https://github.com/advisories/GHSA-3jxr-9vmj-r5cp
brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups - https://github.com/advisories/GHSA-3jxr-9vmj-r5cp
brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups - https://github.com/advisories/GHSA-3jxr-9vmj-r5cp
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash - https://github.com/advisories/GHSA-mh99-v99m-4gvg
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash - https://github.com/advisories/GHSA-mh99-v99m-4gvg
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash - https://github.com/advisories/GHSA-mh99-v99m-4gvg
brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation - https://github.com/advisories/GHSA-rgw5-rvv9-x895
brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation - https://github.com/advisories/GHSA-rgw5-rvv9-x895
brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation - https://github.com/advisories/GHSA-rgw5-rvv9-x895
fix available via `npm audit fix`
node_modules/@redocly/openapi-core/node_modules/brace-expansion
node_modules/@sentry/bundler-plugin-core/node_modules/brace-expansion
node_modules/@swagger-api/apidom-reference/node_modules/brace-expansion
node_modules/@ts-morph/common/node_modules/brace-expansion
node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion
node_modules/brace-expansion
node_modules/glob/node_modules/brace-expansion

browserslist  <=4.28.6
Severity: high
Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM - https://github.com/advisories/GHSA-c83g-rgw3-j3cx
Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) - https://github.com/advisories/GHSA-73wf-gq98-2v4g
fix available via `npm audit fix`
node_modules/browserslist

colord  <2.9.4
Severity: moderate
Colord: Slow rejection of oversized malformed color strings - https://github.com/advisories/GHSA-2wm5-q62r-hmrv
fix available via `npm audit fix`
node_modules/colord

dompurify  <=3.4.12
Severity: moderate
DOMPurify allows Cross-site Scripting (XSS) - https://github.com/advisories/GHSA-vhxf-7vqr-mrjg
DOMPurify contains a Cross-site Scripting vulnerability - https://github.com/advisories/GHSA-v8jm-5vwx-cfxm
DOMPurify contains a Cross-site Scripting vulnerability - https://github.com/advisories/GHSA-v2wj-7wpq-c8vv
DOMPurify: FORBID_TAGS bypassed by function-based ADD_TAGS predicate (asymmetry with FORBID_ATTR fix) - https://github.com/advisories/GHSA-h7mw-gpvr-xq4m
DOMPurify has a SAFE_FOR_TEMPLATES bypass in RETURN_DOM mode - https://github.com/advisories/GHSA-crv5-9vww-q3g8
DOMPurify: Prototype Pollution to XSS Bypass via CUSTOM_ELEMENT_HANDLING Fallback - https://github.com/advisories/GHSA-v9jr-rg53-9pgp
DOMPurify: Cross-realm IN_PLACE sanitization leaves executable markup intact via realm-bound `instanceof` checks - https://github.com/advisories/GHSA-hpcv-96wg-7vj8
DOMPurify: IN_PLACE mode preserves attributes of a clobbered root element, allowing XSS via attacker-controlled root DOM -https://github.com/advisories/GHSA-r47g-fvhr-h676
DOMPurify IN_PLACE Sanitization Bypass via Attached Shadow Root Inside <template>.content - https://github.com/advisories/GHSA-rp9w-3fw7-7cwq
DOMPurify: `CUSTOM_ELEMENT_HANDLING` bypasses `afterSanitizeElements` for allowed custom elements. - https://github.com/advisories/GHSA-c2j3-45gr-mqc4
DOMPurify: Permanent `ALLOWED_ATTR` pollution via `setConfig()` bypassing the hook clone-guard (incomplete fix of the 3.4.7 hook-pollution patch) - https://github.com/advisories/GHSA-cmwh-pvxp-8882
DOMPurify: Trusted Types policy survives `clearConfig()` and can poison later `RETURN_TRUSTED_TYPE` output - https://github.com/advisories/GHSA-vxr8-fq34-vvx9
DOMPurify: SAFE_FOR_TEMPLATES bypass - template expressions survive sanitization inside <template> content when using DOM output modes - https://github.com/advisories/GHSA-gvmj-g25r-r7wr
DOMPurify: `IN_PLACE` mode trusts attacker-controlled `nodeName` on live non-form nodes, allowing script retention and XSSvia attacker-supplied DOM objects - https://github.com/advisories/GHSA-x4vx-rjvf-j5p4
DOMPurify: Hook mutation of `data.allowedTags` / `data.allowedAttributes` permanently pollutes `DEFAULT_ALLOWED_TAGS` / `DEFAULT_ALLOWED_ATTR` - https://github.com/advisories/GHSA-76mc-f452-cxcm
DOMPurify's ADD_TAGS function form bypasses FORBID_TAGS due to short-circuit evaluation - https://github.com/advisories/GHSA-39q2-94rc-95cp
DOMPurify ADD_ATTR predicate skips URI validation - https://github.com/advisories/GHSA-cjmm-f4jc-qw8r
DOMPurify USE_PROFILES prototype pollution allows event handlers - https://github.com/advisories/GHSA-cj63-jhhr-wcxv
DOMPurify is vulnerable to mutation-XSS via Re-Contextualization  - https://github.com/advisories/GHSA-h8r8-wccr-v5f2
DOMPurify: IN_PLACE hook removal leaves a detached subtree executable, causing XSS - https://github.com/advisories/GHSA-55q2-fjhq-7xh7
fix available via `npm audit fix --force`
Will install monaco-editor@0.56.0, which is a breaking change
node_modules/dompurify
node_modules/monaco-editor/node_modules/dompurify
node_modules/swagger-ui-react/node_modules/dompurify
  monaco-editor  0.54.0-dev-20250909 - 0.55.0-rc
  Depends on vulnerable versions of dompurify
  node_modules/monaco-editor
  swagger-ui-react  3.52.0 - 5.32.6
  Depends on vulnerable versions of dompurify
  Depends on vulnerable versions of js-yaml
  node_modules/swagger-ui-react

engine.io  0.7.8 - 0.7.9 || 4.1.0 - 6.6.7
Severity: high
Socket.IO: Engine.IO Polling Transport Connection Exhaustion - https://github.com/advisories/GHSA-r635-g3xr-vw7x
Socket.IO: Engine.IO WebTransport SID DoS - https://github.com/advisories/GHSA-gr94-w7qr-f4j3
Depends on vulnerable versions of ws
fix available via `npm audit fix`
node_modules/engine.io

fast-uri  3.0.0 - 3.1.5
Severity: high
fast-uri vulnerable to host confusion via literal backslash authority delimiter - https://github.com/advisories/GHSA-v2hh-gcrm-f6hx
fast-uri vulnerable to host confusion via backslash authority introducer - https://github.com/advisories/GHSA-7p8r-x3mc-p8w7
fast-uri vulnerable to path traversal via percent-encoded dot segments - https://github.com/advisories/GHSA-q3j6-qgpj-74h6
fast-uri vulnerable to host confusion via percent-encoded authority delimiters - https://github.com/advisories/GHSA-v39h-62p7-jpjc
fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization - https://github.com/advisories/GHSA-f65p-4m7j-42xc
fast-uri vulnerable to host confusion via percent-encoded scheme normalization - https://github.com/advisories/GHSA-jqff-g426-hqxp
fast-uri vulnerable to host confusion via failed IDN canonicalization - https://github.com/advisories/GHSA-4c8g-83qw-93j6
fix available via `npm audit fix`
node_modules/fast-uri

fast-xml-parser  <=5.6.0
Severity: critical
fast-xml-parser has RangeError DoS Numeric Entities Bug - https://github.com/advisories/GHSA-37qj-frw5-hhjh
fast-xml-parser has an entity encoding bypass via regex injection in DOCTYPE entity names - https://github.com/advisories/GHSA-m7jm-9gc2-mpf2
fast-xml-parser affected by DoS through entity expansion in DOCTYPE (no expansion limit) - https://github.com/advisories/GHSA-jmr7-xgp7-cmfj
fast-xml-parser has stack overflow in XMLBuilder with preserveOrder - https://github.com/advisories/GHSA-fj3w-jwp8-x2g3
fast-xml-parser affected by numeric entity expansion bypassing all entity expansion limits (incomplete fix for CVE-2026-26278) - https://github.com/advisories/GHSA-8gc5-j5rx-235r
Entity Expansion Limits Bypassed When Set to Zero Due to JavaScript Falsy Evaluation in fast-xml-parser - https://github.com/advisories/GHSA-jp2q-39xq-3w4g
fast-xml-parser XMLBuilder: XML Comment and CDATA Injection via Unescaped Delimiters - https://github.com/advisories/GHSA-gh4j-gqv2-49f6
fix available via `npm audit fix --force`
Will install @aws-sdk/client-s3@3.1132.0, which is outside the stated dependency range
node_modules/fast-xml-parser
  @aws-sdk/xml-builder  3.894.0 - 3.972.18
  Depends on vulnerable versions of fast-xml-parser
  node_modules/@aws-sdk/xml-builder
    @aws-sdk/core  3.894.0 - 3.972.0
    Depends on vulnerable versions of @aws-sdk/xml-builder
    node_modules/@aws-sdk/core
      @aws-sdk/client-s3  3.894.0 - 3.978.0
      Depends on vulnerable versions of @aws-sdk/core
      Depends on vulnerable versions of @aws-sdk/credential-provider-node
      Depends on vulnerable versions of @aws-sdk/middleware-flexible-checksums
      Depends on vulnerable versions of @aws-sdk/middleware-sdk-s3
      Depends on vulnerable versions of @aws-sdk/middleware-user-agent
      Depends on vulnerable versions of @aws-sdk/signature-v4-multi-region
      Depends on vulnerable versions of @aws-sdk/util-user-agent-node
      node_modules/@aws-sdk/client-s3
      @aws-sdk/client-sso  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      Depends on vulnerable versions of @aws-sdk/middleware-user-agent
      Depends on vulnerable versions of @aws-sdk/util-user-agent-node
      node_modules/@aws-sdk/client-sso
      @aws-sdk/credential-provider-env  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      node_modules/@aws-sdk/credential-provider-env
        @aws-sdk/credential-provider-node  3.894.0 - 3.972.0
        Depends on vulnerable versions of @aws-sdk/credential-provider-env
        Depends on vulnerable versions of @aws-sdk/credential-provider-http
        Depends on vulnerable versions of @aws-sdk/credential-provider-ini
        Depends on vulnerable versions of @aws-sdk/credential-provider-process
        Depends on vulnerable versions of @aws-sdk/credential-provider-sso
        Depends on vulnerable versions of @aws-sdk/credential-provider-web-identity
        node_modules/@aws-sdk/credential-provider-node
      @aws-sdk/credential-provider-http  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      node_modules/@aws-sdk/credential-provider-http
      @aws-sdk/credential-provider-ini  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      Depends on vulnerable versions of @aws-sdk/credential-provider-env
      Depends on vulnerable versions of @aws-sdk/credential-provider-http
      Depends on vulnerable versions of @aws-sdk/credential-provider-login
      Depends on vulnerable versions of @aws-sdk/credential-provider-process
      Depends on vulnerable versions of @aws-sdk/credential-provider-sso
      Depends on vulnerable versions of @aws-sdk/credential-provider-web-identity
      Depends on vulnerable versions of @aws-sdk/nested-clients
      node_modules/@aws-sdk/credential-provider-ini
      @aws-sdk/credential-provider-login  <=3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      Depends on vulnerable versions of @aws-sdk/nested-clients
      node_modules/@aws-sdk/credential-provider-login
      @aws-sdk/credential-provider-process  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      node_modules/@aws-sdk/credential-provider-process
      @aws-sdk/credential-provider-sso  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/client-sso
      Depends on vulnerable versions of @aws-sdk/core
      Depends on vulnerable versions of @aws-sdk/token-providers
      node_modules/@aws-sdk/credential-provider-sso
      @aws-sdk/credential-provider-web-identity  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      Depends on vulnerable versions of @aws-sdk/nested-clients
      node_modules/@aws-sdk/credential-provider-web-identity
      @aws-sdk/middleware-flexible-checksums  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      node_modules/@aws-sdk/middleware-flexible-checksums
      @aws-sdk/middleware-sdk-s3  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      node_modules/@aws-sdk/middleware-sdk-s3
        @aws-sdk/signature-v4-multi-region  3.894.0 - 3.972.0
        Depends on vulnerable versions of @aws-sdk/middleware-sdk-s3
        node_modules/@aws-sdk/signature-v4-multi-region
      @aws-sdk/middleware-user-agent  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      node_modules/@aws-sdk/middleware-user-agent
        @aws-sdk/util-user-agent-node  3.894.0 - 3.972.0
        Depends on vulnerable versions of @aws-sdk/middleware-user-agent
        node_modules/@aws-sdk/util-user-agent-node
      @aws-sdk/nested-clients  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      Depends on vulnerable versions of @aws-sdk/middleware-user-agent
      Depends on vulnerable versions of @aws-sdk/util-user-agent-node
      node_modules/@aws-sdk/nested-clients
      @aws-sdk/token-providers  3.894.0 - 3.972.0
      Depends on vulnerable versions of @aws-sdk/core
      Depends on vulnerable versions of @aws-sdk/nested-clients
      node_modules/@aws-sdk/token-providers

fflate  0.8.0 - 0.8.2
Severity: moderate
fflate unzipSync can enter an infinite loop when parsing malformed ZIP64 archives - https://github.com/advisories/GHSA-px8p-9vwx-vf98
fix available via `npm audit fix`
node_modules/fflate

flatted  <=3.4.1
Severity: high
flatted vulnerable to unbounded recursion DoS in parse() revive phase - https://github.com/advisories/GHSA-25h7-pfq9-p65f
Prototype Pollution via parse() in NodeJS flatted - https://github.com/advisories/GHSA-rf6f-7fwh-wjgh
fix available via `npm audit fix`
node_modules/flatted

follow-redirects  <=1.15.11
Severity: moderate
follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets - https://github.com/advisories/GHSA-r4q5-vmmm-2653
fix available via `npm audit fix`
node_modules/follow-redirects

form-data  4.0.0 - 4.0.5
Severity: high
form-data: CRLF injection in form-data via unescaped multipart field names and filenames - https://github.com/advisories/GHSA-hmw2-7cc7-3qxx
fix available via `npm audit fix`
node_modules/form-data

hono  <=4.13.4
Severity: high
Hono added timing comparison hardening in basicAuth and bearerAuth - https://github.com/advisories/GHSA-gq3j-xvxp-8hrf
Hono Vulnerable to Cookie Attribute Injection via Unsanitized domain and path in setCookie() - https://github.com/advisories/GHSA-5pq2-9x2x-5p6w
Hono Vulnerable to SSE Control Field Injection via CR/LF in writeSSE() - https://github.com/advisories/GHSA-p6xx-57qc-3wxr
Hono vulnerable to arbitrary file access via serveStatic vulnerability  - https://github.com/advisories/GHSA-q5qw-h33p-qvwrHono vulnerable to Prototype Pollution possible through __proto__ key allowed in parseBody({ dot: true }) - https://github.com/advisories/GHSA-v8w9-8mx6-g223
Hono missing validation of cookie name on write path in setCookie() - https://github.com/advisories/GHSA-26pp-8wgv-hjvm
Hono: Non-breaking space prefix bypass in cookie name handling in getCookie() - https://github.com/advisories/GHSA-r5rp-j6wh-rvv4
Hono: Path traversal in toSSG() allows writing files outside the output directory - https://github.com/advisories/GHSA-xf4j-xp2r-rqqx
Hono: Middleware bypass via repeated slashes in serveStatic - https://github.com/advisories/GHSA-wmmm-f939-6g9c
Hono has incorrect IP matching in ipRestriction() for IPv4-mapped IPv6 addresses - https://github.com/advisories/GHSA-xpcf-pg52-r92g
Hono has CSS Declaration Injection via Style Object Values in JSX SSR - https://github.com/advisories/GHSA-qp7p-654g-cw7p
Hono has improper validation of NumericDate claims (exp, nbf, iat) in JWT verify() - https://github.com/advisories/GHSA-hm8q-7f3q-5f36
Hono's Cache Middleware ignores Vary: Authorization / Vary: Cookie leading to cross-user cache leakage - https://github.com/advisories/GHSA-p77w-8qqv-26rm
Hono: bodyLimit() can be bypassed for chunked / unknown-length requests - https://github.com/advisories/GHSA-9vqf-7f2p-gf9vhono/jsx has Unvalidated JSX Tag Names that May Allow HTML Injection - https://github.com/advisories/GHSA-69xw-7hcm-h432
Hono: IP Restriction bypasses static deny rules for non-canonical IPv6  - https://github.com/advisories/GHSA-xrhx-7g5j-rcj5Hono: Cookie helper does not sanitize sameSite and priority, allowing Set-Cookie injection - https://github.com/advisories/GHSA-3hrh-pfw6-9m5x
Hono: JWT middleware accepts any Authorization scheme, not only Bearer - https://github.com/advisories/GHSA-f577-qrjj-4474
Hono: app.mount() strips mount prefix using undecoded path, causing incorrect routing for percent-encoded paths - https://github.com/advisories/GHSA-2gcr-mfcq-wcc3
hono Improperly Handles JSX Attribute Names Allows HTML Injection in hono/jsx SSR - https://github.com/advisories/GHSA-458j-xx4x-4375
hono: Body Limit Middleware can be bypassed on AWS Lambda by understating `Content-Length` - https://github.com/advisories/GHSA-rv63-4mwf-qqc2
hono: Lambda@Edge adapter keeps only the last value of a repeated request header, dropping the rest - https://github.com/advisories/GHSA-wgpf-jwqj-8h8p
hono: CORS Middleware reflects any Origin with credentials when `origin` defaults to the wildcard - https://github.com/advisories/GHSA-88fw-hqm2-52qc
hono: Path traversal in `serve-static` on Windows via encoded backslash (`%5C`) - https://github.com/advisories/GHSA-wwfh-h76j-fc44
hono: AWS Lambda adapter merges multiple `Set-Cookie` headers into one value, dropping cookies on ALB single-header and Lattice - https://github.com/advisories/GHSA-j6c9-x7qj-28xf
Hono: API Gateway v1 adapter can drop a distinct repeated request header value during de-duplication - https://github.com/advisories/GHSA-xgm2-5f3f-mvvc
Hono: Server-Side XSS via JSX Escaping Bypass in cx() Utility - https://github.com/advisories/GHSA-w62v-xxxg-mg59
Hono: ReDoS in CORS middleware via Access-Control-Request-Headers - https://github.com/advisories/GHSA-8j4g-w8fx-2239
Hono: `memo()` retains SSR output across requests, leading to cross-user data disclosure - https://github.com/advisories/GHSA-f23p-vx2j-j53r
Hono: Proxy Helper does not remove response headers listed in the `Connection` header - https://github.com/advisories/GHSA-79qm-7rj5-m7r9
Hono: Incomplete fix for CVE-2026-39408: `toSSG()` still writes files outside the output directory - https://github.com/advisories/GHSA-gqvv-2mrq-wpjv
Hono: Unbounded dot-notation nesting in `parseBody()` can cause memory exhaustion - https://github.com/advisories/GHSA-g6gw-c38x-mqfc
Hono: Query parser reads parameters after the URL fragment, causing cache-key and proxy interpretation differentials - https://github.com/advisories/GHSA-crvj-82cr-hjcx
fix available via `npm audit fix`
node_modules/hono

immutable  <=4.3.8
Severity: high
Immutable is vulnerable to Prototype Pollution - https://github.com/advisories/GHSA-wf6x-7x77-mvgw
Immutable.js `List` 32-bit trie overflow → unrecoverable DoS - https://github.com/advisories/GHSA-v56q-mh7h-f735
Immutable: Hash-collision algorithmic complexity denial of service in Immutable.Map/Set - https://github.com/advisories/GHSA-xvcm-6775-5m9r
fix available via `npm audit fix`
node_modules/immutable

ip-address  <=10.3.0
Severity: high
ip-address has XSS in Address6 HTML-emitting methods - https://github.com/advisories/GHSA-v2v4-37r5-5v8g
ip-address: Address4 decodes leading-zero octets as decimal while resolvers decode them as octal, allowing SSRF and trust-boundary bypass - https://github.com/advisories/GHSA-mwp4-54f8-5fhr
fix available via `npm audit fix`
node_modules/ip-address
  express-rate-limit  8.0.1 - 8.5.0
  Depends on vulnerable versions of ip-address
  node_modules/@openai/agents-core/node_modules/express-rate-limit

js-yaml  <=3.15.1 || 4.0.0 - 4.3.1
Severity: high
JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases - https://github.com/advisories/GHSA-h67p-54hq-rp68
JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases - https://github.com/advisories/GHSA-h67p-54hq-rp68
js-yaml: YAML merge-key chains can force quadratic CPU consumption - https://github.com/advisories/GHSA-52cp-r559-cp3m
js-yaml: YAML merge-key chains can force quadratic CPU consumption - https://github.com/advisories/GHSA-52cp-r559-cp3m
JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported - https://github.com/advisories/GHSA-5p4m-2wfm-xmqj
JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported - https://github.com/advisories/GHSA-5p4m-2wfm-xmqj
js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources - https://github.com/advisories/GHSA-2883-xcg3-v3hh
js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources - https://github.com/advisories/GHSA-2883-xcg3-v3hh
fix available via `npm audit fix --force`
Will install swagger-ui-react@5.32.15, which is outside the stated dependency range
node_modules/@istanbuljs/load-nyc-config/node_modules/js-yaml
node_modules/js-yaml

jspdf  <=4.2.0
Severity: critical
jsPDF has a PDF Object Injection via Unsanitized Input in addJS Method - https://github.com/advisories/GHSA-9vjf-qc39-jprp
jsPDF Affected by Client-Side/Server-Side Denial of Service via Malicious GIF Dimensions - https://github.com/advisories/GHSA-67pg-wm7f-q7fj
jsPDF has a PDF Injection in AcroForm module allows Arbitrary JavaScript Execution (RadioButton.createOption and "AS" property) - https://github.com/advisories/GHSA-p5xg-68wr-hm3m
jsPDF has a PDF Object Injection via FreeText color - https://github.com/advisories/GHSA-7x6v-j9x4-qf24
jsPDF has HTML Injection in New Window paths - https://github.com/advisories/GHSA-wfv2-pwc8-crg5
fix available via `npm audit fix --force`
Will install jspdf@4.2.1, which is outside the stated dependency range
node_modules/jspdf

linkify-it  <=5.0.1
Severity: high
LinkifyIt#match scan loop has quadratic algorithmic complexity - https://github.com/advisories/GHSA-22p9-wv53-3rq4
linkify-it: Quadratic-complexity DoS via the `mailto:` validator scan-loop on attacker text - https://github.com/advisories/GHSA-v245-v573-v5vm
fix available via `npm audit fix --force`
Will install mailparser@3.9.28, which is outside the stated dependency range
node_modules/linkify-it
  mailparser  2.1.0 - 3.9.10
  Depends on vulnerable versions of linkify-it
  Depends on vulnerable versions of nodemailer
  node_modules/mailparser

lodash  <=4.17.23
Severity: high
lodash vulnerable to Code Injection via `_.template` imports key names - https://github.com/advisories/GHSA-r5fr-rjxr-66jc
lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit` - https://github.com/advisories/GHSA-f23m-r3pf-42rh
fix available via `npm audit fix`
node_modules/lodash

lodash-es  <=4.17.23
Severity: high
lodash vulnerable to Code Injection via `_.template` imports key names - https://github.com/advisories/GHSA-r5fr-rjxr-66jc
lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit` - https://github.com/advisories/GHSA-f23m-r3pf-42rh
Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions - https://github.com/advisories/GHSA-xxjr-mmjv-4gpg
fix available via `npm audit fix --force`
Will install mermaid@11.17.2, which is outside the stated dependency range
node_modules/@chevrotain/cst-dts-gen/node_modules/lodash-es
node_modules/@chevrotain/gast/node_modules/lodash-es
node_modules/chevrotain/node_modules/lodash-es
node_modules/lodash-es
  @chevrotain/cst-dts-gen  11.0.0 - 11.1.0
  Depends on vulnerable versions of @chevrotain/gast
  Depends on vulnerable versions of lodash-es
  node_modules/@chevrotain/cst-dts-gen
  @chevrotain/gast  11.0.0 - 11.1.0
  Depends on vulnerable versions of lodash-es
  node_modules/@chevrotain/gast
  chevrotain  11.0.0 - 11.1.0
  Depends on vulnerable versions of @chevrotain/cst-dts-gen
  Depends on vulnerable versions of @chevrotain/gast
  Depends on vulnerable versions of lodash-es
  node_modules/chevrotain
    langium  2.1.0 - 4.1.3
    Depends on vulnerable versions of chevrotain
    node_modules/langium
      @mermaid-js/parser  <=0.6.3
      Depends on vulnerable versions of langium
      node_modules/@mermaid-js/parser
        mermaid  11.0.0-alpha.1 - 11.16.0
        Depends on vulnerable versions of @mermaid-js/parser
        node_modules/mermaid


minimatch  <=3.1.3 || 5.0.0 - 5.1.7 || 9.0.0 - 9.0.6
Severity: high
minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern - https://github.com/advisories/GHSA-3ppc-4f35-3m26
minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern - https://github.com/advisories/GHSA-3ppc-4f35-3m26
minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern - https://github.com/advisories/GHSA-3ppc-4f35-3m26
minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments - https://github.com/advisories/GHSA-7r86-cg39-jmmj
minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments - https://github.com/advisories/GHSA-7r86-cg39-jmmj
minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments - https://github.com/advisories/GHSA-7r86-cg39-jmmj
minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions - https://github.com/advisories/GHSA-23c5-xmqv-rm74
minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions - https://github.com/advisories/GHSA-23c5-xmqv-rm74
minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions - https://github.com/advisories/GHSA-23c5-xmqv-rm74
fix available via `npm audit fix --force`
Will install @typescript-eslint/parser@8.70.0, which is a breaking change
node_modules/@redocly/openapi-core/node_modules/minimatch
node_modules/@ts-morph/common/node_modules/minimatch
node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch
node_modules/glob/node_modules/minimatch
node_modules/minimatch
  @typescript-eslint/typescript-estree  6.16.0 - 7.5.0
  Depends on vulnerable versions of minimatch
  node_modules/@typescript-eslint/typescript-estree
    @typescript-eslint/parser  6.16.0 - 7.5.0
    Depends on vulnerable versions of @typescript-eslint/typescript-estree
    node_modules/@typescript-eslint/parser
    @typescript-eslint/type-utils  6.16.0 - 7.5.0
    Depends on vulnerable versions of @typescript-eslint/typescript-estree
    Depends on vulnerable versions of @typescript-eslint/utils
    node_modules/@typescript-eslint/type-utils
      @typescript-eslint/eslint-plugin  6.16.0 - 7.5.0
      Depends on vulnerable versions of @typescript-eslint/type-utils
      Depends on vulnerable versions of @typescript-eslint/utils
      node_modules/@typescript-eslint/eslint-plugin
    @typescript-eslint/utils  6.16.0 - 7.5.0
    Depends on vulnerable versions of @typescript-eslint/typescript-estree
    node_modules/@typescript-eslint/utils

nanoid  <=3.3.17
Severity: high
nanoid: non-secure generators can loop indefinitely with negative size - https://github.com/advisories/GHSA-28wg-ghj8-5hjv
nanoid: custom generators can loop indefinitely when size is zero - https://github.com/advisories/GHSA-2v37-7h3g-55p8
nanoid: Integer Overflow or Wraparound - https://github.com/advisories/GHSA-xwg4-73v4-xw9w
fix available via `npm audit fix`
node_modules/nanoid

next  9.3.4-canary.0 - 16.3.0-preview.10
Severity: critical
Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration - https://github.com/advisories/GHSA-9g9p-9gw9-jx7f
Next.js: HTTP request smuggling in rewrites - https://github.com/advisories/GHSA-ggv3-7p47-pfv8
Next.js: Unbounded next/image disk cache growth can exhaust storage - https://github.com/advisories/GHSA-3x4c-7xq6-9pq8
Next.js has a Denial of Service with Server Components - https://github.com/advisories/GHSA-q4gf-8mx6-v5v3
Next.js Vulnerable to Denial of Service with Server Components - https://github.com/advisories/GHSA-8h8q-6873-q5fj
Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes - Incomplete Fix Follow-Up - https://github.com/advisories/GHSA-26hh-7cqf-hhc6
Next.js's Middleware / Proxy redirects can be cache-poisoned - https://github.com/advisories/GHSA-3g8h-86w9-wvmq
Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces - https://github.com/advisories/GHSA-ffhc-5mcf-pf4q
Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting - https://github.com/advisories/GHSA-vfv6-92ff-j949
Next.js has cross-site scripting in beforeInteractive scripts with untrusted input - https://github.com/advisories/GHSA-gx5p-jg67-6x7h
Next.js vulnerable to Denial of Service via connection exhaustion in applications using Cache Components - https://github.com/advisories/GHSA-mg66-mrh9-m8jx
Next.js has a Denial of Service in the Image Optimization API - https://github.com/advisories/GHSA-h64f-5h5j-jqjh
Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades - https://github.com/advisories/GHSA-c4j6-fc7j-m34r
Next.js has a Middleware / Proxy bypass through dynamic route parameter injection - https://github.com/advisories/GHSA-492v-c6pp-mqqv
Next.js vulnerable to cache poisoning in React Server Component responses - https://github.com/advisories/GHSA-wfc6-r584-vfw7
Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes - https://github.com/advisories/GHSA-267c-6grr-h53f
Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n - https://github.com/advisories/GHSA-36qx-fr4f-26g5
Next.js: Denial of Service in App Router using Server Actions - https://github.com/advisories/GHSA-m99w-x7hq-7vfj
Next.js: Server-Side Request Forgery in Server Actions on custom servers - https://github.com/advisories/GHSA-89xv-2m56-2m9x
Next.js: Cache confusion of response bodies for requests with bodies - https://github.com/advisories/GHSA-68g3-v927-f742
Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences - https://github.com/advisories/GHSA-4633-3j49-mh5q
Next.js: Unbounded Server Action payload in Edge runtime - https://github.com/advisories/GHSA-4c39-4ccg-62r3
Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname - https://github.com/advisories/GHSA-p9j2-gv94-2wf4
Next.js: Unauthenticated disclosure of internal Server Function endpoints - https://github.com/advisories/GHSA-955p-x3mx-jcvp
Next.js: Unauthenticated Remote Code Execution on windows-hosted servers - https://github.com/advisories/GHSA-p293-qw3h-jr36
Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used - https://github.com/advisories/GHSA-2xp9-vwfh-vxw4
Depends on vulnerable versions of postcss
Depends on vulnerable versions of sharp
fix available via `npm audit fix --force`
Will install next@15.5.25, which is outside the stated dependency range
node_modules/next

nodemailer  <=9.1.0
Severity: high
Nodemailer has SMTP command injection due to unsanitized `envelope.size` parameter - https://github.com/advisories/GHSA-c7w3-x93f-qmm8
Nodemailer Vulnerable to SMTP Command Injection via CRLF in Transport name Option (EHLO/HELO)  - https://github.com/advisories/GHSA-vvjj-xcjg-gr5g
Nodemailer: CRLF injection in Nodemailer List-* header comments allows arbitrary message header injection - https://github.com/advisories/GHSA-268h-hp4c-crq3
Nodemailer jsonTransport bypasses disableFileAccess and disableUrlAccess during message normalization - https://github.com/advisories/GHSA-wqvq-jvpq-h66f
Nodemailer: Improper TLS Certificate Validation in OAuth2 Token Fetch Enables Credential Interception - https://github.com/advisories/GHSA-r7g4-qg5f-qqm2
Nodemailer: Message-level raw option bypasses disableFileAccess/disableUrlAccess, enabling arbitrary file read and full-response SSRF in the delivered message - https://github.com/advisories/GHSA-p6gq-j5cr-w38f
Nodemailer: resolveContent() on a MailMessage bypasses disableFileAccess/disableUrlAccess when called with the legacy signature - https://github.com/advisories/GHSA-8m3c-c648-2xjj
Nodemailer: IDN/Punycode domain allow-list bypass leads to email delivery to an attacker-controlled domain - https://github.com/advisories/GHSA-wmmp-3585-3rmp
Nodemailer: Quadratic (O(n²)) time complexity in addressparser allows remote denial of service via a crafted address list - https://github.com/advisories/GHSA-2x7j-588g-ccc2
Nodemailer: Recipient-domain validation bypass via RFC 5322 comment mis-parsing leads to email delivery to an attacker-controlled domain - https://github.com/advisories/GHSA-cc9r-2j5m-2m83
fix available via `npm audit fix --force`
Will install nodemailer@10.0.10, which is a breaking change
node_modules/mailparser/node_modules/nodemailer
node_modules/nodemailer

path-to-regexp  <=0.1.12 || 8.0.0 - 8.3.0
Severity: high
path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters - https://github.com/advisories/GHSA-37ch-88jc-xwx2
path-to-regexp vulnerable to Denial of Service via sequential optional groups - https://github.com/advisories/GHSA-j3q9-mxjg-w52f
path-to-regexp vulnerable to Regular Expression Denial of Service via multiple wildcards - https://github.com/advisories/GHSA-27v5-c462-wpq7
fix available via `npm audit fix --force`
Will install express@4.22.3, which is outside the stated dependency range
node_modules/express-openapi-validator/node_modules/path-to-regexp
node_modules/path-to-regexp
node_modules/router/node_modules/path-to-regexp

picomatch  <=2.3.1 || 4.0.0 - 4.0.3
Severity: high
Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching - https://github.com/advisories/GHSA-3v7f-55p6-f55p
Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching - https://github.com/advisories/GHSA-3v7f-55p6-f55p
Picomatch has a ReDoS vulnerability via extglob quantifiers - https://github.com/advisories/GHSA-c2c7-rcm5-vvqj
Picomatch has a ReDoS vulnerability via extglob quantifiers - https://github.com/advisories/GHSA-c2c7-rcm5-vvqj
fix available via `npm audit fix`
node_modules/@rollup/plugin-typescript/node_modules/picomatch
node_modules/anymatch/node_modules/picomatch
node_modules/jest-util/node_modules/picomatch
node_modules/micromatch/node_modules/picomatch
node_modules/picomatch
node_modules/readdirp/node_modules/picomatch

postcss  <=8.5.22
Severity: high
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments - https://github.com/advisories/GHSA-6g55-p6wh-862q
PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset - https://github.com/advisories/GHSA-fxqj-rqcc-2cmp
PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure - https://github.com/advisories/GHSA-r28c-9q8g-f849
fix available via `npm audit fix --force`
Will install next@15.5.25, which is outside the stated dependency range
node_modules/next/node_modules/postcss
node_modules/postcss

postcss-selector-parser  6.1.0 - 6.1.2 || 7.1.0 - 7.1.2
postcss-selector-parser allows denial of service through uncontrolled AST recursion - https://github.com/advisories/GHSA-w9m9-85wc-3x92
postcss-selector-parser allows denial of service through uncontrolled AST recursion - https://github.com/advisories/GHSA-w9m9-85wc-3x92
fix available via `npm audit fix`
node_modules/postcss-modules-local-by-default/node_modules/postcss-selector-parser
node_modules/postcss-modules-scope/node_modules/postcss-selector-parser
node_modules/postcss-nested/node_modules/postcss-selector-parser
node_modules/tailwindcss/node_modules/postcss-selector-parser

qs  <=6.15.3
Severity: moderate
qs's arrayLimit bypass in comma parsing allows denial of service - https://github.com/advisories/GHSA-w7fw-mjwx-w883
qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion - https://github.com/advisories/GHSA-6rw7-vpxm-498p
qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set - https://github.com/advisories/GHSA-q8mj-m7cp-5q26
qs array-limit bypass via bracket-key comma parsing - https://github.com/advisories/GHSA-x5fp-wj9c-mxmx
qs: Denial of Service via Attacker Controlled isBuffer - https://github.com/advisories/GHSA-4mjr-xmp4-gh2g
fix available via `npm audit fix --force`
Will install express@4.22.3, which is outside the stated dependency range
node_modules/@modelcontextprotocol/sdk/node_modules/qs
node_modules/@openai/agents-core/node_modules/qs
node_modules/qs

rollup  <2.80.0
Severity: high
Rollup 4 has Arbitrary File Write via Path Traversal - https://github.com/advisories/GHSA-mw96-cpmx-2vgc
fix available via `npm audit fix --force`
Will install rollup@2.80.0, which is outside the stated dependency range
node_modules/rollup

serialize-javascript  <=7.0.4
Severity: high
Serialize JavaScript is Vulnerable to RCE via RegExp.flags and Date.prototype.toISOString() - https://github.com/advisories/GHSA-5c6j-r48x-rmvq
Serialize JavaScript has CPU Exhaustion Denial of Service via crafted array-like objects - https://github.com/advisories/GHSA-qj8w-gfj5-8c6v
fix available via `npm audit fix`
node_modules/serialize-javascript
  terser-webpack-plugin  4.2.1 - 5.3.16
  Depends on vulnerable versions of serialize-javascript
  node_modules/terser-webpack-plugin

sharp  <=0.35.4-rc.0
Severity: high
sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 - https://github.com/advisories/GHSA-f88m-g3jw-g9cj
sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545 - https://github.com/advisories/GHSA-rgj7-g3m4-5g8c
fix available via `npm audit fix --force`
Will install next@15.5.25, which is outside the stated dependency range
node_modules/sharp

showdown  *
Severity: moderate
Showdown vulnerable to Regular Expression Denial of Service (ReDoS) in link/anchor parsing - https://github.com/advisories/GHSA-rmmh-p597-ppvv
showdown metadata title handling allows cross-site scripting - https://github.com/advisories/GHSA-cr32-g25g-vxjj
showdown allows stored cross-site scripting through table header ID injection - https://github.com/advisories/GHSA-22g5-r2x5-97cx
No fix available
node_modules/showdown

socket.io-parser  4.0.0 - 4.2.6
Severity: high
socket.io allows an unbounded number of binary attachments - https://github.com/advisories/GHSA-677m-j7p3-52f9
Socket.IO: Zero-attachment Memory Exhaustion - https://github.com/advisories/GHSA-2m8v-j782-fhvr
fix available via `npm audit fix`
node_modules/socket.io-parser

svgo  1.0.0 - 2.8.3
Severity: high
SVGO DoS through entity expansion in DOCTYPE (Billion Laughs) - https://github.com/advisories/GHSA-xpqw-6gx7-v673
SVGO removeScripts plugin leaves some executable scripts intact - https://github.com/advisories/GHSA-2p49-hgcm-8545
SVGO: removeScripts allows executable links through namespace and control-character bypasses - https://github.com/advisories/GHSA-w27v-7q3p-w38r
SVGO: removeScripts incompletely sanitizes executable HTML in SVG foreignObject elements - https://github.com/advisories/GHSA-4vpr-x523-8j87
fix available via `npm audit fix`
node_modules/svgo

underscore  <=1.13.7
Severity: high
Underscore has unlimited recursion in _.flatten and _.isEqual, potential for DoS attack - https://github.com/advisories/GHSA-qpx9-hpmf-5gmw
fix available via `npm audit fix`
node_modules/underscore

undici  <=6.27.0
Severity: high
Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion - https://github.com/advisories/GHSA-g9mf-h72j-4rw9
Undici has an HTTP Request/Response Smuggling issue - https://github.com/advisories/GHSA-2mjp-6q6p-2qxm
Undici has Unbounded Memory Consumption in WebSocket permessage-deflate Decompression - https://github.com/advisories/GHSA-vrm6-8vpv-qv8q
Undici has Unhandled Exception in WebSocket Client Due to Invalid server_max_window_bits Validation - https://github.com/advisories/GHSA-v9p9-hfj2-hcw8
Undici has CRLF Injection in undici via `upgrade` option - https://github.com/advisories/GHSA-4992-7rv2-5pvq
undici vulnerable to HTTP header injection via Set-Cookie percent-decoding - https://github.com/advisories/GHSA-p88m-4jfj-68fv
undici WebSocket client vulnerable to denial of service via fragment count bypass - https://github.com/advisories/GHSA-vxpw-j846-p89q
undici vulnerable to Set-Cookie SameSite attribute downgrade via permissive substring matching - https://github.com/advisories/GHSA-g8m3-5g58-fq7m
undici vulnerable to downstream response desynchronization via retry interceptor - https://github.com/advisories/GHSA-8xcm-r25x-g524
undici vulnerable to CRLF Injection via blob-like body 'type' property - https://github.com/advisories/GHSA-m8rv-5g2x-5cg5
undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields - https://github.com/advisories/GHSA-v3r7-h72x-cjcm
undici vulnerable to HTTP response queue poisoning via keep-alive socket reuse - https://github.com/advisories/GHSA-35p6-xmwp-9g52
fix available via `npm audit fix --force`
Will install @vercel/blob@2.8.0, which is a breaking change
node_modules/undici
  @vercel/blob  0.0.3 - 2.0.0
  Depends on vulnerable versions of undici
  node_modules/@vercel/blob

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix`
node_modules/uuid

ws  7.0.0 - 7.5.10 || 8.0.0 - 8.20.1
Severity: high
ws: Uninitialized memory disclosure - https://github.com/advisories/GHSA-58qx-3vcg-4xpx
ws: Memory exhaustion DoS from tiny fragments and data chunks - https://github.com/advisories/GHSA-96hv-2xvq-fx4p
ws: Memory exhaustion DoS from tiny fragments and data chunks - https://github.com/advisories/GHSA-96hv-2xvq-fx4p
fix available via `npm audit fix --force`
Will install socket.io-client@4.8.3, which is outside the stated dependency range
node_modules/engine.io-client/node_modules/ws
node_modules/engine.io/node_modules/ws
node_modules/socket.io-adapter/node_modules/ws
node_modules/webpack-bundle-analyzer/node_modules/ws
node_modules/ws
  engine.io-client  0.7.0 || 0.7.8 - 0.7.9 || 6.0.0 - 6.6.4
  Depends on vulnerable versions of ws
  node_modules/engine.io-client
    socket.io-client  4.3.0 - 4.7.5
    Depends on vulnerable versions of engine.io-client
    node_modules/socket.io-client
  socket.io-adapter  2.5.2 - 2.5.6
  Depends on vulnerable versions of ws
  node_modules/socket.io-adapter

xlsx  *
Severity: high
Prototype Pollution in sheetJS - https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
SheetJS Regular Expression Denial of Service (ReDoS) - https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
No fix available
node_modules/xlsx
  markitdown-ts  *
  Depends on vulnerable versions of xlsx
  node_modules/markitdown-ts

yaml  1.0.0 - 1.10.2 || 2.0.0 - 2.8.2
Severity: moderate
yaml is vulnerable to Stack Overflow via deeply nested YAML collections - https://github.com/advisories/GHSA-48c2-rrv3-qjmpyaml is vulnerable to Stack Overflow via deeply nested YAML collections - https://github.com/advisories/GHSA-48c2-rrv3-qjmpfix available via `npm audit fix --force`
Will install yaml@2.9.1, which is outside the stated dependency range
node_modules/cspell-config-lib/node_modules/yaml
node_modules/cssnano/node_modules/yaml
node_modules/postcss-load-config/node_modules/yaml
node_modules/yaml

96 vulnerabilities (4 low, 49 moderate, 40 high, 3 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
