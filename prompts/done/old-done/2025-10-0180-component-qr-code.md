[x]

[✨🕘] Bring QR code into the project, take the logic from external project (`webgptorg/promptbook-studio`) where its already implemented

-   There are 3 components:
    1. `PromptbookQrCode` - QR code with Promptbook branding
    2. `BrandedQrCode` - QR code with any branding (logo in the center) passed via props
    3. `GenericQrCode` - simple QR code without any branding
-   `PromptbookQrCode` is internally using `BrandedQrCode`, which in internally using `GenericQrCode`
-   All 3 components are exported via `@promptbook/components` package - add "@public exported from `@promptbook/components`" into their JSDoc comments
-   All 3 components should have at leasr `size` prop (number, default 250) and `value` prop (`string|number`, required) and `className` prop (string, optional), look how other components are implemented for reference
-   The components should be placed in `/src/book-components/Qr`
-   The QR code component is in `C:/Users/me/work/webgptorg/promptbook-studio/src/components/QrCode`
-   Add the QR code preview to `book-components` website under `/apps/book-components` with code and usage samples, simple QR code preview,..., look how other components are previewed there
    -   This preview should look like supersimple miniapp with one text field to enter for example URL and preview area below to show all the 3 QR code types with that URL encoded
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨🕘] Add `PromptbookQrCode` component preview`

-   Look at folder `/book-components/src/components`
-   Make preview for `<PromptbookQrCode/>` component `/src/book-components/Qr/PromptbookQrCode.tsx`
-   Look how other previews are made
    -   Make a preview component
    -   Also a `component.json` file
    -   Register it in `/book-components/src/components/ComponentPreview.tsx`
-   Keep in mind DRY (Don't Repeat Yourself) principle

---

[-]

[✨🕘] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🕘] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
