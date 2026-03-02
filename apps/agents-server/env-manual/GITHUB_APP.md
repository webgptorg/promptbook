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

## 2. Configure Agents Server metadata

GitHub App configuration now lives in **Metadata** so you can customize it per server listed in `SERVERS`.

1. Open Agents Server → **System → Metadata**.
2. Click **Add metadata entry** (or edit existing values) and configure the following keys:
    - **GITHUB_APP_ID** – numeric GitHub App ID from the app settings.
    - **GITHUB_APP_SLUG** – slug used in `https://github.com/apps/<slug>`.
    - **GITHUB_APP_PRIVATE_KEY** – PEM-encoded private key. Replace literal newlines with `\n` when editing through the UI and keep the `BEGIN/END` markers.
    - **GITHUB_APP_STATE_SECRET** (optional, recommended) – random string used to sign OAuth/connect state. If unset, `ADMIN_PASSWORD` will be used as a fallback.

The values stored in Metadata override any legacy `.env` entries and can differ per server host.

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
