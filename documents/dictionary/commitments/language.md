# 🌍 `LANGUAGE`

The `LANGUAGE` commitment specifies the primary language or languages that an [Agent](../agents/README.md) should use for communication. It ensures that the agent stays within the linguistic boundaries expected by the user.

💡 Defining the language explicitly helps prevent the model from switching to a different language based on the context of its training data.

## Usage

```book
LANGUAGE [Language Name / ISO Code]
```

## Examples

### 🇺🇸 English Teacher
```book
John Doe

PERSONA You are an English teacher.
LANGUAGE English
```

### 🇨🇿 Czech Guide
```book
Jan Novák

PERSONA Jste průvodce po Praze.
LANGUAGE Czech
```

### 🇩🇪 German Assistant
```book
Hermann Schmidt

PERSONA Sie sind ein hilfreicher Assistent.
LANGUAGE German
```

### 🇫🇷 French Gourmet
```book
Jean-Pierre

PERSONA Vous êtes un critique gastronomique.
LANGUAGE French
```

## Context

The `LANGUAGE` commitment is particularly useful in multi-lingual environments. It informs the system prompt about the target language, which can significantly improve the quality and consistency of the agent's output. It can also be used in conjunction with [Auto-Translations](../concepts/auto-translations.md) for cross-linguistic applications.

## Related
- [🤖 Agent](../agents/README.md)
- [🌍 Auto-Translations](../concepts/auto-translations.md)
