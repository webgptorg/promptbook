import { describe, expect, it } from '@jest/globals';

describe('that fetch is defined', () => {
    it('should fetch sample data', () =>
        expect(fetch(`https://catfact.ninja/fact`).then((response) => response.json())).resolves.toEqual({
            fact: 'A group of cats is called a “clowder.”',
            length: 38,
        }));
});
