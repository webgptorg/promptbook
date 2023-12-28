import { extractMultiplicatedOccurrence } from './extractMultiplicatedOccurrence';

describe('how extractMultiplicatedOccurrence works', () => {
    it('extracts correct pattern', () => {
        expect(extractMultiplicatedOccurrence('hellohellohello')).toEqual('hello');
        expect(
            extractMultiplicatedOccurrence(
                'Шарна дошка негайно для використанняШарна дошка негайно для використання...Допоміжна дошка негайно для використання...Úplné výsledky se nepodařilo načístZkusit znovuOpakování…Opakování… ...(Upraveno)Obnovit originálSharna doshka nehayno dlya vykorystannyaZobrazit víceZobrazit méněШарна дошка негайно для використанняclearVymazat textZrušitOdeslatVáš příspěvek poslouží ke zlepšení kvality překladu a může být zobrazen dalším uživatelům (aniž by byla uvedena vaše totožnost). Další informacevolume_upHlasový výstup není v tomto prohlížeči podporovánNačítání…stopvolume_upPoslech výslovnosticontent_copyKopírovat překladOhodnoťte tento překladOhodnoťte tento překladJste s tímto překladem spokojeni?Dobrý překladŠpatný překladNavrhnout úpravuVaše zpětná vazba bude použita k vylepšení službyshareSdílet překladSdílení překladuE-mailTwitter',
            ),
        ).toEqual('Шарна дошка негайно для використання');
    });
});
