import { useMemo } from 'react';
import { spaceTrim } from 'spacetrim';
import { Color } from '../../../../../src/utils/color/Color';
import { darken } from '../../../../../src/utils/color/operators/darken';
import { lighten } from '../../../../../src/utils/color/operators/lighten';
import { keepUnused } from '../../../../../src/utils/organization/keepUnused';

export function useAgentBackground(colorString: string | undefined) {
    return useMemo(() => {
        // [🧠] Default color should be imported constant, but for now hardcoded fallback
        const PROMPTBOOK_COLOR_HEX = '#f15b24'; // TODO: Import PROMPTBOOK_COLOR
        const brandColorString = colorString || PROMPTBOOK_COLOR_HEX;

        let brandColor;
        try {
            brandColor = Color.fromSafe(brandColorString.split(',')[0].trim());
        } catch {
            brandColor = Color.fromHex(PROMPTBOOK_COLOR_HEX);
        }

        const brandColorHex = brandColor.toHex();
        const brandColorLightHex = brandColor.then(lighten(0.2)).toHex();
        const brandColorDarkHex = brandColor.then(darken(0.15)).toHex();

        // Generate Noisy SVG Background
        const color1 = brandColor;
        // const color2 = brandColors[1] || brandColors[0]!; // Use secondary color if available?
        // For simplicity using primary color for now or derive second one
        const color2 = brandColor;

        // [🧠] Make colors much lighter for the background
        const color1Light = color1.then(lighten(0.3)).toHex();
        const color1Main = color1.toHex();
        const color1Dark = color1.then(darken(0.3)).toHex();

        const color2Light = color2.then(lighten(0.3)).toHex();
        const color2Main = color2.toHex();
        const color2Dark = color2.then(darken(0.3)).toHex();

        const SMALL_PIXEL_SIZE = 9; // Size of the "pixels" in the pattern
        const LARGE_PIXEL_SIZE = SMALL_PIXEL_SIZE * (32 / 24); // Size of the larger "pixels" to break up the pattern

        const svgPixalatedImage = spaceTrim(`
            <svg xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1920 1080"
              width="1920" height="1080"
              preserveAspectRatio="xMidYMid slice"
              shape-rendering="crispEdges">
              <defs>
                <!-- Bottom-left -->
                <radialGradient id="grad1" cx="0%" cy="100%" r="90%">
                  <stop offset="0%" stop-color="${color1Light}" />
                  <stop offset="50%" stop-color="${color1Main}" />
                  <stop offset="100%" stop-color="${color1Dark}" />
                </radialGradient>

                <!-- Bottom-right -->
                <radialGradient id="grad2" cx="100%" cy="100%" r="90%">
                  <stop offset="0%" stop-color="${color2Light}" />
                  <stop offset="50%" stop-color="${color2Main}" />
                  <stop offset="100%" stop-color="${color2Dark}" />
                </radialGradient>

                <!-- White top fade -->
                <linearGradient id="whiteTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
                  <stop offset="100%" stop-color="#ffffff" stop-opacity="0.28" />
                </linearGradient>

                <!-- Mask so pixels are stronger near bottom -->
                <linearGradient id="pixelStrength" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="white" stop-opacity="0.12" />
                  <stop offset="35%" stop-color="white" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="white" stop-opacity="1" />
                </linearGradient>

                <mask id="pixelMask">
                  <rect width="100%" height="100%" fill="url(#pixelStrength)" />
                </mask>

                <!-- Small hard pixels -->
                <pattern id="px1" patternUnits="userSpaceOnUse" width="144" height="144">
                  <rect x="0" y="0" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.10" />
                  <rect x="${SMALL_PIXEL_SIZE}" y="0" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#000000" opacity="0.05" />
                  <rect x="${
                      SMALL_PIXEL_SIZE * 3
                  }" y="0" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.08" />
                  <rect x="${
                      SMALL_PIXEL_SIZE * 5
                  }" y="0" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#000000" opacity="0.08" />

                  <rect x="0" y="${SMALL_PIXEL_SIZE}" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#000000" opacity="0.06" />
                  <rect x="${
                      SMALL_PIXEL_SIZE * 2
                  }" y="${SMALL_PIXEL_SIZE}" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.07" />
                  <rect x="${
                      SMALL_PIXEL_SIZE * 4
                  }" y="${SMALL_PIXEL_SIZE}" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.12" />

                  <rect x="${SMALL_PIXEL_SIZE}" y="${
            SMALL_PIXEL_SIZE * 2
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.12" />
                  <rect x="${SMALL_PIXEL_SIZE * 3}" y="${
            SMALL_PIXEL_SIZE * 2
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#000000" opacity="0.05" />
                  <rect x="${SMALL_PIXEL_SIZE * 5}" y="${
            SMALL_PIXEL_SIZE * 2
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.08" />

                  <rect x="0" y="${
                      SMALL_PIXEL_SIZE * 3
                  }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.06" />
                  <rect x="${SMALL_PIXEL_SIZE * 2}" y="${
            SMALL_PIXEL_SIZE * 3
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#000000" opacity="0.08" />
                  <rect x="${SMALL_PIXEL_SIZE * 4}" y="${
            SMALL_PIXEL_SIZE * 3
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.10" />

                  <rect x="${SMALL_PIXEL_SIZE}" y="${
            SMALL_PIXEL_SIZE * 4
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#000000" opacity="0.05" />
                  <rect x="${SMALL_PIXEL_SIZE * 3}" y="${
            SMALL_PIXEL_SIZE * 4
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.09" />
                  <rect x="${SMALL_PIXEL_SIZE * 5}" y="${
            SMALL_PIXEL_SIZE * 4
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#000000" opacity="0.07" />

                  <rect x="0" y="${
                      SMALL_PIXEL_SIZE * 5
                  }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.09" />
                  <rect x="${SMALL_PIXEL_SIZE * 2}" y="${
            SMALL_PIXEL_SIZE * 5
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#ffffff" opacity="0.07" />
                  <rect x="${SMALL_PIXEL_SIZE * 4}" y="${
            SMALL_PIXEL_SIZE * 5
        }" width="${SMALL_PIXEL_SIZE}" height="${SMALL_PIXEL_SIZE}" fill="#000000" opacity="0.06" />
                </pattern>

                <!-- Bigger offset pixels to break repetition -->
                <pattern id="px2" patternUnits="userSpaceOnUse" width="224" height="224" patternTransform="translate(12 18)">
                  <rect x="0" y="0" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#ffffff" opacity="0.08" />
                  <rect x="64" y="0" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#000000" opacity="0.06" />
                  <rect x="160" y="0" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#ffffff" opacity="0.07" />

                  <rect x="32" y="32" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#ffffff" opacity="0.10" />
                  <rect x="128" y="32" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#000000" opacity="0.05" />

                  <rect x="0" y="96" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#000000" opacity="0.06" />
                  <rect x="96" y="96" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#ffffff" opacity="0.12" />
                  <rect x="192" y="96" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#ffffff" opacity="0.07" />

                  <rect x="64" y="160" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#ffffff" opacity="0.08" />
                  <rect x="160" y="160" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#000000" opacity="0.07" />

                  <rect x="32" y="192" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#ffffff" opacity="0.09" />
                  <rect x="128" y="192" width="${LARGE_PIXEL_SIZE}" height="${LARGE_PIXEL_SIZE}" fill="#ffffff" opacity="0.06" />
                </pattern>
              </defs>

              <!-- White base -->
              <rect width="100%" height="100%" fill="#ffffff" />

              <!-- Gradients -->
              <rect width="100%" height="100%" fill="url(#grad1)" />
              <rect width="100%" height="100%" fill="url(#grad2)" style="mix-blend-mode:screen; opacity:0.85" />

              <!-- Top white fade -->
              <rect width="100%" height="100%" fill="url(#whiteTopGrad)" />

              <!-- Hard pixel overlay -->
              <g mask="url(#pixelMask)" shape-rendering="crispEdges">
                <rect width="100%" height="100%" fill="url(#px1)" style="mix-blend-mode:overlay; opacity:1" />
                <rect width="100%" height="100%" fill="url(#px2)" style="mix-blend-mode:multiply; opacity:0.45" />
              </g>
            </svg>
        `);

        const svgBlankImage = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>`;

        keepUnused(svgPixalatedImage);
        keepUnused(svgBlankImage);

        const backgroundImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPixalatedImage)}`;

        return { brandColorHex, brandColorLightHex, brandColorDarkHex, backgroundImage };
    }, [colorString]);
}
