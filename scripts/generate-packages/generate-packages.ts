#!/usr/bin/env ts-node
// generate-packages.ts

import colors from 'colors';
import commander from 'commander';
import fs, { mkdir, readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { basename, dirname, join, relative } from 'path';
import spaceTrim from 'spacetrim';
import type { PackageJson } from 'type-fest';
import { forTime } from 'waitasecond';
import YAML from 'yaml';
import { GENERATOR_WARNING } from '../../src/config';
import { assertsError } from '../../src/errors/assertsError';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { isFileExisting } from '../../src/utils/files/isFileExisting';
import { prettifyMarkdown } from '../../src/utils/markdown/prettifyMarkdown';
import { removeMarkdownComments } from '../../src/utils/markdown/removeMarkdownComments';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { getPackagesMetadata } from './getPackagesMetadata';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.option('--skip-bundler', `Skip the build process of bundler`, false);
program.parse(process.argv);

const { commit: isCommited, skipBundler: isBundlerSkipped } = program.opts();

generatePackages({ isCommited, isBundlerSkipped })
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generatePackages({ isCommited, isBundlerSkipped }: { isCommited: boolean; isBundlerSkipped: boolean }) {
    console.info(`📦  Generating packages`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    // ==============================
    console.info(colors.cyan(`0️⃣  Prepare the needed information about the packages`));
    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;

    console.info(`Promptbook version ${mainPackageJson.version}`);

    if (!mainPackageJson.version) {
        throw new Error(`Version is not defined in the package.json`);
    }

    const allDependencies = {
        ...mainPackageJson.dependencies,
        // <- TODO: Maybe add `devDependencies` and check collisions between `dependencies` and `devDependencies`
    };

    const packagesMetadata = await getPackagesMetadata();

    // ==============================
    console.info(colors.cyan(`1️⃣  Generate entry file for each package`));

    for (const packageMetadata of packagesMetadata) {
        const { entryIndexFilePath, entities, packageFullname } = packageMetadata;

        if (entryIndexFilePath === null) {
            continue;
        }

        if (entities === undefined) {
            throw new Error(`Entities are not defined for ${packageMetadata.packageFullname}`);
        }

        const entryIndexFilePathContentImports: Array<string> = [];
        const entryIndexFilePathContentExports: Array<string> = [];

        for (const entity of entities) {
            const { filename, name } = entity;
            let { isType } = entity;

            if (packageFullname === '@promptbook/types') {
                // Note: Everything in `@promptbook/types` is exported JUST as type
                isType = true;
            }

            let importPath = `${relative(dirname(entryIndexFilePath), filename).split('\\').join('/')}`;
            if (!importPath.startsWith('.')) {
                importPath = './' + importPath;
            }
            if (importPath.endsWith('.ts') || importPath.endsWith('.tsx')) {
                importPath = importPath.replace(/\.(ts|tsx)$/, '');
            }
            const typePrefix = !isType ? '' : ' type';

            entryIndexFilePathContentImports.push(`import${typePrefix} { ${name} } from '${importPath}';`);
            entryIndexFilePathContentExports.push(`export${typePrefix} { ${name} };`);
        }

        let entryIndexFilePathContent: string;

        if (packageFullname !== '@promptbook/types') {
            // TODO: DRY [1]
            const useClientDirective = packageFullname === '@promptbook/components' ? "'use client';" : '';
            entryIndexFilePathContent = spaceTrim(
                (block) => `
                    ${useClientDirective}

                    // ${block(GENERATOR_WARNING)}
                    // \`${packageFullname}\`

                    import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';
                    ${block(entryIndexFilePathContentImports.join('\n'))}


                    // Note: Exporting version from each package
                    export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };


                    // Note: Entities of the \`${packageFullname}\`
                    ${block(entryIndexFilePathContentExports.join('\n'))}

                `,
            );
        } else {
            // TODO: DRY [1]
            entryIndexFilePathContent = spaceTrim(
                (block) => `
                    // ${block(GENERATOR_WARNING)}
                    // \`${packageFullname}\`

                    ${block(entryIndexFilePathContentImports.join('\n'))}

                    // Note: Entities of the \`${packageFullname}\`
                    ${block(entryIndexFilePathContentExports.join('\n'))}

                `,
            );
        }

        entryIndexFilePathContent += '\n';

        // TODO: `entryIndexFilePathContent = await prettifyTypeScript(entryIndexFilePathContent)`

        writeFile(entryIndexFilePath, entryIndexFilePathContent, 'utf-8');
        console.info(colors.green('Generated index file ' + entryIndexFilePath.split('\\').join('/')));
    }

    // ==============================
    console.info(colors.cyan(`2️⃣  Generate package.json, README and other crucial files for each package`));

    const mainReadme = await readFile('./README.md', 'utf-8');
    for (const { isBuilded, readmeFilePath, packageFullname, packageBasename } of packagesMetadata) {
        let packageReadme = mainReadme;
        const packageReadmeExtra = await readFile(readmeFilePath, 'utf-8');

        let installCommand = spaceTrim(`

            # Install just this package to save space
            npm install ${packageFullname}

        `);

        if (packageFullname === '@promptbook/cli') {
            installCommand = spaceTrim(`

                # Install as dev dependency
                npm install --save-dev ${packageFullname}

                # Or install globally
                npm install --global ${packageFullname}

            `);
        } else if (packageFullname === '@promptbook/types') {
            installCommand = `npm i -D ${packageFullname}`;
        }

        let prereleaseWarning = '';

        if (mainPackageJson.version.includes('-')) {
            // TODO: Link latest stable release automatically
            prereleaseWarning = spaceTrim(`
                <blockquote style="color: #ff8811">
                    <b>⚠ Warning:</b> This is a pre-release version of the library. It is not yet ready for production use. Please look at <a href="https://www.npmjs.com/package/@promptbook/core?activeTab=versions">latest stable release</a>.
                </blockquote>
            `);
        }

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

        /*
        TODO: Fix or remove Socket badge

        const badge = `[![Socket Badge](https://socket.dev/api/badge/npm/package/${packageFullname})](https://socket.dev/npm/package/${packageFullname})`;

        packageReadme = packageReadme.split(`\n<!--/Badges-->`).join(badge + '\n\n<!--/Badges-->');
        */

        // TODO: [🍓] Convert mermaid diagrams to images or remove them from the markdown published to NPM

        packageReadme = removeMarkdownComments(packageReadme);

        packageReadme = spaceTrim(
            (block) => `
                <!-- ${block(GENERATOR_WARNING)} -->

                ${block(packageReadme)}
            `,
        );
        prettifyMarkdown(packageReadme);

        await mkdir(`./packages/${packageBasename}`, { recursive: true });
        await writeFile(
            `./packages/${packageBasename}/README.md`,
            packageReadme,
            /*
            spaceTrim(`

                # ![Promptbook logo - cube with letters P and B](./design/logo-h1.png) Promptbook

                Supercharge your use of large language models

                [Read the manual](https://github.com/webgptorg/promptbook)

            `),
            */
        );

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

        if (packageFullname === '@promptbook/utils' || packageFullname === '@promptbook/markdown-utils') {
            packageJson.license = 'CC-BY-4.0';
        } else {
            packageJson.license = 'BUSL-1.1';
        }

        packageJson.name = packageFullname;

        // Note: [❇️] Joining dynamic and general keywords
        const generalKeywords = [
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
        ];

        // Dynamic keywords based on package functionality
        const dynamicKeywords: string[] = [];

        // Add LLM provider specific keywords
        if (packageFullname.includes('openai')) {
            dynamicKeywords.push(
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
            );
        }
        if (packageFullname.includes('anthropic')) {
            dynamicKeywords.push(
                'anthropic',
                'claude',
                'claude-3',
                'claude-3-opus',
                'claude-3-sonnet',
                'claude-3-haiku',
            );
        }
        if (packageFullname.includes('google')) {
            dynamicKeywords.push('google', 'gemini', 'gemini-pro', 'gemini-flash');
        }
        if (packageFullname.includes('deepseek')) {
            dynamicKeywords.push('deepseek');
        }
        if (packageFullname.includes('ollama')) {
            dynamicKeywords.push('ollama', 'local-llm', 'self-hosted');
        }
        if (packageFullname.includes('azure')) {
            dynamicKeywords.push('azure', 'azure-openai', 'microsoft');
        }
        if (packageFullname.includes('vercel')) {
            dynamicKeywords.push('vercel', 'vercel-ai', 'edge-functions');
        }

        // Add functionality specific keywords
        if (packageFullname.includes('cli')) {
            dynamicKeywords.push('cli', 'cli-tool', 'command-line', 'terminal', 'automation');
        }
        if (packageFullname.includes('browser')) {
            dynamicKeywords.push('browser', 'web', 'client-side', 'frontend');
        }
        if (packageFullname.includes('node')) {
            dynamicKeywords.push('nodejs', 'server-side', 'backend');
        }
        if (packageFullname.includes('remote')) {
            dynamicKeywords.push('remote-execution', 'distributed', 'cloud', 'server');
        }
        if (packageFullname.includes('types')) {
            dynamicKeywords.push('typescript', 'types', 'type-definitions', 'intellisense');
        }
        if (packageFullname.includes('utils')) {
            dynamicKeywords.push('utilities', 'helpers', 'tools', 'preprocessing', 'postprocessing');
        }
        if (packageFullname.includes('markdown')) {
            dynamicKeywords.push('markdown', 'markdown-processing', 'text-processing');
        }
        if (packageFullname.includes('pdf')) {
            dynamicKeywords.push('pdf', 'pdf-processing', 'document-processing');
        }
        if (packageFullname.includes('documents')) {
            dynamicKeywords.push('document-processing', 'docx', 'odt', 'office-documents');
        }
        if (packageFullname.includes('website-crawler')) {
            dynamicKeywords.push('web-scraping', 'website-crawler', 'scraping', 'crawling');
        }
        if (packageFullname.includes('fake-llm')) {
            dynamicKeywords.push('testing', 'mocking', 'fake', 'mock-llm', 'development');
        }
        if (packageFullname.includes('wizard')) {
            dynamicKeywords.push('wizard', 'setup', 'configuration', 'getting-started');
        }
        if (packageFullname.includes('javascript')) {
            dynamicKeywords.push('javascript', 'js', 'scripting', 'execution');
        }
        if (packageFullname.includes('editable')) {
            dynamicKeywords.push('editable', 'dynamic', 'runtime', 'imperative');
        }
        if (packageFullname.includes('templates')) {
            dynamicKeywords.push('templates', 'examples', 'boilerplate', 'starter');
        }

        // Combine and deduplicate keywords
        const combinedKeywords = [...new Set([...generalKeywords, ...dynamicKeywords])].sort();
        packageJson.keywords = combinedKeywords;

        await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
        //     <- TODO: Add GENERATOR_WARNING to package.json
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?

        if (isBuilded) {
            await writeFile(`./packages/${packageBasename}/.gitignore`, ['esm', 'umd'].join('\n'));
            await writeFile(
                `./packages/${packageBasename}/.npmignore`,
                spaceTrim(`
                    # ${GENERATOR_WARNING}

                    stats.html
                `),
            );
        }
    }

    // ==============================
    console.info(colors.cyan(`3️⃣  Cleanup build directories for each package`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the cleanup for bundler`));
    } else {
        for (const packageMetadata of packagesMetadata) {
            const { isBuilded, packageBasename } = packageMetadata;

            if (!isBuilded) {
                continue;
            }
            await $execCommand(`rm -rf ./packages/${packageBasename}/umd`);
            await $execCommand(`rm -rf ./packages/${packageBasename}/esm`);
        }
    }

    // ==============================
    console.info(colors.cyan(`4️⃣  Generate bundle for each package`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the bundler`));
    } else {
        await forTime(1000 * 60 * 60 * 0);

        // Note: Every minute report a time
        let minutesCount = 0;
        const timeReportingInterval = setInterval(() => {
            minutesCount++;
            console.error(colors.yellow(`⏹ Building ${minutesCount} minutes`));
        }, 60 * 1000);

        try {
            await $execCommand({
                isVerbose: true,
                command: `node --max-old-space-size=32000 ./node_modules/rollup/dist/bin/rollup --config rollup.config.js`,
            });

            console.info(colors.green('Build completed successfully'));
        } finally {
            clearInterval(timeReportingInterval);
        }
    }

    // ==============================
    console.info(colors.cyan(`5️⃣  Postprocess the generated bundle`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping postprocessing`));
    } else {
        // Note: Keep `typings` only from `esm` (and remove `umd`)
        for (const packageMetadata of packagesMetadata) {
            const { packageBasename } = packageMetadata;
            await $execCommand(`rm -rf ./packages/${packageBasename}/umd/typings`);
        }
    }

    // TODO: Add GENERATOR_WARNING to each generated file

    // ==============================
    console.info(colors.cyan(`6️⃣  Test that nothing what should not be published is published`));

    for (const packageMetadata of packagesMetadata) {
        const { packageBasename, packageFullname } = packageMetadata;
        const bundleFileNames = await glob(`./packages/${packageBasename}/**/*`, { nodir: true });

        for (const bundleFileName of bundleFileNames) {
            if (bundleFileName.includes('/typings/')) {
                // <- TODO: Maybe exclude "typings" directly in glob
                continue;
            }

            const bundleFileContent = await readFile(bundleFileName, 'utf-8');

            if (bundleFileContent.includes('[⚫]')) {
                throw new Error(
                    spaceTrim(`
                        Things marked with [⚫] should never be never released in the bundle

                        ${bundleFileName}
                    `),
                );
            }

            if (bundleFileContent.includes('[⚪]')) {
                throw new Error(
                    spaceTrim(`
                        Things marked with [⚪] should never be in a released package.

                        ${bundleFileName}
                    `),
                );
            }

            if (packageFullname !== '@promptbook/cli' && bundleFileContent.includes('[🟡]')) {
                throw new Error(
                    spaceTrim(`
                        Things marked with [🟡] should never be never released out of @promptbook/cli

                        ${bundleFileName}
                    `),
                );
            }

            if (
                // Note: Packages for Node.js only:
                packageFullname !== '@promptbook/node' &&
                packageFullname !== '@promptbook/cli' &&
                packageFullname !== '@promptbook/wizard' &&
                packageFullname !== '@promptbook/remote-server' &&
                packageFullname !== '@promptbook/documents' &&
                packageFullname !== '@promptbook/legacy-documents' &&
                packageFullname !== '@promptbook/website-crawler' &&
                packageFullname !== '@promptbook/markitdown' &&
                packageFullname !== '@promptbook/pdf' &&
                // <- [➕]
                bundleFileContent.includes('[🟢]')
            ) {
                throw new Error(
                    spaceTrim(`
                        Things marked with [🟢] should never be never released in packages that could be imported into browser environment

                        ${bundleFileName}
                    `),
                );
            }

            if (packageFullname !== '@promptbook/browser' && bundleFileContent.includes('[🔵]')) {
                throw new Error(
                    spaceTrim(`
                        Things marked with [🔵] should never be never released out of @promptbook/browser

                        ${bundleFileName}
                    `),
                );
            }

            // console.info(colors.green(`Checked file ${bundleFileName}`));
        }
    }

    // TODO: Check that `@promptbook/types` does not contain any runtime code and if not, delete the empty `esm` and `umd` directories and keep only typings

    // ==============================
    console.info(colors.cyan(`7️⃣  Add dependencies for each package`));

    for (const { isBuilded, packageFullname, packageBasename, additionalDependencies } of packagesMetadata) {
        const packageJson = JSON.parse(
            await readFile(`./packages/${packageBasename}/package.json`, 'utf-8'),
        ) as PackageJson;
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?

        if (isBuilded && packageFullname !== '@promptbook/cli') {
            if (packageFullname !== '@promptbook/types') {
                packageJson.main = `./umd/index.umd.js`;
                packageJson.module = `./esm/index.es.js`;
            }
            packageJson.typings = `./esm/typings/src/_packages/${packageBasename}.index.d.ts`;
        }

        if (packageFullname === '@promptbook/components') {
            // React component library should rely on host app React versions
            packageJson.peerDependencies = {
                react: '>=17.0.0',
                'react-dom': '>=17.0.0',
            };
            // Ensure no hard dependency on React to avoid duplicate installs/bundles
            delete (packageJson as any).dependencies;
        } else if (
            !['@promptbook/core', '@promptbook/utils', '@promptbook/cli', '@promptbook/markdown-utils'].includes(
                packageFullname,
            )
        ) {
            packageJson.peerDependencies = {
                '@promptbook/core': packageJson.version,
            };
        }

        if (isBuilded) {
            const bundleName = `./packages/${packageBasename}/esm/index.es.js`;

            let indexContent = '';
            if (await isFileExisting(bundleName, fs)) {
                indexContent = await readFile(bundleName, 'utf-8');
            } else {
                console.warn(colors.yellow(`Bundle file ${bundleName} does not exist`));
            }

            for (const dependencyName of Object.keys(allDependencies)) {
                if (
                    indexContent.includes(`from '${dependencyName}'`) ||
                    indexContent.includes(`require('${dependencyName}')`) ||
                    indexContent.includes(`require("${dependencyName}")`)
                ) {
                    packageJson.dependencies = packageJson.dependencies || {};

                    if (allDependencies[dependencyName] === undefined) {
                        throw new Error(`Can not find version for dependency "${dependencyName}"`);
                    }

                    packageJson.dependencies[dependencyName] = allDependencies[dependencyName];
                    // <- Note: [🧃] Using only `dependencies` (not `devDependencies`)
                }
            }
        }

        for (const dependencyName of additionalDependencies) {
            packageJson.dependencies = packageJson.dependencies || {};
            packageJson.dependencies[dependencyName] = packageJson.version;
            // <- Note: [🧃] Using only `dependencies` (not `devDependencies`)
        }

        if (packageFullname === '@promptbook/cli') {
            packageJson.bin = {
                promptbook: 'bin/promptbook-cli.js',
                ptbk: 'bin/promptbook-cli.js',
                book: 'bin/promptbook-cli.js',
                bk: 'bin/promptbook-cli.js',
                // <- TODO: [🧠] Pick one of and remove rest
            };
        } else if (packageFullname === 'ptbk') {
            packageJson.bin = {
                ptbk: 'bin/promptbook-cli-proxy.js',
            };
        }

        // Finalize dependencies for React component library: ensure React stays as peer only
        if (packageFullname === '@promptbook/components' && (packageJson as any).dependencies) {
            delete (packageJson as any).dependencies['react'];
            delete (packageJson as any).dependencies['react-dom'];
            if (Object.keys((packageJson as any).dependencies).length === 0) {
                delete (packageJson as any).dependencies;
            }
        }

        await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
        //     <- TODO: Add GENERATOR_WARNING to package.json
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?
    }

    // ==============================
    console.info(colors.cyan(`8️⃣  Make publishing instructions for Github Actions`));

    /**
     * Here are spreaded all the commands from `npm run test-without-package-generation-and-unit`
     *
     * TODO: [⛎] Automatically sync with `test-without-package-generation-and-unit`
     */
    const testSteps = [
        {
            name: '🧪 Test | Name discrepancies',
            run: `npm run test-name-discrepancies`,
        },
        {
            name: '🧪 Test | Spellcheck',
            run: `npm run test-spellcheck`,
        },
        {
            name: '🧪 Test | Lint',
            run: `npm run test-lint`,
        },
        {
            name: '🧪 Test | Types',
            run: `npm run test-types`,
        },
        {
            name: '🧪 Test | Books',
            run: `npm run test-books`,
            env: {
                OPENAI_API_KEY: '${{secrets.OPENAI_API_KEY}}',
                // <- TODO: Add all api keys
            },
        },
    ];

    /**
     * Here are spreaded all the commands from `npm run make`
     *
     * TODO: [⛎] Automatically sync with `make`
     */
    const makeSteps = [
        {
            name: '🏭 Make | Promptbook Collection',
            run: `npm run make-promptbook-collection`,
            env: {
                OPENAI_API_KEY: '${{secrets.OPENAI_API_KEY}}',
                // <- TODO: Add all api keys
            },
        },
        {
            name: '🏭 Make | 🆚 Update Version in Config',
            run: `npm run update-version-in-config`,
        },
        {
            name: '🏭 Make | Generate Packages',
            run: `npm run generate-packages`,
        },
        {
            name: '🏭 Make | Generate .bookc from Examples',
            run: `npm run generate-examples-bookc`,

            env: {
                OPENAI_API_KEY: '${{secrets.OPENAI_API_KEY}}',
                // <- TODO: Add all api keys
            },
        },
        {
            name: '🏭 Make | Generate Documentation',
            run: `npm run generate-documentation`,

            env: {
                GITHUB_TOKEN: '${{secrets.GITHUB_TOKEN}}',
            },
        },
        {
            name: '🏭 Make | Import Markdowns',
            run: `npm run import-markdowns`,
        },
        {
            name: '🏭 Make | Generate OpenAPI Types',
            run: `npm run generate-openapi-types`,
        },
    ];

    await writeFile(
        `./.github/workflows/publish.yml`,
        '# ' +
            GENERATOR_WARNING +
            '\n' +
            YAML.stringify(
                {
                    name: '🔼 Publish new version',
                    on: {
                        push: {
                            tags: ['v*'],
                        },
                    },
                    jobs: {
                        'publish-npm': {
                            name: 'Publish on NPM package registry',
                            'runs-on': 'ubuntu-latest',
                            permissions: {
                                contents: 'read',
                                'id-token': 'write',
                                // <- Note: Permissions are required with provenance statement @see https://docs.npmjs.com/generating-provenance-statements
                            },
                            steps: [
                                {
                                    name: '🔽 Checkout',
                                    uses: 'actions/checkout@v4',
                                },
                                {
                                    name: '🔽 Setup Node.js',
                                    uses: 'actions/setup-node@v4',
                                    with: {
                                        'node-version': 22,
                                        'registry-url': 'https://registry.npmjs.org/',
                                    },
                                },
                                {
                                    name: '🔽 Install dependencies',
                                    run: 'npm ci',
                                },
                                {
                                    name: '🔽🔠 Install dependencies in Book Components',
                                    run: 'npm ci',
                                    'working-directory': './scripts/book-components/',
                                },
                                {
                                    name: '🔽 Clone book submodule',
                                    run: 'git submodule update --init --recursive',
                                },
                                ...testSteps,
                                ...makeSteps,
                                ...packagesMetadata.map(({ packageBasename, packageFullname }) => ({
                                    name: `🔼 Publish ${packageFullname}`,
                                    'working-directory': `./packages/${packageBasename}`,
                                    run: 'npm publish --provenance --access public',
                                    env: {
                                        NODE_AUTH_TOKEN: '${{secrets.NPM_TOKEN}}',
                                    },
                                })),
                            ],
                        },
                        // TODO: Maybe share build steps between `publish-npm` and `publish-docker`
                        'publish-docker': {
                            name: 'Publish Docker image to DockerHub',
                            needs: 'publish-npm',
                            'runs-on': 'ubuntu-latest',
                            steps: [
                                {
                                    name: '🔽 Checkout',
                                    uses: 'actions/checkout@v4',
                                },
                                {
                                    name: '🔑 Login to DockerHub',
                                    uses: 'docker/login-action@v2',
                                    with: {
                                        username: '${{ secrets.DOCKERHUB_USER }}',
                                        password: '${{ secrets.DOCKERHUB_TOKEN }}',
                                    },
                                },
                                {
                                    name: '🔽 Setup Node.js',
                                    uses: 'actions/setup-node@v4',
                                    with: {
                                        'node-version': 22,
                                        'registry-url': 'https://registry.npmjs.org/',
                                    },
                                },
                                {
                                    name: '🔽 Install dependencies',
                                    run: 'npm ci',
                                },
                                {
                                    name: '🔽🔠 Install dependencies in Book Components',
                                    run: 'npm ci',
                                    'working-directory': './scripts/book-components/',
                                },
                                {
                                    name: '🔽 Clone book submodule',
                                    run: 'git submodule update --init --recursive',
                                },
                                {
                                    name: '🆚 Update version in Dockerfile',
                                    run: 'npx ts-node ./scripts/update-version-in-config/update-version-in-config.ts',
                                    // <- Note: Update version in Dockerfile before building the image
                                },
                                {
                                    name: '🆚 Load current version into the environment',
                                    run: 'echo "VERSION=$(node -p \'require(`./package.json`).version\')" >> $GITHUB_ENV',
                                },
                                {
                                    name: '👁‍🗨 Log version from previous step',
                                    run: 'echo $VERSION',
                                },
                                {
                                    name: '👁‍🗨 Log contents of the Dockerfile',
                                    run: 'cat Dockerfile',
                                },
                                {
                                    name: '🏭🔼 Build and Push Docker Image',
                                    uses: 'docker/build-push-action@v2',
                                    with: {
                                        context: '.',
                                        push: true,
                                        tags: 'hejny/promptbook:${{ env.VERSION }}',
                                    },
                                },
                            ],
                        },
                    },
                },
                { indent: 4 },
            ),
    );
    // <- Note: All changes affects up to version folowing the next one, so it is safe to run "🏭📦 Generate packages" script to affect the next version
    // <- TODO: Add GENERATOR_WARNING to publish.yml

    // ==============================
    // 9️⃣ Commit the changes

    if (isCommited) {
        await commit(['src/_packages', 'packages', '.github'], `📦 Generating packages \`${mainPackageJson.version}\``);
    }
}

/**
 * TODO: [👵] test before publish
 * TODO: Add warning to the copy/generated files
 * TODO: Use prettier to format the generated files
 * TODO: Normalize order of keys in package.json
 * Note: [⚫] Code in this file should never be published in any package
 */
