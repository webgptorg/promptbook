import { describe, expect, it } from '@jest/globals';
import { createAvatarPalette, prepareAvatarCanvas } from './avatarRenderingUtils';

describe('createAvatarPalette', () => {
    it('keeps the avatar background transparent when the parent card owns the surface', () => {
        const palette = createAvatarPalette(
            {
                agentName: 'Assistant',
                agentHash: 'hash-1',
                colors: ['#ff3366'],
            },
            'transparent',
        );

        expect(palette.background).toBe('transparent');
        expect(palette.backgroundSecondary).toBe('transparent');
        expect(palette.primary).toBe('#ff3366');
    });
});

describe('prepareAvatarCanvas', () => {
    it('reuses the existing backing store when size and pixel ratio stay unchanged', () => {
        let widthAssignmentCount = 0;
        let heightAssignmentCount = 0;
        let styleWidthAssignmentCount = 0;
        let styleHeightAssignmentCount = 0;
        let widthValue = 0;
        let heightValue = 0;
        let styleWidthValue = '';
        let styleHeightValue = '';

        const canvasStyle = {} as HTMLCanvasElement['style'];
        const canvas = { style: canvasStyle } as HTMLCanvasElement;

        Object.defineProperty(canvas, 'width', {
            get: () => widthValue,
            set: (value: number) => {
                widthAssignmentCount++;
                widthValue = value;
            },
            configurable: true,
        });
        Object.defineProperty(canvas, 'height', {
            get: () => heightValue,
            set: (value: number) => {
                heightAssignmentCount++;
                heightValue = value;
            },
            configurable: true,
        });
        Object.defineProperty(canvasStyle, 'width', {
            get: () => styleWidthValue,
            set: (value: string) => {
                styleWidthAssignmentCount++;
                styleWidthValue = value;
            },
            configurable: true,
        });
        Object.defineProperty(canvasStyle, 'height', {
            get: () => styleHeightValue,
            set: (value: string) => {
                styleHeightAssignmentCount++;
                styleHeightValue = value;
            },
            configurable: true,
        });

        const context = {
            setTransform: jest.fn(),
            clearRect: jest.fn(),
        } as unknown as CanvasRenderingContext2D;

        prepareAvatarCanvas(canvas, context, 42, 2);
        prepareAvatarCanvas(canvas, context, 42, 2);

        expect(widthValue).toBe(84);
        expect(heightValue).toBe(84);
        expect(styleWidthValue).toBe('42px');
        expect(styleHeightValue).toBe('42px');
        expect(widthAssignmentCount).toBe(1);
        expect(heightAssignmentCount).toBe(1);
        expect(styleWidthAssignmentCount).toBe(1);
        expect(styleHeightAssignmentCount).toBe(1);
        expect(context.setTransform).toHaveBeenCalledTimes(2);
        expect(context.clearRect).toHaveBeenCalledTimes(2);
    });
});
