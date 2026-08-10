'use client';

import { useEffect, useState, type RefObject } from 'react';
import { LIVE_DEMO_MAX_TERMINAL_COLUMN_COUNT, LIVE_DEMO_MIN_TERMINAL_COLUMN_COUNT } from '@/data/liveDemoScript';

/**
 * Terminal text size the live terminal aims for, in CSS pixels.
 */
const PREFERRED_TERMINAL_FONT_SIZE_PX = 10;

/**
 * Height of one terminal row relative to the terminal text size.
 */
const TERMINAL_LINE_HEIGHT_RATIO = 1.25;

/**
 * Width of one monospace character relative to its font size, used until the real terminal font is measured.
 */
const FALLBACK_TERMINAL_CHARACTER_WIDTH_RATIO = 0.6;

/**
 * Character repeated to measure the width of one terminal character cell.
 */
const MEASURED_TERMINAL_CHARACTER = '0';

/**
 * How many characters are measured at once to derive the width of one terminal character cell.
 */
const MEASURED_TERMINAL_CHARACTER_COUNT = 64;

/**
 * Font size used while measuring the width of one terminal character cell, in CSS pixels.
 */
const MEASURED_TERMINAL_FONT_SIZE_PX = 100;

/**
 * Smallest letter spacing which is still worth correcting, relative to the terminal text size.
 */
const MINIMAL_TERMINAL_LETTER_SPACING_EM = 0.0005;

/**
 * Geometry of one terminal fitted into the width available to it.
 */
export type FittedTerminalMetrics = {
    /**
     * Width of the terminal in character cells.
     */
    readonly columnCount: number;

    /**
     * Terminal text size, in CSS pixels.
     */
    readonly fontSizePx: number;

    /**
     * Height of one terminal row, in CSS pixels.
     */
    readonly lineHeightPx: number;

    /**
     * Width of one character cell relative to the terminal text size.
     */
    readonly characterCellWidthRatio: number;

    /**
     * Real width of the measured characters relative to the terminal text size.
     */
    readonly characterWidthRatios: ReadonlyMap<string, number>;
};

/**
 * Terminal geometry used until the terminal is measured in the browser, so a server-rendered terminal
 * already reserves nearly the same space as the measured one.
 */
export const DEFAULT_FITTED_TERMINAL_METRICS: FittedTerminalMetrics = {
    columnCount: LIVE_DEMO_MAX_TERMINAL_COLUMN_COUNT,
    fontSizePx: PREFERRED_TERMINAL_FONT_SIZE_PX,
    lineHeightPx: PREFERRED_TERMINAL_FONT_SIZE_PX * TERMINAL_LINE_HEIGHT_RATIO,
    characterCellWidthRatio: FALLBACK_TERMINAL_CHARACTER_WIDTH_RATIO,
    characterWidthRatios: new Map(),
};

/**
 * Fits a terminal into the width of one element, the same way a terminal emulator fits its character grid
 * into the window: as many character cells as fit at the preferred text size, and a smaller text size when
 * even the narrowest supported terminal would not fit.
 *
 * Because the resulting grid never exceeds the measured width, the terminal never scrolls horizontally.
 *
 * @param terminalContentRef Element which spans the width available to the terminal content.
 * @param measuredCharacters Characters whose real width is measured because the terminal font may not provide them.
 * @returns Fitted terminal geometry, before the first measurement the default one.
 */
export function useFittedTerminalMetrics(
    terminalContentRef: RefObject<HTMLElement | null>,
    measuredCharacters: ReadonlyArray<string>,
): FittedTerminalMetrics {
    const [terminalMetrics, setTerminalMetrics] = useState<FittedTerminalMetrics>(DEFAULT_FITTED_TERMINAL_METRICS);

    useEffect(() => {
        const terminalContentElement = terminalContentRef.current;

        if (terminalContentElement === null) {
            return;
        }

        let isCancelled = false;

        const updateTerminalMetrics = () => {
            const measuredTerminalMetrics = measureFittedTerminalMetrics(terminalContentElement, measuredCharacters);

            setTerminalMetrics((previousTerminalMetrics) =>
                areFittedTerminalMetricsEqual(previousTerminalMetrics, measuredTerminalMetrics)
                    ? previousTerminalMetrics
                    : measuredTerminalMetrics,
            );
        };

        updateTerminalMetrics();

        const resizeObserver = new ResizeObserver(updateTerminalMetrics);
        resizeObserver.observe(terminalContentElement);

        // Note: The terminal font is a web font, so the character cell is measured again once the real font is used
        document.fonts.ready.then(() => {
            if (!isCancelled) {
                updateTerminalMetrics();
            }
        });

        return () => {
            isCancelled = true;
            resizeObserver.disconnect();
        };
    }, [terminalContentRef, measuredCharacters]);

    return terminalMetrics;
}

/**
 * Resolves the letter spacing which makes one terminal text occupy exactly the character cells it is counted as.
 *
 * A character which the terminal font does not provide is drawn from a fallback font in a different width, which
 * would push everything after it out of the character grid - most visibly the right border of the dashboard boxes.
 * Spreading the difference over the characters of the text pulls the text back onto the grid, and the drawing
 * characters of one border keep meeting each other because they are drawn in their natural width.
 *
 * @param text Text rendered as one terminal run.
 * @param terminalMetrics Measured geometry of the terminal the text is rendered in.
 * @returns CSS letter spacing, or `undefined` when the text already fits its character cells.
 */
