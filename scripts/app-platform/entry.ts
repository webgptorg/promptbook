// Entry of the vendored Promptbook App platform bundle (`src/vendor/app-platform.js`).
//
// `scripts/vendor-app-platform.mjs` copies this file into a webgptorg/app checkout (next to the mock engine, whose
// dependencies resolve there) and bundles it with Bun. Every export is a contract package of the platform (MIT) or a
// library those packages pin; the engine uses them instead of retyping the contract.
export * as api from '@ptbk/engine-api';
export { createEngineApiHttpHandler, serveEngineApiRoute } from '@ptbk/engine-api/http';
export * as protocol from '@ptbk/protocol';
export * as releaseTools from '@ptbk/release-tools';
export { GATEWAY_ASSETS, GATEWAY_ASSET_PATH, GATEWAY_PAGES, SIMPLEWEBAUTHN_BROWSER_SHA256 } from '../../../packages/gateway-pages/src/assets';
export { pickGatewayLanguage } from '../../../packages/gateway-pages/src/language';
export { renderGatewayPage } from '../../../packages/gateway-pages/src/render-page';
export { isSafeNextPath } from '../../../packages/gateway-pages/pages/next-path.js';
export * as webauthn from '@simplewebauthn/server';
export * as x509 from '@@X509@@';
