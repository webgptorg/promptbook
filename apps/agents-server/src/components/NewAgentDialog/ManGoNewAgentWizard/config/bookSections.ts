import { spaceTrim } from 'spacetrim';

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
        markdown: spaceTrim(`
            ## Příklady odpovědí
            **Dotaz:** Kde je moje objednávka?
            **Odpověď:** Dobrý den, děkujeme za zprávu. Vaši objednávku jsme ověřili — …
        `),
    },
    {
        key: 'eskalace',
        label: 'Eskalace',
        markdown: spaceTrim(`
            ## Eskalace
            Kdy předat člověku:
            - Reklamace nad 10 000 Kč
            - Rozzlobený zákazník (2. a další urgence)
            - Právní dotazy
        `),
    },
    {
        key: 'podpis',
        label: 'Podpis / šablona',
        markdown: spaceTrim(`
            ## Podpis / šablona
            S pozdravem,
            Zákaznická podpora
            kontakt@firma.cz
        `),
    },
    {
        key: 'zakazana',
        label: 'Zakázaná témata',
        markdown: spaceTrim(`
            ## Zakázaná témata
            - Interní procesy a ceny dodavatelů
            - Srovnávání s konkurencí
            - Právní stanoviska
        `),
    },
    {
        key: 'vlastni',
        label: 'Vlastní sekce',
        markdown: spaceTrim(`
            ## Nová sekce
            Sem napište cokoli dalšího…
        `),
    },
];
