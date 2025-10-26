import { ReactNode, useState } from 'react';
import { classNames } from '../../../../src/book-components/_common/react-utils/classNames';
import { string_css_class, string_name } from '../../../../src/types/typeAliases';
import { TODO_USE } from '../../../../src/utils/organization/TODO_USE';
import { ResizablePanels } from '../ResizablePanels/ResizablePanels';
import styles from './ResizablePanelsAuto.module.css';

type ResizablePanelsAutoProps = {
    /**
     * Content of panels
     */
    readonly children: [ReactNode, ReactNode];

    /**
     * Unique identifier of the panel to persist its size
     */
    readonly name: string_name;

    /**
     * Optional CSS class name which will be added to root <div> element
     */
    readonly className?: string_css_class;
};

/**
 * Renders two resizable panels
 *
 * It automatically determines if the panels should be horizontal or vertical based on the size of the screen
 */
export function ResizablePanelsAuto(props: ResizablePanelsAutoProps) {
    const { children, name, className } = props;
    const [direction, setDirection] = useState<null | 'HORIZONTAL' | 'VERTICAL'>(null);

    TODO_USE(name);

    if (direction === null) {
        return (
            <div
                className={classNames(styles.ResizablePanelsAuto, className)}
                ref={(element) => {
                    if (element === null) {
                        return;
                    }

                    const { width, height } = element.getBoundingClientRect();

                    if (width > height) {
                        setDirection('HORIZONTAL');
                    } else {
                        setDirection('VERTICAL');
                    }
                }}
            />
        );
    }

    return (
        <ResizablePanels
            className={classNames(styles.ResizablePanelsAuto, className)}
            name={`name-${direction}`}
            {...{ direction, children }}
        />
    );
}
