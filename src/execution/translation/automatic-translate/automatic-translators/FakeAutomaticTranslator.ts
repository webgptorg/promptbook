import { IAutomaticTranslator } from './IAutomaticTranslator';

export class FakeAutomaticTranslator implements IAutomaticTranslator {
    public constructor() {}

    public translate(message: string): string {
        return message;
    }
}
