'use client';

import { useEffect, useMemo } from 'react';
import { useAgentNaming } from './AgentNamingContext';
import { listLegacyAgentTextTranslationKeys } from './translateLegacyAgentText';

/**
 * Tags whose subtree should never be auto-translated because they contain code, editors, or raw user input.
 */
const SKIPPED_TAG_NAMES = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);

/**
 * CSS selectors for subtrees that should be ignored by the DOM translator.
 */
const SKIPPED_SUBTREE_SELECTOR =
    '.monaco-editor, [data-no-auto-translate="true"], [contenteditable="true"], input, select, option';

/**
 * Element attributes that may contain user-visible UI copy.
 */
const TRANSLATABLE_ATTRIBUTE_NAMES = ['title', 'placeholder', 'aria-label'] as const;

/**
 * Replaces the trimmed inner text while preserving original leading/trailing whitespace.
 *
 * @param source - Original text-node value.
 * @param replacement - Replacement text without surrounding whitespace.
 * @returns Updated text-node value.
 */
function replaceTrimmedText(source: string, replacement: string): string {
    const leadingWhitespace = source.match(/^\s*/)?.[0] ?? '';
    const trailingWhitespace = source.match(/\s*$/)?.[0] ?? '';
    return `${leadingWhitespace}${replacement}${trailingWhitespace}`;
}

/**
 * Checks whether a node belongs to a subtree that should stay untouched.
 *
 * @param node - Current DOM node.
 * @returns `true` when the node should be skipped.
 */
function shouldSkipNode(node: Node): boolean {
    const parentElement = node.parentElement;
    if (!parentElement) {
        return false;
    }

    if (parentElement.closest(SKIPPED_SUBTREE_SELECTOR)) {
        return true;
    }

    return SKIPPED_TAG_NAMES.has(parentElement.tagName);
}

/**
 * Auto-translates legacy hardcoded UI literals that still render directly into the DOM.
 *
 * This acts as a compatibility bridge for older admin pages until each screen is moved to the keyed
 * translation system.
 */
export function LegacyUiAutoTranslator() {
    const { formatText } = useAgentNaming();

    const translationMap = useMemo(() => {
        const entries = listLegacyAgentTextTranslationKeys()
            .map((sourceText) => [sourceText, formatText(sourceText)] as const)
            .filter(([sourceText, translatedText]) => sourceText !== translatedText);

        return new Map<string, string>(entries);
    }, [formatText]);

    useEffect(() => {
        if (typeof document === 'undefined' || translationMap.size === 0) {
            return;
        }

        /**
         * Translates one element's UI-facing attributes when the exact phrase is known.
         */
        function translateAttributes(element: Element): void {
            if (element.matches(SKIPPED_SUBTREE_SELECTOR) || SKIPPED_TAG_NAMES.has(element.tagName)) {
                return;
            }

            for (const attributeName of TRANSLATABLE_ATTRIBUTE_NAMES) {
                const attributeValue = element.getAttribute(attributeName);
                if (!attributeValue) {
                    continue;
                }

                const trimmedValue = attributeValue.trim();
                const translatedValue = translationMap.get(trimmedValue);
                if (!translatedValue || translatedValue === trimmedValue) {
                    continue;
                }

                element.setAttribute(attributeName, replaceTrimmedText(attributeValue, translatedValue));
            }
        }

        /**
         * Translates one subtree in place.
         */
        function translateSubtree(rootNode: Node): void {
            if (rootNode.nodeType === Node.TEXT_NODE) {
                const textNode = rootNode as Text;
                if (shouldSkipNode(textNode)) {
                    return;
                }

                const sourceText = textNode.nodeValue ?? '';
                const trimmedSourceText = sourceText.trim();
                const translatedText = translationMap.get(trimmedSourceText);
                if (!translatedText || translatedText === trimmedSourceText) {
                    return;
                }

                textNode.nodeValue = replaceTrimmedText(sourceText, translatedText);
                return;
            }

            if (rootNode.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            const element = rootNode as Element;
            if (element.matches(SKIPPED_SUBTREE_SELECTOR) || SKIPPED_TAG_NAMES.has(element.tagName)) {
                return;
            }

            translateAttributes(element);
            for (const childNode of Array.from(element.childNodes)) {
                translateSubtree(childNode);
            }
        }

        let animationFrameHandle = 0;

        /**
         * Schedules one subtree translation on the next animation frame so rapid DOM mutations coalesce.
         *
         * @param rootNode - Root node that should be re-processed.
         */
        const scheduleTranslation = (rootNode: Node) => {
            if (animationFrameHandle) {
                cancelAnimationFrame(animationFrameHandle);
            }

            animationFrameHandle = window.requestAnimationFrame(() => {
                translateSubtree(rootNode);
                animationFrameHandle = 0;
            });
        };

        scheduleTranslation(document.body);

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.target) {
                    scheduleTranslation(mutation.target);
                    continue;
                }

                for (const addedNode of Array.from(mutation.addedNodes)) {
                    scheduleTranslation(addedNode);
                }
            }
        });

        observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: [...TRANSLATABLE_ATTRIBUTE_NAMES],
        });

        return () => {
            if (animationFrameHandle) {
                cancelAnimationFrame(animationFrameHandle);
            }
            observer.disconnect();
        };
    }, [translationMap]);

    return null;
}
