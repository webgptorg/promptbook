import { readdirSync, statSync } from 'fs';
import { join } from 'path';

type Page = {
    path: string;
    title: string;
    description: string;
};

/**
 * Dynamically discovers all pages in the app directory
 * Converts directory names to human-readable titles
 */
export function getPages(): Page[] {
    const appDir = join(process.cwd(), 'src', 'app');
    const entries = readdirSync(appDir);

    const pages: Page[] = [];

    for (const entry of entries) {
        const fullPath = join(appDir, entry);

        // Check if it's a directory and contains a page.tsx
        if (statSync(fullPath).isDirectory()) {
            const pageFile = join(fullPath, 'page.tsx');
            try {
                statSync(pageFile);
                // Directory has a page.tsx file
                pages.push({
                    path: `/${entry}`,
                    title: formatTitle(entry),
                    description: `${formatTitle(entry)} demo`,
                });
            } catch {
                // No page.tsx in this directory, skip it
            }
        }
    }

    return pages.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Converts kebab-case or snake_case directory names to Title Case
 * Examples:
 * - "book-to-openai" -> "Book to OpenAI"
 * - "independent-editors" -> "Independent Editors"
 * - "self-learning-book" -> "Self Learning Book"
 */
function formatTitle(dirName: string): string {
    return dirName
        .split(/[-_]/)
        .map((word) => {
            // Special case for acronyms
            if (word.toLowerCase() === 'openai') return 'OpenAI';
            if (word.toLowerCase() === 'ai') return 'AI';

            // Capitalize first letter
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}
