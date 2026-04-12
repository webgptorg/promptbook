import { writeFile } from 'fs/promises';
import { spaceTrim } from 'spacetrim';
import YAML from 'yaml';
import { GENERATOR_WARNING } from '../../src/config';
import type { PackageMetadata } from './PackageMetadata';
import { logPackageGenerationStep } from './logPackageGenerationStep';

/**
 * Regenerates the package-publishing GitHub Actions workflow.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @private function of generatePackages
 */
export async function writePublishWorkflow(packagesMetadata: ReadonlyArray<PackageMetadata>): Promise<void> {
    logPackageGenerationStep(`9️⃣  Make publishing instructions for Github Actions`);

    await writeFile(`./.github/workflows/publish.yml`, createPublishWorkflowFileContent(packagesMetadata));
    // <- Note: All changes affects up to version folowing the next one, so it is safe to run "🏭📦 Generate packages" script to affect the next version
}

/**
 * Creates the generated `publish.yml` workflow file content.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @returns YAML workflow file content prefixed by the generator warning
 * @private internal utility of writePublishWorkflow
 */
function createPublishWorkflowFileContent(packagesMetadata: ReadonlyArray<PackageMetadata>): string {
    const testSteps = createPublishWorkflowTestSteps();
    const makeSteps = createPublishWorkflowMakeSteps();

    return (
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
                        'timeout-minutes': 120,
                        // <- Note: The bundler can take a long time, so we need to set a higher timeout
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
                                name: '🔍 Debug Node & npm version',
                                run: spaceTrim(`
                                    node -v
                                    npm -v
                                `),
                            },
                            {
                                name: '🔽 Install dependencies',
                                run: 'npm ci',
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
                        'timeout-minutes': 30,
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
                                name: '🔽 Clone book submodule',
                                run: 'git submodule update --init --recursive',
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
                            {
                                name: '📝 Publish DockerHub description',
                                uses: 'peter-evans/dockerhub-description@v5',
                                with: {
                                    username: '${{ secrets.DOCKERHUB_USER }}',
                                    password: '${{ secrets.DOCKERHUB_TOKEN }}',
                                    repository: 'hejny/promptbook',
                                    'short-description': 'Promptbook Agents Server Docker image',
                                    'readme-filepath': './README.Docker.md',
                                },
                            },
                        ],
                    },
                },
            },
            { indent: 4 },
        )
    );
}

/**
 * Creates the shared publish-workflow test steps.
 *
 * @returns Workflow step definitions
 * @private internal utility of writePublishWorkflow
 */
function createPublishWorkflowTestSteps(): Array<Record<string, unknown>> {
    /**
     * Here are spreaded all the commands from `npm run test-without-package-generation-and-unit`
     *
     * TODO: [⛎] Automatically sync with `test-without-package-generation-and-unit`
     */
    return [
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
}

/**
 * Creates the shared publish-workflow `make` steps.
 *
 * @returns Workflow step definitions
 * @private internal utility of writePublishWorkflow
 */
function createPublishWorkflowMakeSteps(): Array<Record<string, unknown>> {
    /**
     * Here are spreaded all the commands from `npm run make`
     *
     * TODO: [⛎] Automatically sync with `make`
     */
    return [
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
}

// Note: [⚫] Code for repository script [writePublishWorkflow](scripts/generate-packages/writePublishWorkflow.ts) should never be published in any package
