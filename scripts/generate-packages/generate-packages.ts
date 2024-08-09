#!/usr/bin/env ts-node

import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { dirname, join, relative } from 'path';
import spaceTrim from 'spacetrim';
import type { PackageJson } from 'type-fest';
import { forTime } from 'waitasecond';
import YAML from 'yaml';
import { prettifyMarkdown } from '../../src/utils/markdown/prettifyMarkdown';
import { removeContentComments } from '../../src/utils/markdown/removeContentComments';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import { execCommand } from '../utils/execCommand/execCommand';
import { getPackagesMetadata } from './getPackagesMetadata';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.parse(process.argv);

const { commit: isCommited } = program.opts();

generatePackages({ isCommited })
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function generatePackages({ isCommited }: { isCommited: boolean }) {
    console.info(`📦  Generating packages`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    // 0️⃣ Get metadata of all packages
    const packagesMetadata = await getPackagesMetadata();

    // 1️⃣ Cleanup
    for (const packageMetadata of packagesMetadata) {
        const { isBuilded, packageBasename } = packageMetadata;

        if (!isBuilded) {
            continue;
        }
        await execCommand(`rm -rf ./packages/${packageBasename}/umd`);
        await execCommand(`rm -rf ./packages/${packageBasename}/esm`);
    }

    // 2️⃣ Generate `entryIndexFilePath` of all packages
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
            const { filePath, name, isType } = entity;

            let importPath = `${relative(dirname(entryIndexFilePath), filePath).split('\\').join('/')}`;
            if (!importPath.startsWith('.')) {
                importPath = './' + importPath;
            }
            if (importPath.endsWith('.ts')) {
                importPath = importPath.slice(0, -3);
            }
            const typePrefix = !isType ? '' : ' type';

            entryIndexFilePathContentImports.push(`import${typePrefix} { ${name} } from '${importPath}';`);
            entryIndexFilePathContentExports.push(`export${typePrefix} { ${name} };`);
        }

        let entryIndexFilePathContent = spaceTrim(
            (block) => `
                // \`${packageFullname}\`
                import { PROMPTBOOK_VERSION } from '../version';
                ${block(entryIndexFilePathContentImports.join('\n'))}


                // Note: Exporting version from each package
                export { PROMPTBOOK_VERSION };


                // Note: Entities of the \`${packageFullname}\`
                ${block(entryIndexFilePathContentExports.join('\n'))}
            
            `,
        );

        entryIndexFilePathContent += '\n';

        // TODO: !! `entryIndexFilePathContent = await prettifyTypeScript(entryIndexFilePathContent)`

        writeFile(entryIndexFilePath, entryIndexFilePathContent, 'utf-8');
        console.info(colors.green('Generated index file ' + entryIndexFilePath.split('\\').join('/')));
    }

    await forTime(1000 * 60 * 60 * 0);

    // 3️⃣ Generate bundles of all packages
    await execCommand(`npx rollup --config rollup.config.js`);

    // 4️⃣ Test that nothing what should not be published is published
    /*
    TODO: !!! Test that:
    - Test umd, esm, typings and everything else

    [🟡] This code should never be published outside of `@promptbook/cli`
    [🟢] This code should never be published outside of `@promptbook/node`
    [🔵] This code should never be published outside of `@promptbook/browser`
    [⚪] This should never be in any released package
    */

    // Note: 5️⃣ Postprocess generated packages and create README.md and package.json for each package
    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;

    if (!mainPackageJson.version) {
        throw new Error(`Version is not defined in the package.json`);
    }

    console.info(colors.bgWhite(mainPackageJson.version));
    const mainReadme = await readFile('./README.md', 'utf-8');
    for (const {
        isBuilded,
        readmeFilePath,
        packageFullname,
        packageBasename,
        additionalDependencies,
    } of packagesMetadata) {
        let packageReadme = mainReadme;
        const packageReadmeExtra = await readFile(readmeFilePath, 'utf-8');

        let installCommand = spaceTrim(`

            # Install just this package to save space
            npm i ${packageFullname}


        `);

        if (packageFullname === '@promptbook/cli') {
            installCommand = spaceTrim(`

                # Install as dev dependency
                npm i -D ${packageFullname}

                # Or install globally
                npm i -g ${packageFullname}

            `);
        } else if (packageFullname === '@promptbook/types') {
            installCommand = `npm i -D ${packageFullname}`;
        }

        const packageReadmeFullextra = spaceTrim(
            (block) => `
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
                .split(`<!--/Here will be placed specific package info-->`)
                .join(packageReadmeFullextra);
        }

        /*
        TODO: Fix or remove Socket badge

        const badge = `[![Socket Badge](https://socket.dev/api/badge/npm/package/${packageFullname})](https://socket.dev/npm/package/${packageFullname})`;

        packageReadme = packageReadme.split(`\n<!--/Badges-->`).join(badge + '\n\n<!--/Badges-->');
        */

        // TODO: [🍓] Convert mermaid diagrams to images or remove them from the markdown published to NPM

        packageReadme = removeContentComments(packageReadme);

        prettifyMarkdown(packageReadme);

        await writeFile(
            `./packages/${packageBasename}/README.md`,
            packageReadme,
            /*
            spaceTrim(`

                # ![Promptbook logo - cube with letters P and B](./other/design/logo-h1.png) Promptbook

                Supercharge your use of large language models

                [Read the manual](https://github.com/webgptorg/promptbook)

            `),
            */
        );

        const packageJson = JSON.parse(JSON.stringify(mainPackageJson) /* <- Note: Make deep copy */) as PackageJson;
        delete packageJson.scripts;
        delete packageJson.devDependencies;
        packageJson.name = packageFullname;

        if (!['@promptbook/core', '@promptbook/utils'].includes(packageFullname)) {
            packageJson.peerDependencies = {
                '@promptbook/core': packageJson.version,
            };
        }

        if (isBuilded) {
            const indexContent = await readFile(`./packages/${packageBasename}/esm/index.es.js`, 'utf-8');
            for (const dependencyName in packageJson.dependencies) {
                if (!indexContent.includes(`from '${dependencyName}'`)) {
                    delete packageJson.dependencies[dependencyName];
                }
            }
        } else {
            delete packageJson.dependencies;
            delete packageJson.devDependencies;
            delete packageJson.peerDependencies;
        }

        packageJson.dependencies = {
            ...(packageJson.dependencies || {}),
            ...Object.fromEntries(additionalDependencies.map((dependency) => [dependency, packageJson.version])),
        };

        if (isBuilded) {
            packageJson.main = `./umd/index.umd.js`;
            packageJson.module = `./esm/index.es.js`;
            packageJson.typings = `./esm/typings/src/_packages/${packageBasename}.index.d.ts`;
        }

        if (packageFullname === '@promptbook/cli') {
            packageJson.bin = {
                promptbook: 'bin/promptbook-cli.js',
                ptbk: 'bin/promptbook-cli.js',
            };
        }

        // TODO: !! Filter out dependencies only for the current package
        await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');

        if (isBuilded) {
            await writeFile(`./packages/${packageBasename}/.gitignore`, ['esm', 'umd'].join('\n'));
            await writeFile(`./packages/${packageBasename}/.npmignore`, '');
        }
    }

    await writeFile(
        `./.github/workflows/publish.yml`,
        YAML.stringify(
            {
                name: 'Publish new version',
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
                                name: 'Checkout',
                                uses: 'actions/checkout@v2',
                            },
                            {
                                name: 'Setup Node.js',
                                uses: 'actions/setup-node@v1',
                                with: {
                                    'node-version': 18,
                                    'registry-url': 'https://registry.npmjs.org/',
                                },
                            },
                            {
                                name: 'Install dependencies',
                                run: 'npm ci',
                            },
                            {
                                name: 'Build packages bundles',
                                // Note: Generate packages before publishing to put the recent version in each package.json
                                // TODO: It will be better to have here just "npx rollup --config rollup.config.js" BUT it will not work because:
                                //       This is run after a version tag is pushed to the repository, so used publish.yml is one version behing
                                run: `npx ts-node ./scripts/generate-packages/generate-packages.ts`,
                            },
                            ...packagesMetadata.map(({ packageBasename, packageFullname }) => ({
                                name: `Publish ${packageFullname}`,
                                'working-directory': `./packages/${packageBasename}`,
                                run: 'npm publish --provenance --access public',
                                env: {
                                    NODE_AUTH_TOKEN: '${{secrets.NPM_TOKEN}}',
                                },
                            })),
                        ],
                    },
                },
            },
            { indent: 4 },
        )
            .split('"')
            .join("'") /* <- TODO: Can the replace be done directly in YAML.stringify options? */,
    );

    if (isCommited) {
        await commit('packages', `📦 Generating packages`);
        await commit('.github', `📦 Update publish workflow for generated packages`);
    }

    console.info(`[ 📦  Generating packages ]`);
}

/**
 * TODO: !! [👵] test before publish
 * TODO: !! Add warning to the copy/generated files
 * TODO: !! Use prettier to format the generated files
 * TODO: !! Normalize order of keys in package.json
 */