export function resolveTerminalTextLetterSpacing(
    text: string,
    terminalMetrics: FittedTerminalMetrics,
): string | undefined {
    let naturalWidthRatio = 0;
    let characterCount = 0;

    for (const character of text) {
        naturalWidthRatio +=
            terminalMetrics.characterWidthRatios.get(character) || terminalMetrics.characterCellWidthRatio;
        characterCount++;
    }

    if (characterCount === 0) {
        return undefined;
    }

    // Note: Cells are counted the same way as when the sample was padded to its frame width
    const occupiedCellsWidthRatio = text.length * terminalMetrics.characterCellWidthRatio;
    const letterSpacingEm = (occupiedCellsWidthRatio - naturalWidthRatio) / characterCount;

    if (Math.abs(letterSpacingEm) < MINIMAL_TERMINAL_LETTER_SPACING_EM) {
        return undefined;
    }

    return `${letterSpacingEm}em`;
}

/**
 * Measures the terminal geometry which fits into the width of one element.
 */
function measureFittedTerminalMetrics(
    terminalContentElement: HTMLElement,
    measuredCharacters: ReadonlyArray<string>,
): FittedTerminalMetrics {
    const availableWidthPx = terminalContentElement.getBoundingClientRect().width;
    const measuringElement = createTerminalMeasuringElement(terminalContentElement);
    const characterCellWidthRatio = measureTerminalCharacterWidthRatio(measuringElement, MEASURED_TERMINAL_CHARACTER);
    const characterWidthRatios = new Map(
        measuredCharacters.map((measuredCharacter) => [
            measuredCharacter,
            measureTerminalCharacterWidthRatio(measuringElement, measuredCharacter),
        ]),
    );

    measuringElement.remove();

    const columnCount =
        availableWidthPx <= 0
            ? LIVE_DEMO_MAX_TERMINAL_COLUMN_COUNT
            : Math.min(
                  LIVE_DEMO_MAX_TERMINAL_COLUMN_COUNT,
                  Math.max(
                      LIVE_DEMO_MIN_TERMINAL_COLUMN_COUNT,
                      Math.floor(availableWidthPx / (PREFERRED_TERMINAL_FONT_SIZE_PX * characterCellWidthRatio)),
                  ),
              );
    const fontSizePx =
        availableWidthPx <= 0
            ? PREFERRED_TERMINAL_FONT_SIZE_PX
            : Math.min(
                  PREFERRED_TERMINAL_FONT_SIZE_PX,
                  availableWidthPx / (columnCount * characterCellWidthRatio),
              );

    // Note: The text size is rounded down so that rounding can never widen the grid beyond the measured width
    const roundedFontSizePx = Math.floor(fontSizePx * 100) / 100;

    return {
        columnCount,
        fontSizePx: roundedFontSizePx,
        lineHeightPx: roundedFontSizePx * TERMINAL_LINE_HEIGHT_RATIO,
        characterCellWidthRatio,
        characterWidthRatios,
    };
}

/**
 * Creates the hidden element which measures terminal characters in the font of one terminal.
 */
function createTerminalMeasuringElement(terminalContentElement: HTMLElement): HTMLElement {
    const measuringElement = document.createElement('span');

    measuringElement.setAttribute('aria-hidden', 'true');
    measuringElement.style.position = 'absolute';
    measuringElement.style.visibility = 'hidden';
    measuringElement.style.whiteSpace = 'pre';
    measuringElement.style.letterSpacing = 'normal';
    measuringElement.style.fontSize = `${MEASURED_TERMINAL_FONT_SIZE_PX}px`;
    terminalContentElement.appendChild(measuringElement);

    return measuringElement;
}

/**
 * Measures the width of one character relative to the font size it is rendered in.
 */
function measureTerminalCharacterWidthRatio(measuringElement: HTMLElement, character: string): number {
    measuringElement.textContent = character.repeat(MEASURED_TERMINAL_CHARACTER_COUNT);

    const measuredWidthPx = measuringElement.getBoundingClientRect().width;

    if (measuredWidthPx <= 0) {
        return FALLBACK_TERMINAL_CHARACTER_WIDTH_RATIO;
    }

    return measuredWidthPx / (MEASURED_TERMINAL_CHARACTER_COUNT * MEASURED_TERMINAL_FONT_SIZE_PX);
}

/**
 * Determines whether two measurements describe the same terminal geometry.
 */
function areFittedTerminalMetricsEqual(
    terminalMetrics: FittedTerminalMetrics,
    otherTerminalMetrics: FittedTerminalMetrics,
): boolean {
    return (
        terminalMetrics.columnCount === otherTerminalMetrics.columnCount &&
        terminalMetrics.fontSizePx === otherTerminalMetrics.fontSizePx &&
        terminalMetrics.characterCellWidthRatio === otherTerminalMetrics.characterCellWidthRatio &&
        areCharacterWidthRatiosEqual(terminalMetrics.characterWidthRatios, otherTerminalMetrics.characterWidthRatios)
    );
}

/**
 * Determines whether two measurements found the same character widths.
 */
function areCharacterWidthRatiosEqual(
    characterWidthRatios: ReadonlyMap<string, number>,
    otherCharacterWidthRatios: ReadonlyMap<string, number>,
): boolean {
    if (characterWidthRatios.size !== otherCharacterWidthRatios.size) {
        return false;
    }

    for (const [character, characterWidthRatio] of characterWidthRatios) {
        if (otherCharacterWidthRatios.get(character) !== characterWidthRatio) {
            return false;
        }
    }

    return true;
}
