import { mkdir, readFile, writeFile } from 'fs/promises';
import { spaceTrim } from 'spacetrim';
import type { PackageJson } from 'type-fest';
import { GENERATOR_WARNING } from '../../src/config';
import { prettifyMarkdown } from '../../src/utils/markdown/prettifyMarkdown';
import { removeMarkdownComments } from '../../src/utils/markdown/removeMarkdownComments';
import type { PackageMetadata } from './PackageMetadata';
import { logPackageGenerationStep } from './logPackageGenerationStep';

/**
 * Packages that should use the more permissive documentation license.
 *
 * @private internal utility of generatePackageReadmesAndMetadata
 */
const RELAXED_LICENSE_PACKAGE_FULLNAMES = new Set(['@promptbook/utils', '@promptbook/markdown-utils']);

/**
 * Shared keyword baseline added to every published package manifest.
 *
 * @private internal utility of generatePackageReadmesAndMetadata
 */
const GENERAL_PACKAGE_KEYWORDS = [
    'ai',
    'llm',
    'prompt',
    'template',
    'language-model',
    'machine-learning',
    'natural-language-processing',
    'nlp',
    'ai-orchestration',
    'prompt-engineering',
    'llmops',
    'multimodal',
    'reasoning',
    'rag',
    'embeddings',
    'function-calling',
    'large-language-models',
    'ai-application-framework',
    'text-generation',
    'ai-agents',
    'book-language',
    'markdown-dsl',
    'ai-workflow',
    'ai-automation',
    'pipeline',
    'workflow',
    'orchestration',
    'ai-pipeline',
    'prompt-template',
    'prompt-chaining',
    'ai-scripting',
    'conversational-ai',
    'chatbot',
    'ai-assistant',
    'knowledge-base',
    'typescript',
    'javascript',
    'nodejs',
    'browser',
    'cross-platform',
    'api-integration',
    'model-agnostic',
    'multi-model',
    'ai-sdk',
    'ai-framework',
    'ai-platform',
    'generative-ai',
    'content-generation',
    'text-processing',
    'natural-language',
    'human-readable',
    'plain-english',
    'automation-framework',
    'workflow-engine',
    'task-automation',
    'ai-ops',
    'mlops',
    'developer-tools',
    'ai-development',
    'prompt-management',
    'unified-interface',
    'cross-provider',
    'vendor-agnostic',
] as const;

/**
 * Package-name fragments mapped to extra keywords for package metadata generation.
 *
 * @private internal utility of generatePackageReadmesAndMetadata
 */
