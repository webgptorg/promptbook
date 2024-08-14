#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { forEver } from 'waitasecond';
import { startRemoteServer } from '../startRemoteServer';

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
    console.info(`🧸  Remote server playground`);

    // Do here stuff you want to test
    //========================================>

    startRemoteServer({
        path: '/promptbook',
        port: 4460,
        isAnonymousModeAllowed: true,
        isCollectionModeAllowed: true,
    });

    await forEver();

    //========================================/
}
