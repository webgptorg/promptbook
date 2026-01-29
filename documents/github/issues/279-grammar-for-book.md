            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # Grammar for .book

            - Author: [jmikedupont2](https://github.com/jmikedupont2)
            - Created at: 7/22/2025, 8:57:46 AM
            - Updated at: 7/22/2025, 8:58:54 AM
            - Labels:
            - Issue: #279

            thanks deepwiki https://deepwiki.com/webgptorg/promptbook
            and  grok https://x.com/i/grok/share/gf3wr7b58LAfMQwhVTm2H5IJr

            ```
            BookFile ::= OptionalShebang (FlatBook | FullBook)
            OptionalShebang ::= '#!' ShebangLine '\n' | ε
            ShebangLine ::= [^\n]* 'ptbk' [^\n]*

            FlatBook ::= PromptContent
            FullBook ::= PipelineHead TaskSection+
            PipelineHead ::= (HeaderCommand | Comment | '\n')*
            TaskSection ::= TaskHeader TaskBody
            TaskHeader ::= '#' [^\n]+ '\n'
            TaskBody ::= (TaskCommand | PromptBlock | OutputAssignment | Comment | '\n')*

            HeaderCommand ::= '-' Whitespace+ HeaderCommandType CommandArgs '\n'
            TaskCommand ::= '-' Whitespace+ TaskCommandType CommandArgs '\n'
            HeaderCommandType ::= 'BOOK' | 'PTBK_VERSION' | 'PROMPTBOOK_VERSION' | 'URL'
            TaskCommandType ::= 'INPUT' | 'OUTPUT' | 'PARAMETER' | 'PERSONA' | 'KNOWLEDGE'
                              | 'INSTRUMENT' | 'ACTION' | 'EXPECT' | 'JOKER' | 'FORMFACTOR'
                              | 'PROMPT' | 'SIMPLE' | 'SCRIPT' | 'DIALOG' | TaskType 'SECTION'
            TaskType ::= 'PROMPT_TASK' | 'SIMPLE_TASK' | 'SCRIPT_TASK' | 'DIALOG_TASK'
            CommandArgs ::= (Word | Parameter | String)*

            PromptBlock ::= '>' PromptContent '\n'
            PromptContent ::= (Text | Parameter)*
            OutputAssignment ::= '→' Whitespace+ Parameter '\n'

            Parameter ::= '{' ParameterName '}'
            ParameterName ::= [a-zA-Z_][a-zA-Z0-9_]*

            BookVersionCommand ::= ('BOOK' | 'PTBK_VERSION' | 'PROMPTBOOK_VERSION') ('VERSION')? SemanticVersion
            ParameterCommand ::= ('INPUT' | 'OUTPUT') 'PARAMETER' Parameter
            PersonaCommand ::= 'PERSONA' [^\n]+
            KnowledgeCommand ::= 'KNOWLEDGE' (URL | FilePath | String)
            ExpectCommand ::= 'EXPECT' ('MIN' | 'MAX' | 'EXACTLY') Number ('Sentence' | 'Word' | 'Character' | 'Page')?
            JokerCommand ::= 'JOKER' Parameter

            Text ::= [^{}\n→]+
            Word ::= [a-zA-Z0-9_.-]+
            String ::= '"' [^"]* '"' | "'" [^']* "'"
            URL ::= 'https://' [a-zA-Z0-9./?=&-]+
            FilePath ::= './' [^\s]+ | [a-zA-Z]:[^\s]+
            SemanticVersion ::= [0-9]+ '.' [0-9]+ '.' [0-9]+
            Number ::= [0-9]+
            Whitespace ::= [ \t]+
            Comment ::= '<!--' [^-]* '-->' | '//' [^\n]*
            ```


            ## Comments

### Comment by jmikedupont2 on 7/22/2025, 8:58:54 AM

````📜 ::= 🐍? (📝 | 📚)
🐍 ::= '#!' [^\n]* 'ptbk' [^\n]* '\n' | ε

📝 ::= 💬
📚 ::= 📋 🛠️+
📋 ::= (📌 | 💭 | '\n')*
🛠️ ::= 🏷️ 🔧
🏷️ ::= '#' [^\n]+ '\n'
🔧 ::= (⚙️ | 💬 | ➡️ | 💭 | '\n')*

📌 ::= '-' ␣+ 📋🛠️ 📋📚 '\n'
⚙️ ::= '-' ␣+ 🛠️🛠️ 📋📚 '\n'
📋🛠️ ::= 'BOOK' | 'PTBK_VERSION' | 'PROMPTBOOK_VERSION' | '🌐'
🛠️🛠️ ::= '➡️' | '⬅️' | '🔧' | '😎' | '📚' | '🛠️' | '🎭' | '🃏' | '📏' | '💬' | '📜' | '📜💻' | '💬👥' | 🛠️📋 'SECTION'
🛠️📋 ::= '💬🛠️' | '📜🛠️' | '📜💻🛠️' | '💬👥🛠️'
📋📚 ::= (🔤 | 🔢 | 📜🔤)*

💬 ::= '>' 💬📚 '\n'
💬📚 ::= (📜📝 | 🔢)*
➡️ ::= '→' ␣+ 🔢 '\n'

🔢 ::= '{' 🔢📛 '}'
🔢📛 ::= [a-zA-Z_][a-zA-Z0-9_]*

📜🛠️ ::= ('BOOK' | 'PTBK_VERSION' | 'PROMPTBOOK_VERSION') ('VERSION')? 🔢📜
🔢🛠️ ::= ('➡️' | '⬅️') '🔧' 🔢
😎🛠️ ::= '😎' [^\n]+
📚🛠️ ::= '📚' (🌐 | 📂 | 📜🔤)
🎭🛠️ ::= '🎭' ('MIN' | 'MAX' | 'EXACTLY') 🔢 ('Sentence' | 'Word' | 'Character' | 'Page')?
🃏🛠️ ::= '🃏' 🔢

📜📝 ::= [^{}\n→]+
🔤 ::= [a-zA-Z0-9_.-]+
📜🔤 ::= '"' [^"]* '"' | "'" [^']* "'"
🌐 ::= 'https://' [a-zA-Z0-9./?=&-]+
📂 ::= './' [^\s]+ | [a-zA-Z]:[^\s]+
🔢📜 ::= \d+\.\d+\.\d+
␣ ::= [ \t]+
💭 ::= '<!--' [^-]* '-->' | '//' [^\n]*```
````
