[x][x][ ][ ][ ][ ][ ][ ]

[✨☠️] Across the repository use explicit types instead of type inference where possible

**For example:**

```typescript
// Bad - type inference
const result = await someFunction();
```

```typescript
// Good - explicit type
const result: SomeType = await someFunction();
```

-   Use it in variable declarations, function return types, object properties, etc.
-   We strongly prefer explicit types to improve code readability and maintainability.
-   It is a good double check to ensure that the inferred type matches the intended type.
-   When the type is advance do not be shy to use utility types like `Partial<T>`, `Pick<T, K>`, `Record<K, T>`, etc. or types from `type-fest` package or [use or create custom utility types](/src/types/)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
