import { spaceTrim } from 'spacetrim';

/**
 * Predefined Book-language sections offered as "Přidat sekci" chips in the editor.
 * Mirrors the wireframe's section presets; users insert and then freely edit them.
 */
export type BookSectionPreset = {
    readonly key: string;
    readonly label: string;
    readonly book: string;
};

/**
 * Book-language section presets shown below the manGo Book editor.
 *
 * @private internal constant of <ManGoBookEditor/>
 */
export const BOOK_SECTION_PRESETS: readonly BookSectionPreset[] = [
    {
        key: 'priklady',
        label: 'Příklady odpovědí',
        book: spaceTrim(`
            WRITING SAMPLE
            Uživatel: Kde je moje objednávka?
            Agent: Dobrý den, děkujeme za zprávu. Vaši objednávku jsme ověřili — …
        `),
    },
    {
        key: 'eskalace',
        label: 'Eskalace',
        book: spaceTrim(`
            RULE
            Požadavek předejte člověku, pokud jde o:
            - Reklamace nad 10 000 Kč
            - Rozzlobený zákazník (2. a další urgence)
            - Právní dotazy
        `),
    },
    {
        key: 'podpis',
        label: 'Podpis / šablona',
        book: spaceTrim(`
            MESSAGE SUFFIX
            S pozdravem,
            Zákaznická podpora
            kontakt@firma.cz
        `),
    },
    {
        key: 'zakazana',
        label: 'Zakázaná témata',
        book: spaceTrim(`
            RULE
            Nikdy neposkytujte ani nerozebírejte:
            - Interní procesy a ceny dodavatelů
            - Srovnávání s konkurencí
            - Právní stanoviska
        `),
    },
    {
        key: 'vlastni',
        label: 'Vlastní sekce',
        book: spaceTrim(`
            NOTE
            Vlastní sekce:
            Sem napište cokoli dalšího…
        `),
    },
];
