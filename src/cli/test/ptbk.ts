#!/usr/bin/env ts-node

/**
 * Note: [🔺] Purpose of this file is to test the CLI in development environment
 */

import '../../_packages/cli.index.ts'; // <- Note: Register all the LLM providers, scrapers, etc. by importing this file
import { promptbookCli } from '../promptbookCli';

promptbookCli();
