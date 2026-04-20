import colors from 'colors';
import spaceTrim from 'spacetrim';
import { keepUnused } from '../../../src/utils/organization/keepUnused';
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

    const octopus = visualLines.map((line) => centerAnsiText(padAnsiText(line, visualWidth), options.totalWidth));

    keepUnused(octopus);
    /*
    Note: Octopus art should look better, now using just text
    https://www.google.com/search?sca_esv=52e84acb78c558cc&sxsrf=ANbL-n7DVKf71T1HSPRpM-2skfMss0jh7w:1776693767588&udm=2&fbs=ADc_l-ZseckkBJUFopaGDNYa-HGjo4_b6b_a7pIHTL5Y9QnExg6xJqXbG7aOLcH8CWqOtkzCrjxXWZVmrIhYPvZzFDVUIb7oTJfuJ6idsCc5GA1j5KGoi2q3sW0uDBWWfYgbuxGWTQPZMetvj33BdP833wZm47mxW-6rC3bTQWluwJdOsgloPieyQvTfF2uNgIZ_K0KZ-WzpL1An8GuRrKqHdvl8T306FA&q=octopus&sa=X&ved=2ahUKEwil7ZCHzPyTAxUghP0HHY-_Js8QtKgLegQIOhAB&biw=1745&bih=903&dpr=1.1#sv=CAMSVhoyKhBlLVl1bHNmeVhneml6a1dNMg5ZdWxzZnlYZ3ppemtXTToOTVJvdXhTdk5STkZ4d00gBCocCgZtb3NhaWMSEGUtWXVsc2Z5WGd6aXprV00YADABGAcg46LBxA9KCBABGAEgASgB
    https://www.mrgoodfish.com/wp-content/uploads/2022/09/Eledone_moschata__.png
    https://fish-commercial-names.ec.europa.eu/fish-names/jakarta.faces.resource/pictograms/octopus_vulgaris.jpg.xhtml?ln=images
    https://www.asciiart.eu/image-to-ascii
    */

    // Note: Created by https://patorjk.com/software/taag/#p=display&f=ANSI+Compact&t=ptbk.io&x=none&v=4&h=4&w=80&we=false
    return spaceTrim(`                        
                                   
        ▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄▄  ▄▄ ▄▄   ▄▄  ▄▄▄  
        ██▄█▀  ██   ██▄██ ██▄█▀   ██ ██▀██ 
        ██     ██   ██▄█▀ ██ ██ ▄ ██ ▀███▀ 
                                            
    `)
        .split('\n')
        .map((line) => centerAnsiText(line, options.totalWidth));
}
