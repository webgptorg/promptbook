import { nameToUriPart } from './nameToUriPart';

export function nameToUriParts(name: string): string[] {
    return nameToUriPart(name)
        .split('-')
        .filter((value) => value !== '');
}
