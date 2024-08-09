declare const _default: ({
    title: string;
    pipelineUrl: string;
    promptbookVersion: string;
    parameters: {
        name: string;
        description: string;
        isInput: boolean;
        isOutput: boolean;
    }[];
    promptTemplates: {
        blockType: string;
        name: string;
        title: string;
        modelRequirements: {
            modelVariant: string;
            modelName: string;
        };
        content: string;
        dependentParameterNames: string[];
        resultingParameterName: string;
    }[];
    knowledgeSources: never[];
    knowledgePieces: never[];
    personas: never[];
    preparations: {
        id: number;
        promptbookVersion: string;
        usage: {
            price: {
                value: number;
            };
            input: {
                tokensCount: {
                    value: number;
                };
                charactersCount: {
                    value: number;
                };
                wordsCount: {
                    value: number;
                };
                sentencesCount: {
                    value: number;
                };
                linesCount: {
                    value: number;
                };
                paragraphsCount: {
                    value: number;
                };
                pagesCount: {
                    value: number;
                };
            };
            output: {
                tokensCount: {
                    value: number;
                };
                charactersCount: {
                    value: number;
                };
                wordsCount: {
                    value: number;
                };
                sentencesCount: {
                    value: number;
                };
                linesCount: {
                    value: number;
                };
                paragraphsCount: {
                    value: number;
                };
                pagesCount: {
                    value: number;
                };
            };
        };
    }[];
    sourceFile: string;
} | {
    title: string;
    pipelineUrl: string;
    promptbookVersion: string;
    parameters: {
        name: string;
        description: string;
        isInput: boolean;
        isOutput: boolean;
    }[];
    promptTemplates: {
        blockType: string;
        name: string;
        title: string;
        modelRequirements: {
            modelVariant: string;
            modelName: string;
        };
        content: string;
        expectations: {
            words: {
                min: number;
                max: number;
            };
        };
        dependentParameterNames: string[];
        resultingParameterName: string;
    }[];
    knowledgeSources: never[];
    knowledgePieces: never[];
    personas: never[];
    preparations: {
        id: number;
        promptbookVersion: string;
        usage: {
            price: {
                value: number;
            };
            input: {
                tokensCount: {
                    value: number;
                };
                charactersCount: {
                    value: number;
                };
                wordsCount: {
                    value: number;
                };
                sentencesCount: {
                    value: number;
                };
                linesCount: {
                    value: number;
                };
                paragraphsCount: {
                    value: number;
                };
                pagesCount: {
                    value: number;
                };
            };
            output: {
                tokensCount: {
                    value: number;
                };
                charactersCount: {
                    value: number;
                };
                wordsCount: {
                    value: number;
                };
                sentencesCount: {
                    value: number;
                };
                linesCount: {
                    value: number;
                };
                paragraphsCount: {
                    value: number;
                };
                pagesCount: {
                    value: number;
                };
            };
        };
    }[];
    sourceFile: string;
} | {
    title: string;
    pipelineUrl: string;
    promptbookVersion: string;
    parameters: {
        name: string;
        description: string;
        isInput: boolean;
        isOutput: boolean;
    }[];
    promptTemplates: {
        blockType: string;
        name: string;
        title: string;
        modelRequirements: {
            modelVariant: string;
            modelName: string;
        };
        content: string;
        expectFormat: string;
        dependentParameterNames: string[];
        resultingParameterName: string;
    }[];
    knowledgeSources: never[];
    knowledgePieces: never[];
    personas: never[];
    preparations: {
        id: number;
        promptbookVersion: string;
        usage: {
            price: {
                value: number;
            };
            input: {
                tokensCount: {
                    value: number;
                };
                charactersCount: {
                    value: number;
                };
                wordsCount: {
                    value: number;
                };
                sentencesCount: {
                    value: number;
                };
                linesCount: {
                    value: number;
                };
                paragraphsCount: {
                    value: number;
                };
                pagesCount: {
                    value: number;
                };
            };
            output: {
                tokensCount: {
                    value: number;
                };
                charactersCount: {
                    value: number;
                };
                wordsCount: {
                    value: number;
                };
                sentencesCount: {
                    value: number;
                };
                linesCount: {
                    value: number;
                };
                paragraphsCount: {
                    value: number;
                };
                pagesCount: {
                    value: number;
                };
            };
        };
    }[];
    sourceFile: string;
})[];
export default _default;
