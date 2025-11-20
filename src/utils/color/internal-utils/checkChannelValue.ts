/**
 * Validates that a channel value is a valid number within the range of 0 to 255.
 * Throws an error if the value is not valid.
 *
 * @param channelName - The name of the channel being validated.
 * @param value - The value of the channel to validate.
 * @throws Will throw an error if the value is not a valid channel number.
 *
 * @private util of `@promptbook/color`
 */
export function checkChannelValue(
    channelName: string,
    value: number,
): asserts value is number /* <- TODO: Some proper number_channel type */ {
    if (typeof value !== 'number') {
        throw new Error(`${channelName} channel value is not number but ${typeof value}`);
    }
    if (isNaN(value)) {
        throw new Error(`${channelName} channel value is NaN`);
    }

    if (Math.round(value) !== value) {
        throw new Error(`${channelName} channel is not whole number, it is ${value}`);
    }

    if (value < 0) {
        throw new Error(`${channelName} channel is lower than 0, it is ${value}`);
    }

    if (value > 255) {
        throw new Error(`${channelName} channel is greater than 255, it is ${value}`);
    }
}
