#!/usr/bin/env ts-node

import { $execCommand } from '../../src/utils/execCommand/$execCommand';

const port = process.env.PORT || '4461';
/* not await */ $execCommand(`npx y-websocket --port ${port}`);

/**
 * TODO: Integrate this into the structure of the project
 */
