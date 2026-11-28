#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { deleteOpenAiResources } from './deleteOpenAiResources';
import { formatError } from './formatError';

deleteOpenAiResources()
    .catch((error) => {
        const message = formatError(error);
        console.error(colors.bgRed('Delete OpenAI resources failed'));
        console.error(colors.red(message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });
