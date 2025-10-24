import styles from './BookEditor.module.css';

/**
 * Default font class name for the BookEditor component
 * In Next.js environments, you can override this by importing the font directly
 *
 * @public exported from `@promptbook/components`
 * @deprecated !!! Remove
 */
export const DEFAULT_BOOK_FONT_CLASS = styles.bookEditorSerif;
// <- Note: This results in something like `BookEditor-module_bookEditorSerif__QRS7g` in the production

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
