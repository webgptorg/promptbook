            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 📋 Formats

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/23/2024, 11:04:59 PM
            - Updated at: 12/6/2024, 10:55:18 AM
            - Category: Ideas
            - Discussion: #36

            For each prompt template you can define the exact format you need.

            It's similar concept as [JSON mode from OpenAI](https://platform.openai.com/docs/guides/text-generation/json-mode) (its kinda super-JSON mode) but with 3 advantages:

            - You can expect more formats then JSON like XML, YAML, Markdown, HTML, ICal, Vcard... they are simply addable as plugins.
            - You can define schemas. **Never again will it happen that you expect a list of strings with emails and LLM "creatively" creates its own structure.**
            - You can still use [count expectations](https://github.com/webgptorg/promptbook/discussions/30) which will intelligently count only the data part, not the structure part.

            ## Simple syntax

            ```markdown
            - EXPECT JSON
            ```

            ```markdown
            - EXPECT XML
            ```

            ## Format + [count expectations](https://github.com/webgptorg/promptbook/discussions/30)

            You can combine format and count - it will only take and count the data part, not the structure part:

            ```markdown
            - EXPECT JSON
            - EXPECT MIN 2 WORDS
            - EXPECT MAX 3 WORDS
            ```

            This will NOT pass:

            ```json
            {
                "firstName": "John Smith",
                "lastName": "Peter Green"
            }
            ```

            This will pass:

            ```json
            {
                "firstName": "John",
                "lastName": "Smith"
            }
            ```


            ## Format + schema

            ```markdown
            - EXPECT JSON https://promptbook.studio/sample/schemas/contacts.schema.json
            ```


            ## Partial check

            If there are any tokens you have that cannot result in a valid format (even healed). The partial result is discarded and one token is returned.

            See more in discussion about [🔙 Expectation-aware generation](https://github.com/webgptorg/promptbook/discussions/37).


            ## Healing

            When there is obvious how to make format valid from invalid, it is done without rerunning LLM.

            This invalid JSON:

            ```json
            {
                "firstName": "John",
                "lastName": "Smith",
            }
            ```

            Will be healed:

            ```json
            {
                "firstName": "John",
                "lastName": "Smith"
            }
            ```

            ## FormatDefinition

            Each format is defined by a format definition.


            ```typescript

            /**
             * A format definition is a set of functions that define how to validate, heal and convert response from LLM
             */
            export type FormatDefinition<TValue extends TPartialValue, TPartialValue extends string, TSchema extends object> = {
                /**
                 * The name of the format used in .ptbk.md files
                 *
                 * @sample "JSON"
                 */
                readonly name: string_name;

                /**
                 * Aliases for the name
                 */
                readonly aliases?: Array<string_name>;

                /**
                 * The mime type of the format (if any)
                 *
                 * @sample "application/json"
                 */
                readonly mimeType?: string_mime_type;

                /**
                 * Check if a value is fully valid
                 *
                 * @param value The value to check, for example "{\"foo\": true}"
                 * @param schema Optional schema to do extra validation
                 */
                isValid(value: string, schema?: TSchema): value is TValue;

                /**
                 * Check if a first part of a value is valid
                 *
                 * @see https://github.com/webgptorg/promptbook/discussions/37
                 *
                 * @param partialValue Partial value to check, for example "{\"foo\": t"
                 * @param schema Optional schema to do extra validation
                 */
                canBeValid(partialValue: string, schema?: TSchema): partialValue is TPartialValue;

                /**
                 * Heal a value to make it valid if possible
                 *
                 * Note: This make sense in context of LLMs that often returns slightly invalid values
                 * @see https://github.com/webgptorg/promptbook/discussions/31
                 *
                 * @param value The value to heal, for example "{foo: true}"
                 * @param scheme
                 * @throws {Error} If the value cannot be healed
                 */
                heal(value: string, scheme?: TSchema): TValue;

                /**
                 * Parses just the values and removes structural information
                 *
                 * Note: This is useful when you want to combine format expectations with counting words, characters,...
                 *
                 * @param value The value to check, for example "{\"name\": "John Smith"}"
                 * @param schema Optional schema
                 * @example "{\"name\": "John Smith"}" -> ["John Smith"]
                 */
                extractValues(value: string, schema?: TSchema): Array<string>;
            }
            ```


            For all code samples [look here](https://github.com/webgptorg/promptbook/tree/main/src/formats).

            ## Comments

### Comment by hejny on 9/20/2024, 2:18:16 PM

See OpenAI`s [Structured Outputs vs JSON mode](https://platform.openai.com/docs/guides/structured-outputs/structured-outputs-vs-json-mode)

---

### Comment by hejny on 9/26/2024, 5:40:53 PM

TODO: Update FormatDefinition section

---

### Comment by BleedingDev on 12/6/2024, 10:55:18 AM

What formats are currently supported?

YAML? XML?
