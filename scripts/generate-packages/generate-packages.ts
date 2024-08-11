#!/usr/bin/env ts-node

import colors from 'colors';
import commander from 'commander';
import { readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { dirname, join, relative } from 'path';
import spaceTrim from 'spacetrim';
import type { PackageJson } from 'type-fest';
import { forTime } from 'waitasecond';
import YAML from 'yaml';
import { GENERATOR_WARNING } from '../../src/config';
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
program.option('--skip-bundler', `Skip the build process of bundler`, false);
program.parse(process.argv);

const { commit: isCommited, skipBundler: isBundlerSkipped } = program.opts();

generatePackages({ isCommited, isBundlerSkipped })
    .catch((error: Error) => {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
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
                // ${block(GENERATOR_WARNING)}
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

    // ==============================
    console.info(colors.cyan(`2️⃣  Generate package.json, README and other crucial files for each package`));

    const mainReadme = await readFile('./README.md', 'utf-8');
    for (const { isBuilded, readmeFilePath, packageFullname, packageBasename } of packagesMetadata) {
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

        packageReadme = spaceTrim(
            (block) => `
                <!-- ${block(GENERATOR_WARNING)} -->

                ${block(packageReadme)}
            `,
        );
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
        delete packageJson.dependencies;
        delete packageJson.devDependencies;
        delete packageJson.peerDependencies;

        packageJson.name = packageFullname;

        await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
        //     <- TODO: Add GENERATOR_WARNING to package.json
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?

        if (isBuilded) {
            await writeFile(`./packages/${packageBasename}/.gitignore`, ['esm', 'umd'].join('\n'));
            await writeFile(`./packages/${packageBasename}/.npmignore`, '');
            // <- TODO: Add GENERATOR_WARNING to .gitignore and .npmignore
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
            await execCommand(`rm -rf ./packages/${packageBasename}/umd`);
            await execCommand(`rm -rf ./packages/${packageBasename}/esm`);
        }
    }

    // ==============================
    console.info(colors.cyan(`4️⃣  Generate bundle for each package`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the bundler`));
    } else {
        await forTime(1000 * 60 * 60 * 0);
        await execCommand(`npx rollup --config rollup.config.js`);
    }

    // ==============================
    console.info(colors.cyan(`5️⃣  Postprocess the generated bundle`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping postprocessing`));
    } else {
        // Note: Keep `typings` only from `esm` (and remove `umd`)
        for (const packageMetadata of packagesMetadata) {
            const { packageBasename } = packageMetadata;
            await execCommand(`rm -rf ./packages/${packageBasename}/umd/typings`);
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
                packageFullname !== '@promptbook/node' &&
                packageFullname !== '@promptbook/cli' &&
                bundleFileContent.includes('[🟢]')
            ) {
                throw new Error(
                    spaceTrim(`
                        Things marked with [🟢] should never be never released out of @promptbook/node and @promptbook/cli

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

    // TODO: !!!!!! Check that `@promptbook/types` does not contain any runtime code

    // ==============================
    console.info(colors.cyan(`7️⃣  Add dependencies for each package`));

    for (const { isBuilded, packageFullname, packageBasename, additionalDependencies } of packagesMetadata) {
        const packageJson = JSON.parse(
            await readFile(`./packages/${packageBasename}/package.json`, 'utf-8'),
        ) as PackageJson;
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?

        if (isBuilded && packageFullname !== '@promptbook/cli') {
            packageJson.main = `./umd/index.umd.js`;
            packageJson.module = `./esm/index.es.js`;
            packageJson.typings = `./esm/typings/src/_packages/${packageBasename}.index.d.ts`;
        }

        if (
            !['@promptbook/core', '@promptbook/utils', '@promptbook/cli', '@promptbook/markdown-utils'].includes(
                packageFullname,
            )
        ) {
            packageJson.peerDependencies = {
                '@promptbook/core': packageJson.version,
            };
        }

        if (isBuilded) {
            const indexContent = await readFile(`./packages/${packageBasename}/esm/index.es.js`, 'utf-8');
            for (const dependencyName of Object.keys(allDependencies)) {
                if (indexContent.includes(`from '${dependencyName}'`)) {
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
            };
        }

        await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
        //     <- TODO: Add GENERATOR_WARNING to package.json
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?
    }

    // ==============================
    console.info(colors.cyan(`8️⃣  Make publishing instructions for Github Actions`));

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
    //     <- TODO: Add GENERATOR_WARNING to publish.yml

    // ==============================
    // 9️⃣ Commit the changes

    if (isCommited) {
        await commit(['src/_packages', 'packages', '.github'], `📦 Generating packages`);
    }
}

/**
 * TODO: !! [👵] test before publish
 * TODO: !! Add warning to the copy/generated files
 * TODO: !! Use prettier to format the generated files
 * TODO: !! Normalize order of keys in package.json
 */
