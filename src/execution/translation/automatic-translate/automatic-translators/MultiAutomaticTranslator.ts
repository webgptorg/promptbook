import { Promisable } from 'type-fest';
import { IAutomaticTranslator } from './IAutomaticTranslator';

interface IMultiAutomaticTranslatorOptions {
    createAutomaticTranslator(options: { from: string; to: string }): IAutomaticTranslator;
}

export class MultiAutomaticTranslator {
    private translators: Record<string, IAutomaticTranslator> = {};

    constructor(private readonly options: IMultiAutomaticTranslatorOptions) {}

    public translate({ from, to, message }: { from: string; to: string; message: string }): Promisable<string> {
        if (from === to) {
            return message;
        }

        const key = `${from}-${to}`;
        if (!this.translators[key]) {
            this.translators[key] = this.options.createAutomaticTranslator({ from, to });
        }

        return this.translators[key].translate(message);
    }
}

/**
 * TODO: Implement IDestroyable
 */
