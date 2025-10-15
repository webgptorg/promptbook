[ ]

[✨🕳] Refactor components to Keep in mind DRY (Don't Repeat Yourself) principle

Every component is in multiple places, try to make the system of organization better and have single source of truth for each component.

1.  Component implementation itself in `/src/book-components`

    -   Alongside the component implementation is its jsdoc and props type

2.  Component preview in `/book-components/src/components`
    -   preview file
    -   `component.yaml` files
    -   There is also a `README.md` alongside the preview component
3.  Also each component preview is registered in `/book-components/src/components/ComponentPreview.tsx`

For example BookEditor:

1.  Is implemented in `/src/book-components/BookEditor`
2.  The preview is in `/book-components/src/components/book-editor/BookEditorPreview.tsx`,`/book-components/src/components/book-editor/component.yml`, `/book-components/src/components/book-editor/README.md`
3.  There is a usage of this preview in `/book-components/src/components/ComponentPreview.tsx`

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

Some ideas what to do:

-   Each component should be in one folder component + preview, adding new component will became just copying this folder and registering it in index
-   In this folder there will be subfolder `examples` with example usages of the component, this will be used both instead of examples in `component.yaml` and for the component preview
-   There will be one README.md file that explains the component and its usage and this will be taken as description instead of description in `component.yaml`
-   Props which are described in `component.yaml` should be taken from the props type of the component itself
-   You can process theese information in runtime (for example in `getAllComponents()`) or generate it via script

Now do this refactoring

---

[ ]

[✨🕳] foo

---

[ ]

[✨🕳] foo

---

[ ]

[✨🕳] foo
