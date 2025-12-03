[x]

[✨🦪] Look at [BookEditorPreview](/book-components/src/components/book-editor/BookEditorPreview.tsx)

It should import `BookEditor` and other things from [src folder](/src) but now the imports are errored.

-   The [book-components](/book-components/) is subproject which is supposed to preview the components from the main project and create a nice preview page
-   Add alias to `paths` at [tsconfig.json](book-components/tsconfig.json) of the subproject

The imports in this subproject should look like:

```typescript
import { BookEditor } from '@promptbook-local/book-components/BookEditor/BookEditor';
```

Now there is error:

```bash
./src/components/book-editor/BookEditorPreview.tsx:5:1
Module not found: Can't resolve '@promptbook-local/book-components/BookEditor/BookEditor'
  3 | import { DEFAULT_BOOK, getAllCommitmentDefinitions, parseAgentSource } from '@promptbook-local/_packages/core.index';
  4 | import type { string_book } from '@promptbook-local/_packages/types.index';
> 5 | import { BookEditor } from '@promptbook-local/book-components/BookEditor/BookEditor';
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  6 | import { useMemo, useState } from 'react';
  7 | import ReactMarkdown from 'react-markdown';
  8 |

Import map: aliased to relative '../../src' inside of [project]/


Import trace:
  ./src/components/book-editor/BookEditorPreview.tsx [Client Component Browser]
  ./src/components/ComponentPreview.tsx [Client Component Browser]
  ./src/components/ComponentPreview.tsx [Server Component]
  ./src/app/component/[id]/page.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found
```

![alt text](screenshots/2025-08-0080-moving-book-components.png)

---

[-]

[✨🦪] qux

---

[-]

[✨🦪] qux

---

[-]

[✨🦪] qux
