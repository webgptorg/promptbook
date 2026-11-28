[🔘] There is a compatibility when using import '@ai-sdk/google'

```bash
SyntaxError: Unexpected token 'export'

  at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1728:14)
  at Object.<anonymous> (node_modules/@ai-sdk/provider-utils/src/response-handler.ts:5:8)


SyntaxError: Unexpected token 'export'

  at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1728:14)
  at Object.<anonymous> (node_modules/@ai-sdk/provider-utils/src/response-handler.ts:5:8)

SyntaxError: Unexpected token 'export'

  at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1728:14)
  at Object.<anonymous> (node_modules/@ai-sdk/provider-utils/src/response-handler.ts:5:8)
  at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1728:14)
  at Object.<anonymous> (node_modules/@ai-sdk/provider-utils/src/response-handler.ts:5:8)

  at Object.<anonymous> (node_modules/@ai-sdk/provider-utils/src/response-handler.ts:5:8)
```

```bash
npm ls eventsource-parser
promptbook@0.77.0-2 C:\Users\me\work\ai\promptbook
└─┬ @ai-sdk/google@1.0.5
  └─┬ @ai-sdk/provider-utils@2.0.3
    └── eventsource-parser@3.0.0
```
