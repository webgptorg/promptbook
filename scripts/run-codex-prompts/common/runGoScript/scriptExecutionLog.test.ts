import { buildLoggedBashExecution, PTBK_CODER_LOG_FILE_ENV_NAME } from './scriptExecutionLog';

describe('logged shell startup', () => {
    it('loads login profiles by default so harness discovery keeps its existing behavior', () => {
        expect(buildLoggedBashExecution('fixture.sh').args[0]).toBe('-lc');
    });

    it('keeps ownership and logging when checks use the inherited environment', () => {
        const harness = buildLoggedBashExecution('fixture.sh', 'fixture.log');
        const check = buildLoggedBashExecution('fixture.sh', 'fixture.log', false);

        expect(check.args[0]).toBe('-c');
        expect(check.args.slice(1)).toEqual(harness.args.slice(1));
        expect(check.env).toEqual(harness.env);
        expect(check.env).toHaveProperty(PTBK_CODER_LOG_FILE_ENV_NAME);
    });
});
