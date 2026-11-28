<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# 🐜 Error report from Promptbook.Studio

-   Author: [hejny](https://github.com/hejny)
-   Created at: 6/25/2025, 8:06:34 PM
-   Updated at: 6/25/2025, 8:06:34 PM
-   Labels:
-   Issue: #272

`Error` has occurred in the [Promptbook.Studio](https://promptbook.studio/), please look into it @hejny.

```
Unrecognized extension value in extension set ([object Object]). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.
```

## More info:

-   **App version:** 1.14.0-2
-   **Promptbook engine version:** 0.98.0
-   **Book language version:** 1.0.0
-   **URL:** https://promptbook.studio/
-   **User agent:** Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36
-   **Time:** 2025-06-25T18:06:28.415Z
-   **User Session:**
    {
    "email": "me+local-promptbook-studio-1@pavolhejny.com",
    "userId": "f12ba63b4063dcef13712735b6450b8c5aad1187d78f2014ffb2e98fddfea3fb",
    "userToken": "i6ktOv7fs3RKO1R9Ckqaq5ilUXsV54YS"
    }

<details>
<summary>Stack trace:</summary>

## Stack trace:

```stacktrace
Error: Unrecognized extension value in extension set ([object Object]). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.
    at inner (https://promptbook.studio/_next/static/chunks/1703.f762a47545ac4d34.js:1:258005)
    at inner (https://promptbook.studio/_next/static/chunks/1703.f762a47545ac4d34.js:1:257522)
    at inner (https://promptbook.studio/_next/static/chunks/1703.f762a47545ac4d34.js:1:257522)
    at inner (https://promptbook.studio/_next/static/chunks/1703.f762a47545ac4d34.js:1:257522)
    at Configuration.resolve (https://promptbook.studio/_next/static/chunks/1703.f762a47545ac4d34.js:1:258191)
    at EditorState.create (https://promptbook.studio/_next/static/chunks/1703.f762a47545ac4d34.js:1:267619)
    at ref (https://promptbook.studio/_next/static/chunks/324.e5412fcf7ddffe82.js:1:1158)
    at Sj (https://promptbook.studio/_next/static/chunks/framework-648562dbf67761e3.js:9:84296)
    at lk (https://promptbook.studio/_next/static/chunks/framework-648562dbf67761e3.js:9:91459)
    at jk (https://promptbook.studio/_next/static/chunks/framework-648562dbf67761e3.js:9:111106)
    at https://promptbook.studio/_next/static/chunks/framework-648562dbf67761e3.js:9:111117
    at Qk (https://promptbook.studio/_next/static/chunks/framework-648562dbf67761e3.js:9:111629)
    at Fk (https://promptbook.studio/_next/static/chunks/framework-648562dbf67761e3.js:9:96298)
    at jg (https://promptbook.studio/_next/static/chunks/framework-648562dbf67761e3.js:9:44901)
    at https://promptbook.studio/_next/static/chunks/framework-648562dbf67761e3.js:9:93663
```

</details>
