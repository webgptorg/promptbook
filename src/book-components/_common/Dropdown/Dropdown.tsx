'use client';

import React, { useState } from 'react';
import styles from './Dropdown.module.css';
import { classNames } from '../react-utils/classNames';

type DropdownProps = {
    actions: Array<{
        icon: JSX.Element;
        name: string;
        onClick: () => void;
    }>;
};

export function Dropdown({ actions }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={styles.dropdown}>
            <button className={styles.button} onClick={() => setIsOpen(!isOpen)}>
                ...
            </button>
            {isOpen && (
                <div className={styles.menu}>
                    {actions.map(({ icon, name, onClick }) => (
                        <button
                            key={name}
                            className={classNames(styles.button, styles.menuItem)}
                            onClick={() => {
                                onClick();
                                setIsOpen(false);
                            }}
                        >
                            {icon}
                            <span>{name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
