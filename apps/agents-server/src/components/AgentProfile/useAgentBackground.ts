import { Color } from '../../../../../src/utils/color/Color';
import { darken } from '../../../../../src/utils/color/operators/darken';
import { lighten } from '../../../../../src/utils/color/operators/lighten';
import { useMemo } from 'react';
import spaceTrim from 'spacetrim';

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

        const svgContent = spaceTrim(`
            <svg xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1920 1080"
              width="1920" height="1080"
              preserveAspectRatio="xMidYMid slice">
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
                  <stop offset="100%" stop-color="#ffffff" stop-opacity="0.3" />
                </linearGradient>

                <!-- Strong grain -->
                <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence type="fractalNoise" baseFrequency="3.5" numOctaves="3" seed="8" result="noise" />
                  <feComponentTransfer>
                    <feFuncR type="linear" slope="3.5" intercept="-1.2" />
                    <feFuncG type="linear" slope="3.5" intercept="-1.2" />
                    <feFuncB type="linear" slope="3.5" intercept="-1.2" />
                    <feFuncA type="table" tableValues="0 0.8" />
                  </feComponentTransfer>
                </filter>
              </defs>

              <!-- White base -->
              <rect width="100%" height="100%" fill="#ffffff" />

              <!-- Gradients -->
              <rect width="100%" height="100%" fill="url(#grad1)" />
              <rect width="100%" height="100%" fill="url(#grad2)" style="mix-blend-mode:screen; opacity:0.85" />

              <!-- White fade on top -->
              <rect width="100%" height="100%" fill="url(#whiteTopGrad)" />

              <!-- Strong visible noise -->
              <rect width="100%" height="100%" filter="url(#grain)"
                style="mix-blend-mode:soft-light; opacity:1.2" />
            </svg>
        `);

        const backgroundImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

        return { brandColorHex, brandColorLightHex, brandColorDarkHex, backgroundImage };
    }, [colorString]);
}
