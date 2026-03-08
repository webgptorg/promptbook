'use client';

import type { ButtonHTMLAttributes, ComponentProps } from 'react';
import { classNames } from '../_common/react-utils/classNames';
import { ArrowIcon } from './ArrowIcon';

/**
 * Shared props for rendering one solid arrow button.
 *
 * @private internal props typing for `<SolidArrowButton/>`
 */
type SolidArrowButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    /**
     * Arrow direction rendered inside the button.
     */
    readonly direction: ComponentProps<typeof ArrowIcon>['direction'];
    /**
     * Icon size in pixels.
     */
    readonly iconSize?: number;
    /**
     * Optional class names forwarded to the icon.
     */
    readonly iconClassName?: string;
};

/**
 * Shared class name for the arrow button root element.
 *
 * @private internal styling hook for host applications.
 */
const SOLID_ARROW_BUTTON_CLASS_NAME = 'agent-chat-solid-arrow-button';

/**
 * Shared class name for the arrow icon element.
 *
 * @private internal styling hook for host applications.
 */
const SOLID_ARROW_ICON_CLASS_NAME = 'agent-chat-solid-arrow-icon';

/**
 * Reusable solid arrow button used by chat controls across host applications.
 *
 * @private internal shared UI primitive for Promptbook-host applications.
 */
export function SolidArrowButton({
    direction,
    iconSize = 20,
    className,
    iconClassName,
    type = 'button',
    ...buttonProps
}: SolidArrowButtonProps) {
    return (
        <button type={type} className={classNames(SOLID_ARROW_BUTTON_CLASS_NAME, className)} {...buttonProps}>
            <ArrowIcon
                direction={direction}
                size={iconSize}
                className={classNames(SOLID_ARROW_ICON_CLASS_NAME, iconClassName)}
            />
        </button>
    );
}
