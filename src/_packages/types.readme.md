This package is usefull when you want to explicitly define types in your code.

```typescript
import type { PromptbookJson } from '@promptbook/types';
import { promptbookStringToJson } from '@promptbook/core';

const promptbook: PromptbookJson = promptbookStringToJson(...);
```
