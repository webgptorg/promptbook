import { getRefactorCandidateLevelConfiguration } from './RefactorCandidateLevel';

describe('RefactorCandidateLevel', () => {
    it('keeps each next level stricter than the previous one', () => {
        const levelPairs = [
            ['xlow', 'low'],
            ['low', 'medium'],
            ['medium', 'high'],
            ['high', 'xhigh'],
            ['xhigh', 'extreme'],
        ] as const;

        for (const [currentLevel, nextLevel] of levelPairs) {
            const currentConfiguration = getRefactorCandidateLevelConfiguration(currentLevel);
            const nextConfiguration = getRefactorCandidateLevelConfiguration(nextLevel);

            expect(nextConfiguration.maxDefaultLineCount).toBeLessThan(currentConfiguration.maxDefaultLineCount);
            expect(nextConfiguration.maxEntityCountPerFile).toBeLessThan(currentConfiguration.maxEntityCountPerFile);
            expect(nextConfiguration.maxFunctionCountPerFile).toBeLessThan(currentConfiguration.maxFunctionCountPerFile);
            expect(nextConfiguration.maxFunctionComplexity).toBeLessThan(currentConfiguration.maxFunctionComplexity);
        }
    });

    it('keeps xlow and extreme levels far apart to provide a much wider spread', () => {
        const xlowConfiguration = getRefactorCandidateLevelConfiguration('xlow');
        const extremeConfiguration = getRefactorCandidateLevelConfiguration('extreme');

        expect(xlowConfiguration.maxDefaultLineCount / extremeConfiguration.maxDefaultLineCount).toBeGreaterThanOrEqual(50);
        expect(xlowConfiguration.maxEntityCountPerFile / extremeConfiguration.maxEntityCountPerFile).toBeGreaterThanOrEqual(
            30,
        );
        expect(
            xlowConfiguration.maxFunctionCountPerFile / extremeConfiguration.maxFunctionCountPerFile,
        ).toBeGreaterThanOrEqual(20);
        expect(xlowConfiguration.maxFunctionComplexity / extremeConfiguration.maxFunctionComplexity).toBeGreaterThanOrEqual(
            10,
        );
    });
});
