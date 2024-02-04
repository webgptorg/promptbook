import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from './just';
import { trimCodeBlock } from './trimCodeBlock';

describe('how trimCodeBlock works', () => {
    it('should preserve string without code block', () => {
        expect(
            trimCodeBlock(
                spaceTrim(`
                    Foo
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
                `),
            ),
        );
        expect(
            trimCodeBlock(
                spaceTrim(`
                    Hello:

                    "Bar"
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello:

                    "Bar"
                `),
            ),
        );
    });

    it('should preserve just block starting or ending', () => {
        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`markdown
                    Foo
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    \`\`\`markdown
                    Foo
                `),
            ),
        );

        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`
                    Foo
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    \`\`\`
                    Foo
                `),
            ),
        );

        expect(
            trimCodeBlock(
                spaceTrim(`
                    Foo
                    \`\`\`
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
                    \`\`\`
                `),
            ),
        );
    });

    it('should trim code block', () => {
        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`
                    Foo
                    \`\`\`
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
                `),
            ),
        );
        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`text
                    Foo
                    \`\`\`
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
                `),
            ),
        );

        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`markdown
                    "Bar"
                    \`\`\`
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    "Bar"
                `),
            ),
        );
    });

    it('should trim ending code block and some whitespace', () => {
        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`
                    Foo
                    \`\`\`
                `) + '\n\n ',
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
                `),
            ),
        );
    });

    it('will work on real-life example', () => {
        expect(
            trimCodeBlock(
                spaceTrim(`
                  \`\`\`html
                  <form is="order-form">
                      <label>
                          <p>Vaše jméno:</p>
                          <input name="name" placeholder="Jan Novák" type="text" required />
                      </label>
                      <label>
                          <p>Váš email:</p>
                          <input name="email" placeholder="jan.novak@seznam.cz" type="email" required />
                      </label>
                      <label>
                          <p>Telefonní číslo:</p>
                          <input name="phone" placeholder="+420123456789" type="tel" required />
                      </label>
                      <label>
                          <p>Adresa doručení:</p>
                          <input name="address" placeholder="Ulice, Město, PSČ" type="text" required />
                      </label>
                      <label>
                          <p>Produkt:</p>
                          <select name="product" required>
                              <option value="">Vyberte produkt</option>
                              <option value="1">Produkt 1</option>
                              <option value="2">Produkt 2</option>
                              <option value="3">Produkt 3</option>
                          </select>
                      </label>
                      <label>
                          <p>Množství:</p>
                          <input name="quantity" placeholder="1" type="number" required />
                      </label>
                      <label>
                          <p>Způsob platby:</p>
                          <select name="paymentMethod" required>
                              <option value="">Vyberte způsob platby</option>
                              <option value="creditCard">Kreditní karta</option>
                              <option value="bankTransfer">Bankovní převod</option>
                              <option value="cash">Hotovost při doručení</option>
                          </select>
                      </label>
                      <label>
                          <p>Poznámka:</p>
                          <textarea name="note" placeholder="Zde můžete uvést jakékoliv další informace nebo požadavky"></textarea>
                      </label>
                      <label><input type="submit" value="Odeslat objednávku" /></label>
                  </form>
                  \`\`\`

              `) + '\n\n ',
            ),
        ).toBe(
            just(
                spaceTrim(`
                  <form is="order-form">
                      <label>
                          <p>Vaše jméno:</p>
                          <input name="name" placeholder="Jan Novák" type="text" required />
                      </label>
                      <label>
                          <p>Váš email:</p>
                          <input name="email" placeholder="jan.novak@seznam.cz" type="email" required />
                      </label>
                      <label>
                          <p>Telefonní číslo:</p>
                          <input name="phone" placeholder="+420123456789" type="tel" required />
                      </label>
                      <label>
                          <p>Adresa doručení:</p>
                          <input name="address" placeholder="Ulice, Město, PSČ" type="text" required />
                      </label>
                      <label>
                          <p>Produkt:</p>
                          <select name="product" required>
                              <option value="">Vyberte produkt</option>
                              <option value="1">Produkt 1</option>
                              <option value="2">Produkt 2</option>
                              <option value="3">Produkt 3</option>
                          </select>
                      </label>
                      <label>
                          <p>Množství:</p>
                          <input name="quantity" placeholder="1" type="number" required />
                      </label>
                      <label>
                          <p>Způsob platby:</p>
                          <select name="paymentMethod" required>
                              <option value="">Vyberte způsob platby</option>
                              <option value="creditCard">Kreditní karta</option>
                              <option value="bankTransfer">Bankovní převod</option>
                              <option value="cash">Hotovost při doručení</option>
                          </select>
                      </label>
                      <label>
                          <p>Poznámka:</p>
                          <textarea name="note" placeholder="Zde můžete uvést jakékoliv další informace nebo požadavky"></textarea>
                      </label>
                      <label><input type="submit" value="Odeslat objednávku" /></label>
                  </form>
              `),
            ),
        );
    });
});
