import { describe, expect, it } from '@jest/globals';
import JSZip from 'jszip';
import { validateBook } from '../../../../../src/book-2.0/agent-source/string_book';
import { createTranspiledAgentExportZipBuffer } from './createTranspiledAgentExportZipBuffer';

describe('createTranspiledAgentExportZipBuffer', () => {
    it('packages the stored book, transpiled harness, and manifest into one ZIP archive', async () => {
        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName: 'Support Router',
            agentSource: validateBook('Support Router\nGOAL Route support tickets'),
            transpiledCode: `#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { spaceTrim } from '@promptbook/utils';
import OpenAI from 'openai';
import readline from 'readline';

dotenv.config({ path: '.env' });

console.log(process.env.OPENAI_API_KEY);
console.log(spaceTrim('hello'));
console.log(OpenAI);
console.log(readline);`,
            transpilerName: 'openai-sdk',
            transpilerTitle: 'OpenAI SDK',
        });

        const zip = await JSZip.loadAsync(buffer);
        const archiveRoot = filename.replace(/\.zip$/, '');
        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            agentName: string;
            transpilerName: string;
            transpilerTitle: string;
            runtime: {
                kind: string;
                entryFile: string;
                installCommand: string | null;
                startCommand: string | null;
                environmentVariables: string[];
                dependencies?: Record<string, string>;
                packageName?: string;
            };
            files: string[];
        };
        const packageJson = JSON.parse(await zip.file(`${archiveRoot}/package.json`)!.async('string')) as {
            scripts: Record<string, string>;
            dependencies: Record<string, string>;
        };
        const mockEnvironmentFile = await zip.file(`${archiveRoot}/.env`)!.async('string');
        const gitignore = await zip.file(`${archiveRoot}/.gitignore`)!.async('string');
        const readme = await zip.file(`${archiveRoot}/README.md`)!.async('string');

        expect(filename).toBe('promptbook-agent-export-Support Router-openai-sdk.zip');
        expect(await zip.file(`${archiveRoot}/agent.book`)!.async('string')).toBe('Support Router\nGOAL Route support tickets');
        expect(await zip.file(`${archiveRoot}/agent-harness.mjs`)!.async('string')).toContain("import OpenAI from 'openai';");
        expect(packageJson.scripts.start).toBe('node ./agent-harness.mjs');
        expect(Object.keys(packageJson.dependencies)).toEqual(['@promptbook/utils', 'dotenv', 'openai']);
        expect(mockEnvironmentFile).toContain('OPENAI_API_KEY');
        expect(mockEnvironmentFile).toContain('TODO_REPLACE_WITH_OPENAI_API_KEY');
        expect(gitignore).toContain('node_modules/');
        expect(gitignore).toContain('.env');
        expect(readme).toContain('npm install');
        expect(readme).toContain('npm start');
        expect(readme).toContain('agent-harness.mjs');
        expect(manifest.agentName).toBe('Support Router');
        expect(manifest.transpilerName).toBe('openai-sdk');
        expect(manifest.transpilerTitle).toBe('OpenAI SDK');
        expect(manifest.runtime.kind).toBe('nodejs');
        expect(manifest.runtime.entryFile).toBe('agent-harness.mjs');
        expect(manifest.runtime.installCommand).toBe('npm install');
        expect(manifest.runtime.startCommand).toBe('npm start');
        expect(manifest.runtime.environmentVariables).toEqual(['OPENAI_API_KEY']);
        expect(Object.keys(manifest.runtime.dependencies || {})).toEqual(['@promptbook/utils', 'dotenv', 'openai']);
        expect(manifest.files).toEqual([
            'agent.book',
            'agent-harness.mjs',
            '.env',
            '.gitignore',
            'package.json',
            'README.md',
            'manifest.json',
        ]);
    });

    it('falls back to a plaintext harness filename for unknown transpilers', async () => {
        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName: '???',
            agentSource: validateBook('Mystery Agent\nGOAL Unknown exporter'),
            transpiledCode: 'echo hello',
            transpilerName: 'custom/transpiler',
            transpilerTitle: 'Custom',
        });

        const zip = await JSZip.loadAsync(buffer);
        const archiveRoot = filename.replace(/\.zip$/, '');
        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            runtime: {
                kind: string;
                entryFile: string;
                installCommand: string | null;
                startCommand: string | null;
                environmentVariables: string[];
            };
            files: string[];
        };

        expect(filename).toBe('promptbook-agent-export-___-custom_transpiler.zip');
        expect(await zip.file(`${archiveRoot}/agent-harness.txt`)!.async('string')).toBe('echo hello');
        expect(zip.file(`${archiveRoot}/package.json`)).toBeNull();
        expect(await zip.file(`${archiveRoot}/README.md`)!.async('string')).toContain(
            'No automatic `npm install` / `npm start` runtime scaffold could be inferred',
        );
        expect(await zip.file(`${archiveRoot}/.env`)!.async('string')).toContain(
            'No required `process.env` variables were detected',
        );
        expect(manifest.runtime.kind).toBe('manual');
        expect(manifest.runtime.entryFile).toBe('agent-harness.txt');
        expect(manifest.runtime.installCommand).toBeNull();
        expect(manifest.runtime.startCommand).toBeNull();
        expect(manifest.files).toEqual([
            'agent.book',
            'agent-harness.txt',
            '.env',
            '.gitignore',
            'README.md',
            'manifest.json',
        ]);
    });

    it('packages Anthropic SDK exports with inferred runtime dependencies and environment variables', async () => {
        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName: 'Claude Agent',
            agentSource: validateBook('Claude Agent\nGOAL Help with Anthropic SDK exports'),
            transpiledCode: `#!/usr/bin/env node
import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env' });

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_CLAUDE_API_KEY,
});

console.log(client);`,
            transpilerName: 'anthropic-claude-sdk',
            transpilerTitle: 'Anthropic Claude SDK',
        });

        const zip = await JSZip.loadAsync(buffer);
        const archiveRoot = filename.replace(/\.zip$/, '');
        const packageJson = JSON.parse(await zip.file(`${archiveRoot}/package.json`)!.async('string')) as {
            scripts: Record<string, string>;
            dependencies: Record<string, string>;
        };
        const mockEnvironmentFile = await zip.file(`${archiveRoot}/.env`)!.async('string');
        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            runtime: {
                kind: string;
                entryFile: string;
                environmentVariables: string[];
                dependencies?: Record<string, string>;
            };
        };

        expect(filename).toBe('promptbook-agent-export-Claude Agent-anthropic-claude-sdk.zip');
        expect(await zip.file(`${archiveRoot}/agent-harness.mjs`)!.async('string')).toContain(
            "import Anthropic from '@anthropic-ai/sdk';",
        );
        expect(packageJson.scripts.start).toBe('node ./agent-harness.mjs');
        expect(Object.keys(packageJson.dependencies)).toEqual(['@anthropic-ai/sdk', 'dotenv']);
        expect(mockEnvironmentFile).toContain('ANTHROPIC_API_KEY');
        expect(mockEnvironmentFile).toContain('ANTHROPIC_CLAUDE_API_KEY');
        expect(manifest.runtime.kind).toBe('nodejs');
        expect(manifest.runtime.entryFile).toBe('agent-harness.mjs');
        expect(manifest.runtime.environmentVariables).toEqual(['ANTHROPIC_API_KEY', 'ANTHROPIC_CLAUDE_API_KEY']);
        expect(Object.keys(manifest.runtime.dependencies || {})).toEqual(['@anthropic-ai/sdk', 'dotenv']);
    });

    it('packages Anthropic Claude Managed exports as JavaScript harnesses with inferred runtime dependencies', async () => {
        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName: 'Claude Managed Agent',
            agentSource: validateBook('Claude Managed Agent\nGOAL Help with Claude Agent SDK exports'),
            transpiledCode: `#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import { spaceTrim } from '@promptbook/utils';
import { Document, SimpleDirectoryReader, VectorStoreIndex } from 'llamaindex';
import { z } from 'zod';

dotenv.config({ path: '.env' });

console.log(createSdkMcpServer, query, tool, spaceTrim, Document, SimpleDirectoryReader, VectorStoreIndex, z);`,
            transpilerName: 'anthropic-claude-managed',
            transpilerTitle: 'Anthropic Claude Managed',
        });

        const zip = await JSZip.loadAsync(buffer);
        const archiveRoot = filename.replace(/\.zip$/, '');
        const packageJson = JSON.parse(await zip.file(`${archiveRoot}/package.json`)!.async('string')) as {
            scripts: Record<string, string>;
            dependencies: Record<string, string>;
        };
        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            runtime: {
                kind: string;
                entryFile: string;
                environmentVariables: string[];
                dependencies?: Record<string, string>;
            };
        };

        expect(filename).toBe('promptbook-agent-export-Claude Managed Agent-anthropic-claude-managed.zip');
        expect(await zip.file(`${archiveRoot}/agent-harness.mjs`)!.async('string')).toContain(
            "import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';",
        );
        expect(packageJson.scripts.start).toBe('node ./agent-harness.mjs');
        expect(Object.keys(packageJson.dependencies)).toEqual([
            '@anthropic-ai/claude-agent-sdk',
            '@promptbook/utils',
            'dotenv',
            'llamaindex',
            'zod',
        ]);
        expect(manifest.runtime.kind).toBe('nodejs');
        expect(manifest.runtime.entryFile).toBe('agent-harness.mjs');
        expect(manifest.runtime.environmentVariables).toEqual([]);
        expect(Object.keys(manifest.runtime.dependencies || {})).toEqual([
            '@anthropic-ai/claude-agent-sdk',
            '@promptbook/utils',
            'dotenv',
            'llamaindex',
            'zod',
        ]);
    });

    it('packages AgentOS exports as JavaScript harnesses with the expected runtime scaffold', async () => {
        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName: 'AgentOS Agent',
            agentSource: validateBook('AgentOS Agent\nGOAL Run inside AgentOS'),
            transpiledCode: `#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { AgentOs, hostTool, toolKit } from '@rivet-dev/agent-os-core';
import common from '@rivet-dev/agent-os-common';
import pi from '@rivet-dev/agent-os-pi';
import { Document, SimpleDirectoryReader, VectorStoreIndex } from 'llamaindex';
import { spaceTrim } from '@promptbook/utils';
import { z } from 'zod';

dotenv.config({ path: '.env' });

const vm = await AgentOs.create({
  software: [common, pi],
  toolKits: [
    toolKit({
      name: 'promptbook',
      description: 'Promptbook tools',
      tools: {
        ping: hostTool({
          description: 'Ping the runtime',
          inputSchema: z.object({}),
          execute: async () => 'pong',
        }),
      },
    }),
  ],
});

console.log(process.env.ANTHROPIC_API_KEY);
console.log(process.env.ANTHROPIC_CLAUDE_API_KEY);
console.log(spaceTrim('hello'));
console.log(Document, SimpleDirectoryReader, VectorStoreIndex);
console.log(vm);`,
            transpilerName: 'agent-os',
            transpilerTitle: 'AgentOS',
        });

        const zip = await JSZip.loadAsync(buffer);
        const archiveRoot = filename.replace(/\.zip$/, '');
        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            agentName: string;
            transpilerName: string;
            transpilerTitle: string;
            runtime: {
                kind: string;
                entryFile: string;
                installCommand: string | null;
                startCommand: string | null;
                environmentVariables: string[];
                dependencies?: Record<string, string>;
                packageName?: string;
            };
            files: string[];
        };
        const packageJson = JSON.parse(await zip.file(`${archiveRoot}/package.json`)!.async('string')) as {
            scripts: Record<string, string>;
            dependencies: Record<string, string>;
        };
        const mockEnvironmentFile = await zip.file(`${archiveRoot}/.env`)!.async('string');
        const readme = await zip.file(`${archiveRoot}/README.md`)!.async('string');

        expect(filename).toBe('promptbook-agent-export-AgentOS Agent-agent-os.zip');
        expect(await zip.file(`${archiveRoot}/agent-harness.mjs`)!.async('string')).toContain(
            "import { AgentOs, hostTool, toolKit } from '@rivet-dev/agent-os-core';",
        );
        expect(await zip.file(`${archiveRoot}/agent-harness.mjs`)!.async('string')).toContain(
            "import { spaceTrim } from '@promptbook/utils';",
        );
        expect(packageJson.scripts.start).toBe('node ./agent-harness.mjs');
        expect(Object.keys(packageJson.dependencies)).toEqual([
            '@promptbook/utils',
            '@rivet-dev/agent-os-common',
            '@rivet-dev/agent-os-core',
            '@rivet-dev/agent-os-pi',
            'dotenv',
            'llamaindex',
            'zod',
        ]);
        expect(mockEnvironmentFile).toContain('ANTHROPIC_API_KEY');
        expect(mockEnvironmentFile).toContain('ANTHROPIC_CLAUDE_API_KEY');
        expect(readme).toContain('npm install');
        expect(readme).toContain('npm start');
        expect(readme).toContain('agent-harness.mjs');
        expect(manifest.agentName).toBe('AgentOS Agent');
        expect(manifest.transpilerName).toBe('agent-os');
        expect(manifest.transpilerTitle).toBe('AgentOS');
        expect(manifest.runtime.kind).toBe('nodejs');
        expect(manifest.runtime.entryFile).toBe('agent-harness.mjs');
        expect(manifest.runtime.environmentVariables).toEqual(['ANTHROPIC_API_KEY', 'ANTHROPIC_CLAUDE_API_KEY']);
        expect(Object.keys(manifest.runtime.dependencies || {})).toEqual([
            '@promptbook/utils',
            '@rivet-dev/agent-os-common',
            '@rivet-dev/agent-os-core',
            '@rivet-dev/agent-os-pi',
            'dotenv',
            'llamaindex',
            'zod',
        ]);
    });
});
