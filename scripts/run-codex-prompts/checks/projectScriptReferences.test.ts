import { projectScriptReferences } from './projectScriptReferences';

describe('project check configuration references', () => {
    it.each(['npm --silent run check', 'pnpm --silent run check', 'yarn --silent run check', 'yarn --silent check'])(
        'inspects conventional quiet invocations without treating flags as scripts: %s',
        (command) => {
            expect(projectScriptReferences(command)).toEqual(['check']);
        },
    );

    it.each([
        'npm --prefix child run check',
        'npm run check --prefix child',
        'npm run check --silent --prefix child',
        'pnpm --dir child run check',
        'pnpm run check --dir child',
        'yarn --cwd child check',
        'yarn check --cwd child',
    ])('leaves validation in another package to the actual command: %s', (command) => {
        expect(projectScriptReferences(command)).toEqual([]);
    });

    it('inspects each pipeline stage without mistaking quoted output examples for calls', () => {
        expect(
            projectScriptReferences(
                `npm run lint && node -e "console.log('(npm run missing-validation)')" && npm run build && npm test`,
            ),
        ).toEqual(['lint', 'build', 'test']);
    });

    it('keeps root checks in mixed workspace pipelines and treats tool flags after -- as tool arguments', () => {
        expect(projectScriptReferences('npm run check -- --prefix child && npm --prefix other run build')).toEqual([
            'check',
        ]);
    });

    it.each([
        'npm run missing-validation && cd child && npm run check',
        'npm run missing-validation && (cd child && npm run check)',
    ])('inspects root validation before a directory change: %s', (command) => {
        expect(projectScriptReferences(command)).toEqual(['missing-validation']);
    });

    it('keeps quoted directory-change examples opaque during setup inspection', () => {
        expect(
            projectScriptReferences(
                `npm run lint && node -e "console.log('(cd child && npm run missing-validation)')" && npm run build`,
            ),
        ).toEqual(['lint', 'build']);
    });
});
