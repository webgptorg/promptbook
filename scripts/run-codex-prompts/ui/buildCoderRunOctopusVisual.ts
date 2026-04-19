import colors from 'colors';
import { centerAnsiText, padAnsiText, visibleLength } from './coderRunUiText';

/**
 * One animation frame for the octopus tentacles.
 */
type OctopusTentacleFrame = readonly [string, string, string, string, string, string];

/**
 * Options for the horizontal octopus brand illustration.
 */
export type BuildCoderRunOctopusVisualOptions = {
    readonly totalWidth: number;
    readonly animationFrame: number;
};

/**
 * Fixed left-side head used across all octopus frames.
 */
const OCTOPUS_HEAD_LINES: readonly string[] = [
    colors.magenta.bold('      .-""""-.'),
    colors.magenta.bold("    .'  .-.  '."),
    `${colors.magenta.bold('   /   (')}${colors.yellow.bold('o o')}${colors.magenta.bold(')   \\')}`,
    colors.magenta.bold('  |      ^      |'),
    colors.magenta.bold('  |   \\___/     |'),
    colors.magenta.bold('   \\___________/'),
];

/**
 * Gap between the head silhouette and the animated tentacles.
 */
const OCTOPUS_HEAD_TO_TENTACLE_GAP = '   ';

/**
 * Animated right-side tentacle poses.
 */
const OCTOPUS_TENTACLE_FRAMES: readonly OctopusTentacleFrame[] = [
    [
        `                 ${colors.green.bold('ptbk.io')}`,
        colors.cyan('          __      __'),
        colors.cyan('   _/\\/\\/  \\_/\\/  \\_/\\_'),
        colors.cyan('_/\\/  _   /\\/  _  /\\/\\__'),
        colors.cyan('\\__/ /_/\\/  \\_/ \\_/  \\_/'),
        colors.cyan('   /_/   \\__/   \\__/  /'),
    ],
    [
        `                 ${colors.green.bold('ptbk.io')}`,
        colors.cyan('          __      __'),
        colors.cyan('   _/\\/  \\_/\\/\\_  \\_/\\_'),
        colors.cyan('_/\\/  _  /\\/  _ \\/\\/  \\__'),
        colors.cyan('\\__/ /_/\\/  \\_/  \\_ /\\_/'),
        colors.cyan('     /_/  \\__/   \\__/  /'),
    ],
    [
        `                 ${colors.green.bold('ptbk.io')}`,
        colors.cyan('          __      __'),
        colors.cyan('   _/\\/\\/  \\_/\\_  \\_/\\_'),
        colors.cyan('_/\\/  _   /\\/  _  /\\/  \\_'),
        colors.cyan('\\__/ /_/\\/  \\_/ \\_/  _/'),
        colors.cyan('   /_/    \\__/    \\__/'),
    ],
    [
        `                 ${colors.green.bold('ptbk.io')}`,
        colors.cyan('          __      __'),
        colors.cyan('   _/\\/  \\_/\\/  \\_/\\/\\_'),
        colors.cyan('_/\\/  _  /\\/  _  /\\/\\  \\'),
        colors.cyan('\\__/ /_/\\/  \\_/ \\_  \\_/'),
        colors.cyan('    /_/   \\__/   \\__\\_/'),
    ],
];

/**
 * Builds the horizontal octopus illustration shown above the coder-run dashboard.
 *
 * @private internal utility of coder run UI
 */
export function buildCoderRunOctopusVisual(options: BuildCoderRunOctopusVisualOptions): readonly string[] {
    const tentacleFrame =
        OCTOPUS_TENTACLE_FRAMES[
            ((options.animationFrame % OCTOPUS_TENTACLE_FRAMES.length) + OCTOPUS_TENTACLE_FRAMES.length) %
                OCTOPUS_TENTACLE_FRAMES.length
        ]!;

    const visualLines = OCTOPUS_HEAD_LINES.map(
        (headLine, lineIndex) => `${headLine}${OCTOPUS_HEAD_TO_TENTACLE_GAP}${tentacleFrame[lineIndex]}`,
    );
    const visualWidth = visualLines.reduce((maxWidth, line) => Math.max(maxWidth, visibleLength(line)), 0);

    return visualLines.map((line) => centerAnsiText(padAnsiText(line, visualWidth), options.totalWidth));
}
