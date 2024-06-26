/**
 * Function isValidJsonString will tell you if the string is valid JSON or not
 */

export function isValidJsonString(value: string /* <-[👨‍⚖️] */): boolean {
    try {
        JSON.parse(value);
        return true;
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        if (error.message.includes('Unexpected token')) {
            return false;
        }

        return false;
    }
}
