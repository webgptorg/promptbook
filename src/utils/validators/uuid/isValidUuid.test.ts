import { describe, expect, it } from '@jest/globals';
import { isValidUuid } from './isValidUuid';

describe(`validation of UUIDs`, () => {
    it(`is valid`, () => {
        expect(isValidUuid(`6c815d9e-b1b0-4768-86ef-8d8e3635984a`)).toBe(true);
        expect(isValidUuid(`9de47735-e949-41f4-9819-012af1e76aeb`)).toBe(true);
        expect(isValidUuid(`53b5a203-1b6a-4db2-b4df-f1ec37ce01ee`)).toBe(true);
        expect(isValidUuid(`0f3bbeb6-19d3-42f2-9436-500b8d418c8d`)).toBe(true);
        expect(isValidUuid(`e1921419-74e7-40a7-b288-edbc4a06037a`)).toBe(true);
        expect(isValidUuid(`a4873faf-8504-40d5-a098-482b7cd5f214`)).toBe(true);
        expect(isValidUuid(`724f0e12-7390-4510-b6f5-df414f69b432`)).toBe(true);
        expect(isValidUuid(`30f4d3db-60a0-4100-918e-e68bd7fe585b`)).toBe(true);
        expect(isValidUuid(`d132ff5f-48ab-4f32-bff0-533f761ee978`)).toBe(true);
        expect(isValidUuid(`b4821d3c-5c73-4048-a07d-a8ff730a6d3c`)).toBe(true);
    });

    it(`is NOT valid`, () => {
        expect(isValidUuid(``)).toBe(false);
        expect(isValidUuid(`1`)).toBe(false);
        expect(isValidUuid(`1.A`)).toBe(false);
        expect(isValidUuid(`Hello`)).toBe(false);
        expect(isValidUuid(`d132ff5f`)).toBe(false);
        expect(isValidUuid(`b4821d3c-5c73-4048-a07d`)).toBe(false);
        expect(isValidUuid(`9SeSQTupmQHwuSrLi`)).toBe(false);
        expect(isValidUuid(`wqgbh5qgkohkjhtetvh7`)).toBe(false);
        expect(isValidUuid(`uuyrr6h4niwaqfbmlb65`)).toBe(false);
    });
});
