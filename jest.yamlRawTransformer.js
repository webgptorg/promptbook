/**
 * Jest transformer for YAML files imported with the `?raw` Vite query suffix.
 * Returns the raw file content as a default-exported string so that
 * `import yaml from './file.yaml?raw'` works in Jest test runs.
 */
module.exports = {
    process(sourceText) {
        return {
            code: `module.exports = ${JSON.stringify(sourceText)};`,
        };
    },
};
