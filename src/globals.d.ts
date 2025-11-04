// Note: [📍] Allow here to import `.book` files
declare module '*.book';
declare module '*.book.md';
declare module '*.bookc';

// Note: For the components
declare module '*.module.css';

declare module '*.svg' {
    export default string; // <- TODO: string_url_image
}

declare module '*.png' {
    export default string; // <- TODO: string_url_image
}

declare module '*.stl' {
    export default string; // <- TODO: string_url
}

/**
 * Note: When some module does not have types available, it is imported using `require`
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
