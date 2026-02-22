# Generate Prompt Boilerplate Script

This script automatically creates several markdown files with prompts for vibecoding tools in the `/prompts` directory.

## Features

-   **Automatic numbering**: Scans existing files in both `/prompts` and `/prompts/done` directories to find the highest existing number and continues sequentially
-   **Sequential numbering**: Increments by 10 (e.g., 0110, 0120, 0130, 0140, 0150) to leave room for manual insertions
-   **Fresh emoji selection**: Uses the existing emoji utility system to find unused emojis across the entire codebase
-   **Date-based naming**: Uses current date in `YYYY-MM-XXXX-TITLE.md` format
-   **Placeholder titles**: Uses classic programming placeholder names (foo, bar, baz, qux, quux)

## Usage

### Via npm script (recommended):

```bash
npm run generate-prompt-boilerplate
```

### Direct execution:

```bash
npx ts-node scripts/generate-prompt-boilerplate/generate-prompt-boilerplate.ts --count 5
```

### Generate a custom number of files:

```bash
npx ts-node scripts/generate-prompt-boilerplate/generate-prompt-boilerplate.ts --count 100
```

### Select a template:

```bash
npx ts-node scripts/generate-prompt-boilerplate/generate-prompt-boilerplate.ts --template common
npx ts-node scripts/generate-prompt-boilerplate/generate-prompt-boilerplate.ts --template agents-server
```

### Combine options:

```bash
npx ts-node scripts/generate-prompt-boilerplate/generate-prompt-boilerplate.ts --count 100 --template agents-server
```

## Output

The script creates 5 files with the following pattern:

-   `2025-07-XXXX-foo.md` containing `[🎯]` (with unique emoji)
-   `2025-07-XXXX-bar.md` containing `[🎨]` (with unique emoji)
-   `2025-07-XXXX-baz.md` containing `[🚀]` (with unique emoji)
-   `2025-07-XXXX-qux.md` containing `[⭐]` (with unique emoji)
-   `2025-07-XXXX-quux.md` containing `[🔥]` (with unique emoji)

Where `XXXX` is the next available sequential number.

When using `--template agents-server`, generated filenames include the template prefix in slug part (for example: `2026-02-2210-agents-server-qux.md`).

## How it works

1. **Scans directories**: Looks through both `/prompts` and `/prompts/done` for existing files
2. **Finds highest number**: Extracts 4-digit numbers from filenames using regex pattern
3. **Emoji detection**: Scans entire codebase for used emojis in `[emoji]` format
4. **Fresh emoji selection**: Uses the difference between all available single-pictogram emojis and used ones
5. **Random selection**: Shuffles available emojis and selects 5 unique ones
6. **File creation**: Creates files with proper naming convention and emoji content

## Dependencies

-   Uses existing project utilities:
    -   `EMOJIS_OF_SINGLE_PICTOGRAM` from `src/utils/emojis.ts`
    -   `difference` from `src/utils/sets/difference.ts`
    -   `$shuffleItems` from `src/utils/shuffleItems.ts`
-   External dependencies: `glob-promise`, `chalk`, `dotenv`

## Integration

The script follows the same pattern as other project scripts like `find-fresh-emoji-tag` and integrates seamlessly with the existing codebase structure.
