# GitHub App Integration For `USE PROJECT`

This document explains how to configure GitHub App authentication in Agents Server so `USE PROJECT` can get GitHub tokens automatically.

## What This Enables

-   Users can connect GitHub once from wallet/chat popup.
-   Agents Server mints GitHub App installation tokens automatically.
-   Token is stored in user wallet automatically.
-   Manual wallet token entry/edit is still supported (and has priority when present).

## 1. Create GitHub App

1. Open GitHub: `Settings -> Developer settings -> GitHub Apps -> New GitHub App`.
2. Set:
    -   **GitHub App name**: choose unique name.
    -   **Homepage URL**: your Agents Server URL, for example `https://your-server.example.com`.
    -   **Setup URL**: `https://your-server.example.com/api/github-app/callback`
3. Permissions (minimum for `USE PROJECT`):
    -   **Repository permissions -> Contents**: `Read and write`
    -   **Repository permissions -> Pull requests**: `Read and write`
    -   **Repository permissions -> Metadata**: `Read-only`
4. Save the app.
5. Generate a **Private key** in the app settings and download `.pem`.

## 2. Configure Agents Server `.env`

Add these variables into `apps/agents-server/.env`:

```bash
GITHUB_APP_ID=<numeric_app_id>
GITHUB_APP_SLUG=<app_slug_from_url>
GITHUB_APP_PRIVATE_KEY="<full_pem_content_with_\n>"
GITHUB_APP_STATE_SECRET=<long_random_secret>
```

Notes:

-   `GITHUB_APP_SLUG` is from URL `https://github.com/apps/<slug>`.
-   For `GITHUB_APP_PRIVATE_KEY`, keep PEM formatting. If using one line, replace line breaks with `\n`.
-   `GITHUB_APP_STATE_SECRET` is used to sign OAuth/connect state and should be unique per deployment.

## 3. Install/Connect Per User

1. Open Agents Server -> `System -> User Wallet`.
2. Click **Connect with GitHub**.
3. In popup, click **Connect with GitHub App**.
4. Complete installation on GitHub (select account/org and repositories).
5. After callback, Agents Server stores:
    -   GitHub App installation linkage in `UserData`
    -   Access token in `UserWallet` (automatically)

## 4. Runtime Behavior

-   `USE PROJECT` token resolution order:
    1. Manual wallet token (`service=github`, `key=use-project-github-token`)
    2. Connected GitHub App token (auto-refreshed and mirrored into wallet)
-   If GitHub App is not configured/connected, users can still paste manual token in wallet.

## 5. Troubleshooting

-   `GitHub App is not configured on this server`
    -   Verify all `GITHUB_APP_*` env vars are present and server is restarted.
-   Callback returns error state
    -   Check GitHub App **Setup URL** exactly matches `/api/github-app/callback` on this deployment.
-   Repository access denied
    -   Ensure app installation includes that repository and required permissions.
