import {
    DESTRUCTIVE_SQL_RULE,
    detectDestructiveSqlStatements,
} from './detectDestructiveSqlStatements';

describe('detectDestructiveSqlStatements', () => {
    it('detects DROP TABLE statements', () => {
        const matches = detectDestructiveSqlStatements('DROP TABLE "prefix_Test";');

        expect(matches).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rule: DESTRUCTIVE_SQL_RULE.DROP_TABLE,
                }),
            ]),
        );
    });

    it('detects ALTER TABLE ... DROP COLUMN statements', () => {
        const matches = detectDestructiveSqlStatements('ALTER TABLE "prefix_Test" DROP COLUMN "legacy";');

        expect(matches).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rule: DESTRUCTIVE_SQL_RULE.DROP_COLUMN,
                }),
            ]),
        );
    });

    it('detects TRUNCATE statements', () => {
        const matches = detectDestructiveSqlStatements('TRUNCATE TABLE "prefix_Test";');

        expect(matches).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rule: DESTRUCTIVE_SQL_RULE.TRUNCATE,
                }),
            ]),
        );
    });

    it('detects DELETE FROM without WHERE', () => {
        const matches = detectDestructiveSqlStatements('DELETE FROM "prefix_Test";');

        expect(matches).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rule: DESTRUCTIVE_SQL_RULE.DELETE_WITHOUT_WHERE,
                }),
            ]),
        );
    });

    it('does not flag DELETE FROM with WHERE clause', () => {
        const matches = detectDestructiveSqlStatements('DELETE FROM "prefix_Test" WHERE "id" = 1;');

        expect(matches).toEqual([]);
    });

    it('ignores destructive text inside comments', () => {
        const matches = detectDestructiveSqlStatements(`
            -- DROP TABLE "prefix_Test";
            /*
             TRUNCATE TABLE "prefix_Test";
            */
            SELECT 1;
        `);

        expect(matches).toEqual([]);
    });
});
