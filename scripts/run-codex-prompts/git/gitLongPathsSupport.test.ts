import { $enableGitLongPathsSupport, buildGitLongPathsEnvironmentVariables } from './gitLongPathsSupport';

describe('buildGitLongPathsEnvironmentVariables', () => {
    it('adds the first environment-provided git configuration entry', () => {
        expect(buildGitLongPathsEnvironmentVariables({})).toEqual({
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: 'core.longpaths',
            GIT_CONFIG_VALUE_0: 'true',
        });
    });

    it('appends after the git configuration entries the environment already provides', () => {
        expect(
            buildGitLongPathsEnvironmentVariables({
                GIT_CONFIG_COUNT: '2',
                GIT_CONFIG_KEY_0: 'user.name',
                GIT_CONFIG_VALUE_0: 'Coding Agent',
                GIT_CONFIG_KEY_1: 'user.email',
                GIT_CONFIG_VALUE_1: 'agent@example.com',
            }),
        ).toEqual({
            GIT_CONFIG_COUNT: '3',
            GIT_CONFIG_KEY_2: 'core.longpaths',
            GIT_CONFIG_VALUE_2: 'true',
        });
    });

    it('keeps an already configured `core.longpaths` untouched', () => {
        expect(
            buildGitLongPathsEnvironmentVariables({
                GIT_CONFIG_COUNT: '1',
                GIT_CONFIG_KEY_0: 'core.longpaths',
                GIT_CONFIG_VALUE_0: 'false',
            }),
        ).toEqual({});
    });

    it('replaces a count git itself would reject', () => {
        expect(buildGitLongPathsEnvironmentVariables({ GIT_CONFIG_COUNT: 'not-a-number' })).toEqual({
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: 'core.longpaths',
            GIT_CONFIG_VALUE_0: 'true',
        });
    });
});

describe('$enableGitLongPathsSupport', () => {
    const originalEnvironment = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnvironment };
    });

    it('makes every subsequently started process inherit `core.longpaths`', () => {
        delete process.env.GIT_CONFIG_COUNT;

        $enableGitLongPathsSupport();

        expect(process.env.GIT_CONFIG_COUNT).toBe('1');
        expect(process.env.GIT_CONFIG_KEY_0).toBe('core.longpaths');
        expect(process.env.GIT_CONFIG_VALUE_0).toBe('true');
    });

    it('stays idempotent across repeated isolated rounds', () => {
        delete process.env.GIT_CONFIG_COUNT;

        $enableGitLongPathsSupport();
        $enableGitLongPathsSupport();

        expect(process.env.GIT_CONFIG_COUNT).toBe('1');
    });
});
