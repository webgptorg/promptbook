# Jest ES Modules Fix for Azure Packages

## Problem
Jest was encountering ES module syntax (`export` statements) in Azure packages like `@azure/core-auth` and `@azure/openai`, causing the following error:

```
SyntaxError: Unexpected token 'export'
```

This happened because:
1. Jest by default expects CommonJS modules
2. Azure packages use ES module syntax
3. The `node_modules` folder is typically ignored by transformers
4. The `@promptbook/wizard` package imports Azure OpenAI tools, which in turn import `@azure/core-auth`

## Solution
Updated `jest.config.js` to properly handle ES modules from Azure and related packages:

### Key Changes:
1. **Transform Patterns**: Added support for `.mjs` files and configured `ts-jest` to handle both TypeScript and JavaScript/ES modules
2. **Transform Ignore Patterns**: Configured Jest to transform specific packages that use ES modules:
   ```javascript
   transformIgnorePatterns: [
       'node_modules/(?!(@azure|@promptbook|@ai-sdk|@anthropic-ai)/)',
   ]
   ```
3. **ES Module Support**: Enabled ESM support with proper TypeScript configuration:
   ```javascript
   extensionsToTreatAsEsm: ['.ts', '.tsx', '.mjs'],
   globals: {
       'ts-jest': {
           useESM: true,
           tsconfig: {
               module: 'esnext',
               target: 'es2020',
               moduleResolution: 'node',
               allowSyntheticDefaultImports: true,
               esModuleInterop: true,
           },
       },
   }
   ```
4. **Module Name Mapping**: Added mapping for `.js` extensions in imports

## Affected Packages
The configuration now properly handles ES modules from:
- `@azure/*` packages (Azure SDK)
- `@promptbook/*` packages (internal packages)
- `@ai-sdk/*` packages (AI SDK)
- `@anthropic-ai/*` packages (Anthropic SDK)

## Usage
This fix applies to any Jest test that directly or indirectly imports:
- `@promptbook/wizard`
- Azure OpenAI tools
- Any other package that depends on Azure SDK packages

The configuration is now compatible with both CommonJS and ES modules, allowing tests to run without the "Unexpected token 'export'" error.
