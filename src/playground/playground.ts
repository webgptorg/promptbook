#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import localtunnel from 'localtunnel';
import { chromium } from 'playwright';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import { forEver } from 'waitasecond';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

playground()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Playground`);

    // Do here stuff you want to test
    //========================================>

    const browserHost = process.env.PLAYGROUND_BROWSER_HOST || '0.0.0.0';
    const browserPort = Number(process.env.PLAYGROUND_BROWSER_PORT || 3000);
    const tunnelSubdomain = process.env.PLAYGROUND_BROWSER_TUNNEL_SUBDOMAIN;

    const browserServer = await chromium.launchServer({
        host: browserHost,
        port: browserPort,
        headless: false,
    });

    const wsEndpoint = browserServer.wsEndpoint();
    const tunnel = await localtunnel({
        port: browserPort,
        subdomain: tunnelSubdomain,
    });

    console.log('REMOTE_BROWSER_URL =', replaceWsEndpointOrigin(wsEndpoint, tunnel.url));

    await forEver();

    //========================================/

    console.info(`[ Done 🧸  Playground ]`);
}

/**
 * Rewrites the origin in a Playwright ws endpoint while preserving path/token.
 */
function replaceWsEndpointOrigin(wsEndpoint: string, publicUrl: string): string {
    const wsUrl = new URL(wsEndpoint);
    const tunnelUrl = new URL(publicUrl);

    wsUrl.protocol = tunnelUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl.host = tunnelUrl.host;

    return wsUrl.toString();
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
