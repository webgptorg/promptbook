# Agents Server `/system/user-wallet` E2E dynamic rendering failure

While verifying the Internal S3 browser and files-gallery admin pages, `npm run test-app-agents-server` failed outside the touched storage area.

The Agents Server lint and production build completed successfully, but the Playwright e2e phase failed after the web server reported an unhandled rejection:

```text
Dynamic server usage: Route /system/user-wallet couldn't be rendered statically because it used `cookies`.
```

The diagnostic points to `/system/user-wallet` during static rendering in the e2e build (`.next-e2e`). This appears unrelated to `/admin/internal-s3`, `/admin/files`, S3 browsing, or file-gallery data normalization.

