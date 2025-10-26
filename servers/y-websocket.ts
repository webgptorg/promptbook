#!/usr/bin/env ts-node

import { $execCommand } from '../src/utils/execCommand/$execCommand';

const port = process.env.PORT || '1234';
/* not await */ $execCommand(`npx y-websocket --port ${port}`);

/**
 * TODO: !!!! Integrate this into the structure of the project
 */
