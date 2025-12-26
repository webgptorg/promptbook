[x][x][x][ ][ ][ ][ ][ ]

[✨📵] Do not use abbreviations in variable names

-   When naming variables, functions, classes, or any identifiers in the codebase, avoid using abbreviations that may not be immediately clear to all readers.
-   Especially avoid using single-letter or very short abbreviations that can lead to confusion about the purpose or type of the variable.
-   Search across the repository

**Do not use:**

```typescript
const transpiler = transpilers.find((t) => t.name === e.target.value);
```

**Use instead:**

```typescript
const transpiler = transpilers.find((transpiler) => transpiler.name === event.target.value);
```
