import type { string_css_class } from '../../../types/typeAliases';

/**
 * Utility function for joining multiple truthy class names into one string
 *
 * @private within the `@promptbook/components`
 */
export function classNames(...classes: Array<string_css_class | undefined | false | null>): string_css_class {
    return classes.filter((className) => className).join(' ');
}