const PACKAGE_KEYWORD_RULES = [
    {
        fragment: 'openai',
        keywords: [
            'openai',
            'gpt-3',
            'gpt-4',
            'gpt-4o',
            'gpt-4o-mini',
            'o1',
            'o1-mini',
            'o1-preview',
            'o3',
            'o3-mini',
            'chatgpt',
        ],
    },
    {
        fragment: 'anthropic',
        keywords: ['anthropic', 'claude', 'claude-3', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    },
    { fragment: 'google', keywords: ['google', 'gemini', 'gemini-pro', 'gemini-flash'] },
    { fragment: 'deepseek', keywords: ['deepseek'] },
    { fragment: 'ollama', keywords: ['ollama', 'local-llm', 'self-hosted'] },
    { fragment: 'azure', keywords: ['azure', 'azure-openai', 'microsoft'] },
    { fragment: 'vercel', keywords: ['vercel', 'vercel-ai', 'edge-functions'] },
    { fragment: 'cli', keywords: ['cli', 'cli-tool', 'command-line', 'terminal', 'automation'] },
    { fragment: 'browser', keywords: ['browser', 'web', 'client-side', 'frontend'] },
    { fragment: 'node', keywords: ['nodejs', 'server-side', 'backend'] },
    { fragment: 'remote', keywords: ['remote-execution', 'distributed', 'cloud', 'server'] },
    { fragment: 'types', keywords: ['typescript', 'types', 'type-definitions', 'intellisense'] },
    { fragment: 'utils', keywords: ['utilities', 'helpers', 'tools', 'preprocessing', 'postprocessing'] },
    { fragment: 'markdown', keywords: ['markdown', 'markdown-processing', 'text-processing'] },
    { fragment: 'pdf', keywords: ['pdf', 'pdf-processing', 'document-processing'] },
    { fragment: 'documents', keywords: ['document-processing', 'docx', 'odt', 'office-documents'] },
    { fragment: 'website-crawler', keywords: ['web-scraping', 'website-crawler', 'scraping', 'crawling'] },
    { fragment: 'fake-llm', keywords: ['testing', 'mocking', 'fake', 'mock-llm', 'development'] },
    { fragment: 'wizard', keywords: ['wizard', 'setup', 'configuration', 'getting-started'] },
    { fragment: 'javascript', keywords: ['javascript', 'js', 'scripting', 'execution'] },
    { fragment: 'editable', keywords: ['editable', 'dynamic', 'runtime', 'imperative'] },
    { fragment: 'templates', keywords: ['templates', 'examples', 'boilerplate', 'starter'] },
] as const;

/**
 * Generates README files, package manifests, and ignore files for every package.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param mainPackageJson - Root package manifest used as a template
 * @private function of generatePackages
 */
export async function generatePackageReadmesAndMetadata(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    mainPackageJson: PackageJson,
): Promise<void> {
    logPackageGenerationStep(`2️⃣  Generate package.json, README and other crucial files for each package`);

    const mainReadme = await readFile('./README.md', 'utf-8');

    for (const packageMetadata of packagesMetadata) {
        await generatePackageReadmeAndMetadata(packageMetadata, mainPackageJson, mainReadme);
    }
}

/**
 * Generates README, package manifest, and ignore files for one package.
 *
 * @param packageMetadata - Metadata of the generated package
 * @param mainPackageJson - Root package manifest used as a template
 * @param mainReadme - Root README content used as a base
 * @private internal utility of generatePackageReadmesAndMetadata
 */
async function generatePackageReadmeAndMetadata(
    packageMetadata: PackageMetadata,
    mainPackageJson: PackageJson,
    mainReadme: string,
): Promise<void> {
    const { isBuilded, packageBasename, packageFullname, readmeFilePath } = packageMetadata;
    const packageReadmeExtra = await readFile(readmeFilePath, 'utf-8');
    const packageReadme = createPackageReadme(
        mainReadme,
        packageReadmeExtra,
        packageFullname,
        isBuilded,
        mainPackageJson,
    );
    const packageJson = createGeneratedPackageJson(mainPackageJson, packageFullname);

    packageJson.keywords = createPackageKeywords(packageFullname);

    await mkdir(`./packages/${packageBasename}`, { recursive: true });
    await writeFile(`./packages/${packageBasename}/README.md`, packageReadme);
    await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');

    if (isBuilded) {
        await writeGeneratedPackageIgnoreFiles(packageBasename);
    }
}

/**
 * Creates the README published with one package.
 *
 * @param mainReadme - Root README content used as a base
 * @param packageReadmeExtra - Package-specific README fragment
 * @param packageFullname - Full package name
 * @param isBuilded - Whether this package is built and should receive package-specific docs
 * @param mainPackageJson - Root package manifest
 * @returns Generated README content
 * @private internal utility of generatePackageReadmesAndMetadata
 */
function createPackageReadme(
    mainReadme: string,
    packageReadmeExtra: string,
    packageFullname: string,
    isBuilded: boolean,
    mainPackageJson: PackageJson,
): string {
    let packageReadme = mainReadme;
    const installCommand = createPackageInstallCommand(packageFullname);
    const prereleaseWarning = createPackagePrereleaseWarning(mainPackageJson);
    const packageReadmeFullextra = spaceTrim(
        (block) => `

              ${block(prereleaseWarning)}

              ## 📦 Package \`${packageFullname}\`

              - Promptbooks are [divided into several](#-packages) packages, all are published from [single monorepo](https://github.com/webgptorg/promptbook).
              - This package \`${packageFullname}\` is one part of the promptbook ecosystem.

              To install this package, run:

              \`\`\`bash
              # Install entire promptbook ecosystem
              npm i ptbk

              ${block(installCommand)}
              \`\`\`

              ${block(packageReadmeExtra)}

              ---

              Rest of the documentation is common for **entire promptbook ecosystem**:
        `,
    );

    if (isBuilded /* [🚘] */) {
        packageReadme = packageReadme
            .split(`<!--/ Here will be placed specific package info -->`)
            .join(packageReadmeFullextra);
    }

    // TODO: [🍓] Convert mermaid diagrams to images or remove them from the markdown published to NPM
    packageReadme = removeMarkdownComments(packageReadme);
    packageReadme = spaceTrim(
        (block) => `
            <!-- ${block(GENERATOR_WARNING)} -->

            ${block(packageReadme)}
        `,
    );
    prettifyMarkdown(packageReadme);

    return packageReadme;
}

/**
 * Renders the package-specific installation snippet used in generated READMEs.
 *
 * @param packageFullname - Full package name
 * @returns Markdown installation snippet
 * @private internal utility of generatePackageReadmesAndMetadata
 */
function createPackageInstallCommand(packageFullname: string): string {
    if (packageFullname === '@promptbook/cli') {
        return spaceTrim(`

            # Install as dev dependency
            npm install --save-dev ${packageFullname}

            # Or install globally
            npm install --global ${packageFullname}

        `);
    }

    if (packageFullname === '@promptbook/types') {
        return `npm i -D ${packageFullname}`;
    }

    return spaceTrim(`

        # Install just this package to save space
        npm install ${packageFullname}

    `);
}

/**
 * Generates the prerelease warning block for package READMEs when needed.
 *
 * @param mainPackageJson - Root package manifest
 * @returns HTML warning block or an empty string
 * @private internal utility of generatePackageReadmesAndMetadata
 */
function createPackagePrereleaseWarning(mainPackageJson: PackageJson): string {
    if (!mainPackageJson.version?.includes('-')) {
        return '';
    }

    return spaceTrim(`
        <blockquote style="color: #ff8811">
            <b>⚠ Warning:</b> This is a pre-release version of the library. It is not yet ready for production use. Please look at <a href="https://www.npmjs.com/package/@promptbook/core?activeTab=versions">latest stable release</a>.
        </blockquote>
    `);
    // TODO: Link latest stable release automatically
}

/**
 * Creates the initial package manifest before dependency inference and bundler-specific fields.
 *
 * @param mainPackageJson - Root package manifest used as a template
 * @param packageFullname - Full package name
 * @returns Generated package manifest
 * @private internal utility of generatePackageReadmesAndMetadata
 */
function createGeneratedPackageJson(mainPackageJson: PackageJson, packageFullname: string): PackageJson {
    const packageJson = JSON.parse(JSON.stringify(mainPackageJson) /* <- Note: Make deep copy */) as PackageJson;

    delete packageJson.scripts;
    delete packageJson.funding;
    delete packageJson.dependencies;
    delete packageJson.devDependencies;
    delete packageJson.peerDependencies;

    for (const key of Object.keys(packageJson)) {
        if (key.startsWith('--')) {
            delete packageJson[key];
        }
    }

    packageJson.license = RELAXED_LICENSE_PACKAGE_FULLNAMES.has(packageFullname) ? 'CC-BY-4.0' : 'BUSL-1.1';
    packageJson.name = packageFullname;

    return packageJson;
}

/**
 * Creates the keyword list for one generated package manifest.
 *
 * @param packageFullname - Full package name
 * @returns Sorted unique keyword list
 * @private internal utility of generatePackageReadmesAndMetadata
 */
function createPackageKeywords(packageFullname: string): Array<string> {
    const dynamicKeywords: Array<string> = [];

    for (const { fragment, keywords } of PACKAGE_KEYWORD_RULES) {
        if (packageFullname.includes(fragment)) {
            dynamicKeywords.push(...keywords);
        }
    }

    return [...new Set([...GENERAL_PACKAGE_KEYWORDS, ...dynamicKeywords])].sort();
}

/**
 * Writes package ignore files that accompany buildable packages.
 *
 * @param packageBasename - Basename of the generated package
 * @private internal utility of generatePackageReadmesAndMetadata
 */
async function writeGeneratedPackageIgnoreFiles(packageBasename: string): Promise<void> {
    const gitIgnoredPaths = ['esm', 'umd', 'apps'];

    if (packageBasename === 'cli') {
        gitIgnoredPaths.push('books', 'security.config.ts', 'servers.ts', 'src');
    }

    await writeFile(
        `./packages/${packageBasename}/.gitignore`,
        gitIgnoredPaths.join('\n'),
    );
    await writeFile(
        `./packages/${packageBasename}/.npmignore`,
        spaceTrim(`
            # ${GENERATOR_WARNING}

            stats.html
        `),
    );
}

// Note: [⚫] Code for repository script [generatePackageReadmesAndMetadata](scripts/generate-packages/generatePackageReadmesAndMetadata.ts) should never be published in any package
