import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getPublishConfigs } from 'app-builder-lib/out/publish/PublishManager.js';

/** The desktop configuration used by both platform packagers. */
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('desktop packaging leaves release uploads to the workflow even when GH_TOKEN is present', async (t) => {
    const previousToken = process.env.GH_TOKEN;
    process.env.GH_TOKEN = 'fixture-release-token';
    t.after(() => {
        if (previousToken === undefined) delete process.env.GH_TOKEN;
        else process.env.GH_TOKEN = previousToken;
    });
    for (const platform of ['mac', 'win']) {
        const packager = {
            config: manifest.build,
            platformSpecificBuildOptions: manifest.build[platform],
            info: { config: manifest.build, appInfo: {}, repositoryInfo: Promise.resolve(null) },
            expandMacro: (value) => value,
        };
        assert.equal(await getPublishConfigs(packager, null, null, false), null, `${platform} must not infer an updater from the release token`);
    }
});
