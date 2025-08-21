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

[ ]

[✨🌇] bar

---

[ ]

[✨🌇] bar

---

[ ]

[✨🌇] bar

```

```
