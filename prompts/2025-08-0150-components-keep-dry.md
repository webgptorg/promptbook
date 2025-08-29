[ ]

[✨🕳] Refactor components to Keep in mind DRY (Don't Repeat Yourself) principle

Every component is in multiple places, try to make the system of organization better and have single source of truth for each component.

1.  Component implementation itself in `/src/book-components`

    -   Alongside the component implementation is its jsdoc and props type

2.  Component preview in `/scripts/book-components/src/components`
    -   preview file
    -   `component.yaml` files
    -   There is also a `README.md` alongside the preview component
3.  Also each component preview is registered in `/scripts/book-components/src/components/ComponentPreview.tsx`

For example BookEditor:

1.  Is implemented in `/src/book-components/BookEditor`
2.  The preview is in `/scripts/book-components/src/components/book-editor/BookEditorPreview.tsx`,`/scripts/book-components/src/components/book-editor/component.yml`, `/scripts/book-components/src/components/book-editor/README.md`
3.  There is a usage of this preview in `/scripts/book-components/src/components/ComponentPreview.tsx`

```typescript
    case 'book-editor':
        return (
            <div className="p-6">
                <BookEditorPreview />
            </div>
        );
```

There should be ONE place where each component is defined, with all its variations and usages derived from that definition.
This can be referenced in some index file, but in this index file should be simple single reference, not the whole component again like in `ComponentPreview.tsx` now.

Do a refactoring to fix this.

---

[ ]

[✨🕳] foo

---

[ ]

[✨🕳] foo

---

[ ]

[✨🕳] foo
