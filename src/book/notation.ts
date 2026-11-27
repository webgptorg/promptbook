import { Book } from './book.js';

/**
 * Write an editable Book as an indented JavaScript or TypeScript template.
 * Only the literal determines its margin. A multiline substitution on its own
 * indented line keeps that indentation on each of its content lines.
 *
 * @public exported from `ptbk`
 */
export function book(strings: TemplateStringsArray, ...values: unknown[]): Book {
    if (strings.some((part) => part === undefined)) throw new SyntaxError('Invalid escape sequence in Book template.');

    // Treat each substitution as content when measuring the literal, even if its value is blank or multiline.
    const lines = strings.join('x').split('\n');
    let margin = Infinity;
    for (const [index, line] of lines.entries()) {
        const indent = /^[ \t]*(?=[^ \t\r\n])/.exec(line);
        if (!indent) continue;
        // A declaration right next to the opening backtick has no surrounding code indentation.
        if (index === 0 && indent[0] === '' && lines.length > 1) continue;
        margin = Math.min(margin, indent[0].length);
    }

    let source = '';
    for (const [index, part] of strings.entries()) {
        let literal = part.replace(/\n([ \t]*)/g, (_, spaces: string) => '\n' + spaces.slice(margin));
        if (index === 0) literal = literal.replace(/^[ \t]*/, (spaces) => spaces.slice(margin)).replace(/^(?:[ \t]*\r?\n)+/, '');
        if (index === values.length) literal = literal.replace(/(?:\r?\n[ \t]*)+$/, '');
        source += literal;
        if (index < values.length) {
            let value = String(values[index]);
            if (value.includes('\n')) {
                const line = source.slice(source.lastIndexOf('\n') + 1);
                if (/^[ \t]+$/.test(line)) value = value.replace(/\n(?=[^\r\n])/g, () => '\n' + line);
            }
            source += value;
        }
    }
    return Book.parse(source);
}
