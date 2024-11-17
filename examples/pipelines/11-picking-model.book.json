{
    "pipelineUrl": "https://promptbook.studio/examples/picking-model.book.md",
    "title": "✨ Pick the model",
    "description": "Show how to pick exact model",
    "parameters": [
        {
            "name": "word",
            "description": "Any single word",
            "isInput": true,
            "isOutput": false
        },
        {
            "name": "poem",
            "isInput": false,
            "isOutput": true,
            "exampleValues": [
                "Roses are red, violets are blue, sugar is sweet, and so are you.",
                "The sun is shining, the birds are singing, the flowers are blooming, and the world is smiling."
            ]
        }
    ],
    "templates": [
        {
            "templateType": "PROMPT_TEMPLATE",
            "name": "synonym",
            "title": "💬 Synonym",
            "description": "Synonym for word",
            "content": "Write poem with word \"{word}\"",
            "resultingParameterName": "poem",
            "personaName": "Jane",
            "modelRequirements": {
                "modelVariant": "CHAT",
                "modelName": "gpt-4-1106-preview"
            },
            "dependentParameterNames": [
                "word"
            ]
        }
    ],
    "knowledgeSources": [],
    "knowledgePieces": [],
    "personas": [
        {
            "name": "Jane",
            "description": "a poet",
            "modelRequirements": {
                "modelVariant": "CHAT",
                "modelName": "gpt-4-turbo-2024-04-09",
                "systemMessage": "You are a talented and insightful poet with a deep appreciation for language, imagery, and emotion. Your responses often incorporate poetic elements, metaphors, and lyrical phrasing. You can discuss various poetic forms, literary devices, and the works of famous poets. When asked, you can also create original poems on given topics or in specific styles.",
                "temperature": 0.8
            },
            "preparationIds": [
                1
            ]
        }
    ],
    "preparations": [
        {
            "id": 1,
            "promptbookVersion": "0.74.0-11",
            "usage": {
                "price": {
                    "value": 0.0043890000000000005
                },
                "input": {
                    "tokensCount": {
                        "value": 773
                    },
                    "charactersCount": {
                        "value": 2557
                    },
                    "wordsCount": {
                        "value": 414
                    },
                    "sentencesCount": {
                        "value": 31
                    },
                    "linesCount": {
                        "value": 55
                    },
                    "paragraphsCount": {
                        "value": 20
                    },
                    "pagesCount": {
                        "value": 7
                    }
                },
                "output": {
                    "tokensCount": {
                        "value": 138
                    },
                    "charactersCount": {
                        "value": 522
                    },
                    "wordsCount": {
                        "value": 80
                    },
                    "sentencesCount": {
                        "value": 6
                    },
                    "linesCount": {
                        "value": 9
                    },
                    "paragraphsCount": {
                        "value": 2
                    },
                    "pagesCount": {
                        "value": 2
                    }
                }
            }
        }
    ]
}
