[x]

[✨🌇] Remove Tailwind

-   Remove dependency of BookEditor on Tailwind, `</BookEditor>` should bring its styles with the import
-   The `BookEditor` should looks same as now, just move the styles

```typescript
import { BookEditor } from '@promptbook/components';

function App() {
    return (
        <BookEditor
        // ...
        />
        // <- This should bring all styles needed without any additional imports
    );
}
```

Same here:

```typescript
const BookEditor = dynamic(() => import('@promptbook/components').then((mod) => mod.BookEditor), { ssr: false });

function App() {
    return (
        <BookEditor
        // ...
        />
        // <- This should bring all styles needed without any additional imports
    );
}
```

---

[-]

[✨🌇] Use CSS modules

-   In file `src/book-components/BookEditor/BookEditor.tsx`
-   Keep the styles same but move them from `BOOK_EDITOR_STYLES` in `BookEditor.module.css`
-   Remove `BOOK_EDITOR_STYLES` variable
-   Update the build process to include CSS modules
-   Update `./scripts/components-playground-server.ts`

---

[-]

[✨🌇] bar

---

[-]

[✨🌇] bar

```

```
