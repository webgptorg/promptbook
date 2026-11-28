[x] (3 attempts) by Promptbook Developer on Claude Code `claude-opus-5` thinking `max` - Implementation 6.81 39 minutes; Testing 21 minutes; Fixing $2.39 8 minutes; Testing 19 minutes; Fixing $0.00 4 hours; Testing 12 minutes

[✨👉] When installing `ptbk` there are lot of peer dependency warnings, fix it

**Installing on Windows (git bash):**

```console

me@DESKTOP-2QD9KQQ MINGW64 ~/work/tmp/ptbk-install
$ npm i ptbk
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

added 1059 packages, and audited 1060 packages in 12m

144 packages are looking for funding
  run `npm fund` for details

62 vulnerabilities (1 low, 37 moderate, 21 high, 3 critical)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.

me@DESKTOP-2QD9KQQ MINGW64 ~/work/tmp/ptbk-install
$ npm audit
# npm audit report

@modelcontextprotocol/sdk  1.3.0 - 1.25.3
Severity: high
@modelcontextprotocol/sdk has cross-client data leak via shared server/transport instance reuse - https://github.com/advisories/GHSA-345p-7cg4-v4c7
Anthropic's MCP TypeScript SDK has a ReDoS vulnerability - https://github.com/advisories/GHSA-8r9q-7v3j-jr4g
fix available via `npm audit fix --force`
Will install ptbk@0.110.0, which is a breaking change
node_modules/@promptbook/cli/node_modules/@modelcontextprotocol/sdk
  @promptbook/cli  >=0.64.0-0
  Depends on vulnerable versions of @ai-sdk/deepseek
  Depends on vulnerable versions of @ai-sdk/google
  Depends on vulnerable versions of @ai-sdk/openai
  Depends on vulnerable versions of @aws-sdk/client-s3
  Depends on vulnerable versions of @modelcontextprotocol/sdk
  Depends on vulnerable versions of @vercel/blob
  Depends on vulnerable versions of dompurify
  Depends on vulnerable versions of express
  Depends on vulnerable versions of jspdf
  Depends on vulnerable versions of localtunnel
  Depends on vulnerable versions of mailparser
  Depends on vulnerable versions of markitdown-ts
  Depends on vulnerable versions of monaco-editor
  Depends on vulnerable versions of next
  Depends on vulnerable versions of nodemailer
  Depends on vulnerable versions of postcss
  Depends on vulnerable versions of showdown
  Depends on vulnerable versions of socket.io-client
  node_modules/@promptbook/cli
    promptbook  *
    Depends on vulnerable versions of @promptbook/anthropic-claude
    Depends on vulnerable versions of @promptbook/cli
    Depends on vulnerable versions of @promptbook/components
    Depends on vulnerable versions of @promptbook/deepseek
    Depends on vulnerable versions of @promptbook/google
    Depends on vulnerable versions of @promptbook/markitdown
    Depends on vulnerable versions of @promptbook/openai
    Depends on vulnerable versions of @promptbook/pdf
    Depends on vulnerable versions of @promptbook/remote-client
    Depends on vulnerable versions of @promptbook/remote-server
    Depends on vulnerable versions of @promptbook/website-crawler
    Depends on vulnerable versions of @promptbook/wizard
    node_modules/promptbook
      ptbk  >=0.111.0-0
      Depends on vulnerable versions of promptbook
      node_modules/ptbk

axios  <=0.32.0
Severity: high
Axios Cross-Site Request Forgery Vulnerability - https://github.com/advisories/GHSA-wf5p-g6vw-rhxx
axios Requests Vulnerable To Possible SSRF and Credential Leakage via Absolute URL - https://github.com/advisories/GHSA-jr5f-v2jv-69x6
Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF - https://github.com/advisories/GHSA-3p68-rc4w-qgx5Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy - https://github.com/advisories/GHSA-w9j2-pvgh-6h63
Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0 - https://github.com/advisories/GHSA-pmwg-cvhr-8vh7
Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams - https://github.com/advisories/GHSA-xhjh-pmcv-23jw
Axios: no_proxy bypass via IP alias allows SSRF - https://github.com/advisories/GHSA-m7pr-hjqh-92cm
Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0 - https://github.com/advisories/GHSA-5c9x-8gcm-mpgx
Axios: HTTP adapter streamed responses bypass maxContentLength - https://github.com/advisories/GHSA-vf2m-468p-8v99
Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking - https://github.com/advisories/GHSA-pf86-5x62-jrwf
Axios: Header Injection via Prototype Pollution - https://github.com/advisories/GHSA-6chq-wfr3-2hj9
Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion - https://github.com/advisories/GHSA-xx6v-rp6x-q39c
Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig - https://github.com/advisories/GHSA-43fc-jf86-j433
Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain - https://github.com/advisories/GHSA-fvcv-3m26-pcqx
Axios: unbounded recursion in toFormData causes DoS via deeply nested request data - https://github.com/advisories/GHSA-62hf-57xw-28j9
Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection - https://github.com/advisories/GHSA-hfxv-24rg-xrqf
Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter - https://github.com/advisories/GHSA-p92q-9vqr-4j8v
Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection - https://github.com/advisories/GHSA-j5f8-grm9-p9fc
axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge - https://github.com/advisories/GHSA-3g43-6gmg-66jw
axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions - https://github.com/advisories/GHSA-898c-q2cr-xwhg
axios's shouldBypassProxy does not recognize IPv4-mapped IPv6 addresses, allowing NO_PROXY bypass (incomplete fix for CVE-2025-62718) - https://github.com/advisories/GHSA-pjwm-pj3p-43mv
Axios: Prototype pollution gadgets can alter axios request construction - https://github.com/advisories/GHSA-mmx7-hfxf-jppx
Axios: Nested axios option objects can consume polluted prototype values - https://github.com/advisories/GHSA-7q8q-rj6j-mhjq
fix available via `npm audit fix`
node_modules/localtunnel/node_modules/axios
  localtunnel  >=1.9.0
  Depends on vulnerable versions of axios
  node_modules/localtunnel

body-parser  <=1.20.6 || 2.0.0-beta.1 - 2.0.2
Severity: moderate
body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement - https://github.com/advisories/GHSA-v422-hmwv-36x6
Depends on vulnerable versions of qs
fix available via `npm audit fix --force`
Will install ptbk@0.110.0, which is a breaking change
node_modules/@promptbook/cli/node_modules/express/node_modules/body-parser
node_modules/@promptbook/remote-server/node_modules/body-parser
  express  4.0.0-rc1 - 4.22.2 || 5.0.0-alpha.1 - 5.0.1
  Depends on vulnerable versions of body-parser
  Depends on vulnerable versions of path-to-regexp
  Depends on vulnerable versions of qs
  node_modules/@promptbook/cli/node_modules/express
  node_modules/@promptbook/remote-server/node_modules/express
    @promptbook/remote-server  >=0.89.0-1
    Depends on vulnerable versions of express
    node_modules/@promptbook/remote-server

dompurify  <=3.4.12
Severity: moderate
DOMPurify allows Cross-site Scripting (XSS) - https://github.com/advisories/GHSA-vhxf-7vqr-mrjg
DOMPurify contains a Cross-site Scripting vulnerability - https://github.com/advisories/GHSA-v8jm-5vwx-cfxm
DOMPurify contains a Cross-site Scripting vulnerability - https://github.com/advisories/GHSA-v2wj-7wpq-c8vv
DOMPurify: FORBID_TAGS bypassed by function-based ADD_TAGS predicate (asymmetry with FORBID_ATTR fix) - https://github.com/advisories/GHSA-h7mw-gpvr-xq4m
DOMPurify has a SAFE_FOR_TEMPLATES bypass in RETURN_DOM mode - https://github.com/advisories/GHSA-crv5-9vww-q3g8
DOMPurify: Prototype Pollution to XSS Bypass via CUSTOM_ELEMENT_HANDLING Fallback - https://github.com/advisories/GHSA-v9jr-rg53-9pgp
DOMPurify: Cross-realm IN_PLACE sanitization leaves executable markup intact via realm-bound `instanceof` checks - https://github.com/advisories/GHSA-hpcv-96wg-7vj8
DOMPurify: IN_PLACE mode preserves attributes of a clobbered root element, allowing XSS via attacker-controlled root DOM- https://github.com/advisories/GHSA-r47g-fvhr-h676
DOMPurify IN_PLACE Sanitization Bypass via Attached Shadow Root Inside <template>.content - https://github.com/advisories/GHSA-rp9w-3fw7-7cwq
DOMPurify: `CUSTOM_ELEMENT_HANDLING` bypasses `afterSanitizeElements` for allowed custom elements. - https://github.com/advisories/GHSA-c2j3-45gr-mqc4
DOMPurify: Permanent `ALLOWED_ATTR` pollution via `setConfig()` bypassing the hook clone-guard (incomplete fix of the 3.4.7 hook-pollution patch) - https://github.com/advisories/GHSA-cmwh-pvxp-8882
DOMPurify: Trusted Types policy survives `clearConfig()` and can poison later `RETURN_TRUSTED_TYPE` output - https://github.com/advisories/GHSA-vxr8-fq34-vvx9
DOMPurify: SAFE_FOR_TEMPLATES bypass - template expressions survive sanitization inside <template> content when using DOM output modes - https://github.com/advisories/GHSA-gvmj-g25r-r7wr
DOMPurify: `IN_PLACE` mode trusts attacker-controlled `nodeName` on live non-form nodes, allowing script retention and XSS via attacker-supplied DOM objects - https://github.com/advisories/GHSA-x4vx-rjvf-j5p4
DOMPurify: Hook mutation of `data.allowedTags` / `data.allowedAttributes` permanently pollutes `DEFAULT_ALLOWED_TAGS` / `DEFAULT_ALLOWED_ATTR` - https://github.com/advisories/GHSA-76mc-f452-cxcm
DOMPurify's ADD_TAGS function form bypasses FORBID_TAGS due to short-circuit evaluation - https://github.com/advisories/GHSA-39q2-94rc-95cp
DOMPurify ADD_ATTR predicate skips URI validation - https://github.com/advisories/GHSA-cjmm-f4jc-qw8r
DOMPurify USE_PROFILES prototype pollution allows event handlers - https://github.com/advisories/GHSA-cj63-jhhr-wcxv
DOMPurify is vulnerable to mutation-XSS via Re-Contextualization  - https://github.com/advisories/GHSA-h8r8-wccr-v5f2
DOMPurify: IN_PLACE hook removal leaves a detached subtree executable, causing XSS - https://github.com/advisories/GHSA-55q2-fjhq-7xh7
fix available via `npm audit fix`
node_modules/dompurify
node_modules/monaco-editor/node_modules/dompurify
  @promptbook/components  >=0.100.3-0
  Depends on vulnerable versions of dompurify
  Depends on vulnerable versions of jspdf
  Depends on vulnerable versions of showdown
  node_modules/@promptbook/components
  monaco-editor  0.54.0-dev-20250909 - 0.55.0-rc
  Depends on vulnerable versions of dompurify
  node_modules/monaco-editor

fast-xml-parser  <=5.6.0
Severity: critical
fast-xml-parser has RangeError DoS Numeric Entities Bug - https://github.com/advisories/GHSA-37qj-frw5-hhjh
fast-xml-parser has an entity encoding bypass via regex injection in DOCTYPE entity names - https://github.com/advisories/GHSA-m7jm-9gc2-mpf2
fast-xml-parser affected by DoS through entity expansion in DOCTYPE (no expansion limit) - https://github.com/advisories/GHSA-jmr7-xgp7-cmfj
fast-xml-parser has stack overflow in XMLBuilder with preserveOrder - https://github.com/advisories/GHSA-fj3w-jwp8-x2g3
fast-xml-parser affected by numeric entity expansion bypassing all entity expansion limits (incomplete fix for CVE-2026-26278) - https://github.com/advisories/GHSA-8gc5-j5rx-235r
Entity Expansion Limits Bypassed When Set to Zero Due to JavaScript Falsy Evaluation in fast-xml-parser - https://github.com/advisories/GHSA-jp2q-39xq-3w4g
fast-xml-parser XMLBuilder: XML Comment and CDATA Injection via Unescaped Delimiters - https://github.com/advisories/GHSA-gh4j-gqv2-49f6
fix available via `npm audit fix`
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

jspdf  <=4.2.0
Severity: critical
jsPDF has a PDF Object Injection via Unsanitized Input in addJS Method - https://github.com/advisories/GHSA-9vjf-qc39-jprp
jsPDF Affected by Client-Side/Server-Side Denial of Service via Malicious GIF Dimensions - https://github.com/advisories/GHSA-67pg-wm7f-q7fj
jsPDF has a PDF Injection in AcroForm module allows Arbitrary JavaScript Execution (RadioButton.createOption and "AS" property) - https://github.com/advisories/GHSA-p5xg-68wr-hm3m
jsPDF has a PDF Object Injection via FreeText color - https://github.com/advisories/GHSA-7x6v-j9x4-qf24
jsPDF has HTML Injection in New Window paths - https://github.com/advisories/GHSA-wfv2-pwc8-crg5
fix available via `npm audit fix`
node_modules/jspdf

linkify-it  <=5.0.1
Severity: high
LinkifyIt#match scan loop has quadratic algorithmic complexity - https://github.com/advisories/GHSA-22p9-wv53-3rq4
linkify-it: Quadratic-complexity DoS via the `mailto:` validator scan-loop on attacker text - https://github.com/advisories/GHSA-v245-v573-v5vm
fix available via `npm audit fix`
node_modules/linkify-it
  mailparser  2.1.0 - 3.9.10
  Depends on vulnerable versions of linkify-it
  Depends on vulnerable versions of nodemailer
  node_modules/mailparser

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
fix available via `npm audit fix`
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
fix available via `npm audit fix`
node_modules/mailparser/node_modules/nodemailer
node_modules/nodemailer

path-to-regexp  <0.1.13
Severity: high
path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters - https://github.com/advisories/GHSA-37ch-88jc-xwx2
fix available via `npm audit fix --force`
Will install ptbk@0.110.0, which is a breaking change
node_modules/@promptbook/cli/node_modules/path-to-regexp
node_modules/@promptbook/remote-server/node_modules/path-to-regexp

postcss  <=8.5.22
Severity: high
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments - https://github.com/advisories/GHSA-6g55-p6wh-862q
PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset - https://github.com/advisories/GHSA-fxqj-rqcc-2cmp
PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure -https://github.com/advisories/GHSA-r28c-9q8g-f849
fix available via `npm audit fix`
node_modules/next/node_modules/postcss
node_modules/postcss

qs  <=6.15.3
Severity: moderate
qs's arrayLimit bypass in comma parsing allows denial of service - https://github.com/advisories/GHSA-w7fw-mjwx-w883
qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion - https://github.com/advisories/GHSA-6rw7-vpxm-498p
qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set - https://github.com/advisories/GHSA-q8mj-m7cp-5q26
qs: Denial of Service via Attacker Controlled isBuffer - https://github.com/advisories/GHSA-4mjr-xmp4-gh2g
fix available via `npm audit fix --force`
Will install ptbk@0.110.0, which is a breaking change
node_modules/@promptbook/cli/node_modules/express/node_modules/qs
node_modules/@promptbook/remote-server/node_modules/qs

sharp  <=0.35.4-rc.0
Severity: high
sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 - https://github.com/advisories/GHSA-f88m-g3jw-g9cj
sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545 - https://github.com/advisories/GHSA-rgj7-g3m4-5g8c
fix available via `npm audit fix`
node_modules/sharp

showdown  *
Severity: moderate
Showdown vulnerable to Regular Expression Denial of Service (ReDoS) in link/anchor parsing - https://github.com/advisories/GHSA-rmmh-p597-ppvv
showdown metadata title handling allows cross-site scripting - https://github.com/advisories/GHSA-cr32-g25g-vxjj
showdown allows stored cross-site scripting through table header ID injection - https://github.com/advisories/GHSA-22g5-r2x5-97cx
fix available via `npm audit fix --force`
Will install ptbk@0.110.0, which is a breaking change
node_modules/showdown
  @promptbook/website-crawler  *
  Depends on vulnerable versions of showdown
  node_modules/@promptbook/website-crawler
  @promptbook/wizard  *
  Depends on vulnerable versions of @ai-sdk/deepseek
  Depends on vulnerable versions of @ai-sdk/google
  Depends on vulnerable versions of markitdown-ts
  Depends on vulnerable versions of showdown
  Depends on vulnerable versions of socket.io-client
  node_modules/@promptbook/wizard

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
Will install ptbk@0.110.0, which is a breaking change
node_modules/undici
  @ai-sdk/provider-utils  3.0.31 - 3.0.37 || 4.0.41 - 4.0.45
  Depends on vulnerable versions of undici
  node_modules/@ai-sdk/provider-utils
    @ai-sdk/deepseek  1.0.49 - 1.0.57 || 2.0.51 - 2.0.55
    Depends on vulnerable versions of @ai-sdk/provider-utils
    node_modules/@ai-sdk/deepseek
      @promptbook/deepseek  >=0.113.0-0
      Depends on vulnerable versions of @ai-sdk/deepseek
      node_modules/@promptbook/deepseek
    @ai-sdk/google  2.0.86 - 2.0.97 || 3.0.103 - 3.0.109
    Depends on vulnerable versions of @ai-sdk/provider-utils
    node_modules/@ai-sdk/google
      @promptbook/google  >=0.113.0-0
      Depends on vulnerable versions of @ai-sdk/google
      node_modules/@promptbook/google
    @ai-sdk/openai  2.0.117 - 2.0.127 || 3.0.90 - 3.0.96
    Depends on vulnerable versions of @ai-sdk/provider-utils
    node_modules/@ai-sdk/openai
  @vercel/blob  0.0.3 - 2.0.0
  Depends on vulnerable versions of undici
  node_modules/@vercel/blob

ws  8.0.0 - 8.20.1
Severity: high
ws: Uninitialized memory disclosure - https://github.com/advisories/GHSA-58qx-3vcg-4xpx
ws: Memory exhaustion DoS from tiny fragments and data chunks - https://github.com/advisories/GHSA-96hv-2xvq-fx4p
fix available via `npm audit fix --force`
Will install ptbk@0.110.0, which is a breaking change
node_modules/engine.io-client/node_modules/ws
  engine.io-client  0.7.0 || 0.7.8 - 0.7.9 || 6.0.0 - 6.6.4
  Depends on vulnerable versions of ws
  node_modules/engine.io-client
    socket.io-client  4.3.0 - 4.7.5
    Depends on vulnerable versions of engine.io-client
    node_modules/socket.io-client
      @promptbook/anthropic-claude  >=0.64.0-0
      Depends on vulnerable versions of socket.io-client
      node_modules/@promptbook/anthropic-claude
      @promptbook/openai  >=0.98.0-2
      Depends on vulnerable versions of socket.io-client
      node_modules/@promptbook/openai
      @promptbook/remote-client  *
      Depends on vulnerable versions of socket.io-client
      node_modules/@promptbook/remote-client

xlsx  *
Severity: high
Prototype Pollution in sheetJS - https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
SheetJS Regular Expression Denial of Service (ReDoS) - https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
fix available via `npm audit fix --force`
Will install ptbk@0.110.0, which is a breaking change
node_modules/xlsx
  markitdown-ts  *
  Depends on vulnerable versions of xlsx
  node_modules/markitdown-ts
    @promptbook/markitdown  *
    Depends on vulnerable versions of markitdown-ts
    node_modules/@promptbook/markitdown
    @promptbook/pdf  >=0.84.0-0
    Depends on vulnerable versions of markitdown-ts
    node_modules/@promptbook/pdf

62 vulnerabilities (1 low, 37 moderate, 21 high, 3 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

me@DESKTOP-2QD9KQQ MINGW64 ~/work/tmp/ptbk-install
$
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

