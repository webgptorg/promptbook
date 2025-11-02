import { JSX } from 'react';
import iconAsset from './ExitFullscreenIcon.svg';
// <- TODO: !!! Is this type of SVG import working correctly?
// <- TODO: !!! Try also the png import if SVG works
/**
 * Renders an icon that represents the exit fullscreen action
 *
 * @private
 */
export function ExitFullscreenIcon(): JSX.Element {
    console.log('!!!', { iconAsset });
    return <img src={iconAsset.src} alt="Exit Fullscreen Icon" width={20} height={20} />;
    // <- Set the size as needed

    /*
    return (
        <svg
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            version="1.1"
            id="svg4"
            // inkscape:version="1.3.2 (091e20e, 2023-11-25, custom)"
            xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
            xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:svg="http://www.w3.org/2000/svg"
        >
            <defs id="defs4" />

            <path
                d="M14 10L20 4M14 10H18M14 10V6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                id="path1"
                // style="stroke-linejoin:bevel;stroke-linecap:round"
            />
            <path
                d="M10 14L4 20M10 14H6M10 14V18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                id="path2"
                style="stroke-linejoin:bevel;stroke-linecap:round"
            />
            <path
                d="m 9.8535534,10 -6,-6 m 6,6 V 6 m 0,4 h -4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                id="path3"
                style="stroke-linejoin:bevel;stroke-linecap:round"
            />
            <path
                d="m 14.146447,14 6,6 m -6,-6 v 4 m 0,-4 h 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                id="path4"
                style="stroke-linejoin:bevel;stroke-linecap:round"
            />
        </svg>
    );
    */
}
