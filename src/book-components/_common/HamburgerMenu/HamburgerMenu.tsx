import React from 'react';
import { classNames } from '../react-utils/classNames';
import styles from './HamburgerMenu.module.css';

type HamburgerMenuProps = {
    isOpen: boolean;
    onClick?: () => void;
    className?: string;
};

/**
 * An animated hamburger menu button component.
 *
 * This component renders a 3-bar hamburger icon that animates into an "X" when
 * the menu is open.
 *
 * @param props - Contains the open state, an optional click handler, and optional className
 * @private Internal component
 */
export function HamburgerMenu({ isOpen, onClick, className }: HamburgerMenuProps) {
    return (
        <div className={classNames(styles.MenuHamburger, className)} onClick={onClick}>
            <div className={classNames(styles.MenuHamburgerInner, isOpen && styles.open)}>
                <div className={classNames(styles.bar, styles.bar1)}></div>
                <div className={classNames(styles.bar, styles.bar2)}></div>
                <div className={classNames(styles.bar, styles.bar3)}></div>
            </div>
        </div>
    );
}
