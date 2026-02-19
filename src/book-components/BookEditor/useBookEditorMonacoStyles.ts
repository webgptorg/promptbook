import { useEffect } from 'react';
import { PROMPTBOOK_SYNTAX_COLORS } from '../../config';

/**
 * Relative Y offset multiplier for aligning line background with Monaco rendering.
 *
 * @private function of BookEditorMonaco
 */
const BACKGROUND_POSITION_Y_MULTIPLIER = -0.1;

type UseBookEditorMonacoStylesProps = {
    readonly instanceClass: string;
    readonly scaledLineHeight: number;
    readonly scaledContentPaddingLeft: number;
    readonly scaledVerticalLineLeft: number;
    readonly zoomLevel: number;
};

/**
 * Injects notebook-inspired styling that is unique per `BookEditorMonaco` instance.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoStyles({
    instanceClass,
    scaledLineHeight,
    scaledContentPaddingLeft,
    scaledVerticalLineLeft,
    zoomLevel,
}: UseBookEditorMonacoStylesProps) {
    useEffect(() => {
        const styleId = `notebook-margin-line-style-${instanceClass}`;

        let style = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.innerHTML = `

            @import url('https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
            /* <- [🚚] */

            .${instanceClass} .monaco-editor .view-lines {
                background-image: linear-gradient(to bottom, transparent ${
                    scaledLineHeight - 1
                }px, ${PROMPTBOOK_SYNTAX_COLORS.LINE.toHex()} ${scaledLineHeight - 1}px);
                background-size: calc(100% + ${scaledContentPaddingLeft}px) ${scaledLineHeight}px;
                background-position-x: -${scaledContentPaddingLeft}px;
                background-position-y: ${scaledLineHeight * BACKGROUND_POSITION_Y_MULTIPLIER}px;
            }
            .${instanceClass} .monaco-editor .overflow-guard::before {
                content: '';
                position: absolute;
                left: ${scaledVerticalLineLeft}px;
                top: 0;
                bottom: 0;
                width: 1px;
                background-color: ${PROMPTBOOK_SYNTAX_COLORS.LINE.toHex()};
                z-index: 10;
            }

            .${instanceClass} .monaco-editor .separator-line {
                background: linear-gradient(
                    to bottom, 
                    transparent ${scaledLineHeight * 0.9 - 2}px, 
                    ${PROMPTBOOK_SYNTAX_COLORS.SEPARATOR.toHex()} ${scaledLineHeight * 0.9 - 2}px, 
                    ${PROMPTBOOK_SYNTAX_COLORS.SEPARATOR.toHex()} ${scaledLineHeight * 0.9 + 1}px, 
                    transparent ${scaledLineHeight * 0.9 + 1}px
                );
            }
            
            .${instanceClass} .monaco-editor .transparent-text {
                color: transparent !important;
            }
            
            .${instanceClass} .monaco-editor .code-block-box {
                background-color: #f5f5f566;
                border-left: 1px solid ${PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex()};
                border-right: 1px solid ${PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex()};
                padding-left: ${Math.round(8 * zoomLevel)}px;
                padding-right: ${Math.round(8 * zoomLevel)}px;
            }
            
            .${instanceClass} .monaco-editor .code-block-top {
                border-top: 1px solid ${PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex()};
                border-top-left-radius: ${Math.round(10 * zoomLevel)}px;
                border-top-right-radius: ${Math.round(10 * zoomLevel)}px;
                overflow: hidden;
            }
            
            .${instanceClass} .monaco-editor .code-block-bottom {
                border-bottom: 1px solid ${PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex()};
                border-bottom-left-radius: ${Math.round(10 * zoomLevel)}px;
                border-bottom-right-radius: ${Math.round(10 * zoomLevel)}px;
                overflow: hidden;
            }
        `;

        return () => {
            // Style intentionally persists to avoid flash of unstyled content when using fast refresh.
        };
    }, [instanceClass, scaledLineHeight, scaledContentPaddingLeft, scaledVerticalLineLeft, zoomLevel]);
}
