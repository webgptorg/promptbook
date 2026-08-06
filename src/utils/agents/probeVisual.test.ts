import { writeFileSync } from 'fs';
import { join } from 'path';
import { createAvatarDefinitionFromAgentBasicInformation } from '../../avatars/avatarRenderingUtils';
import { renderAvatarVisualAsciiArt } from '../../avatars/renderAvatarVisualAsciiArt';
import type { AvatarVisualId } from '../../avatars/types/AvatarVisualDefinition';

describe('probe', () => {
    it('renders every visual into the terminal grid', async () => {
        const { createCanvas } = await import('@napi-rs/canvas');
        const createCanvasForAsciiArt = (width: number, height: number) =>
            createCanvas(width, height) as unknown as HTMLCanvasElement;
        const avatarDefinition = createAvatarDefinitionFromAgentBasicInformation({
            agentName: 'Promptbook Developer',
            agentHash: 'promptbook-developer',
            meta: {},
        });

        const visualIds: AvatarVisualId[] = ['ascii-octopus', 'octopus3d4', 'minecraft', 'fractal', 'orb', 'pixel-art'];
        // eslint-disable-next-line no-control-regex
        const strip = (line: string) => line.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '').trimEnd();

        const output = visualIds.flatMap((visualId) => [
            `=== ${visualId} ===`,
            ...renderAvatarVisualAsciiArt({
                avatarDefinition,
                visualId,
                surface: 'transparent',
                columns: 48,
                rows: 12,
                canvasWidth: 512,
                canvasHeight: 256,
                timeMs: 840,
                createCanvas: createCanvasForAsciiArt,
            }).map(strip),
            '',
        ]);
        writeFileSync(join(process.cwd(), 'probe-output.txt'), output.join('\n'), 'utf-8');
        expect(true).toBe(true);
    });
});
