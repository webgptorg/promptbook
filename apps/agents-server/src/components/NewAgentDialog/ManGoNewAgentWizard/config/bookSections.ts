/**
 * Predefined markdown sections offered as "Přidat sekci" chips in the book editor.
 * Mirrors the wireframe's section presets; users append and then freely edit them.
 */
export type BookSectionPreset = {
    readonly key: string;
    readonly label: string;
    readonly markdown: string;
};

export const BOOK_SECTION_PRESETS: readonly BookSectionPreset[] = [
    {
        key: 'priklady',
        label: 'Příklady odpovědí',
        markdown:
            '## Příklady odpovědí\n' +
            '**Dotaz:** Kde je moje objednávka?\n' +
            '**Odpověď:** Dobrý den, děkujeme za zprávu. Vaši objednávku jsme ověřili — …',
    },
    {
        key: 'eskalace',
        label: 'Eskalace',
        markdown:
            '## Eskalace\n' +
            'Kdy předat člověku:\n' +
            '- Reklamace nad 10 000 Kč\n' +
            '- Rozzlobený zákazník (2. a další urgence)\n' +
            '- Právní dotazy',
    },
    {
        key: 'podpis',
        label: 'Podpis / šablona',
        markdown: '## Podpis / šablona\nS pozdravem,\nZákaznická podpora\nkontakt@firma.cz',
    },
    {
        key: 'zakazana',
        label: 'Zakázaná témata',
        markdown:
            '## Zakázaná témata\n' +
            '- Interní procesy a ceny dodavatelů\n' +
            '- Srovnávání s konkurencí\n' +
            '- Právní stanoviska',
    },
    {
        key: 'vlastni',
        label: 'Vlastní sekce',
        markdown: '## Nová sekce\nSem napište cokoli dalšího…',
    },
];
