'use client';

import { ChevronRight } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { HeadlessLink } from '../_utils/headlessParam';
import type {
    AgentMenuActionNode,
    AgentMenuAgentNode,
    AgentMenuFolderNode,
    AgentMenuTreeNode,
} from './AgentMenuStructure';

/**
 * Desktop min width of the root column in the agent directory dropdown.
 */
const ROOT_AGENT_MENU_COLUMN_MIN_WIDTH_PX = 260;

/**
 * Desktop min width of nested columns in the agent directory dropdown.
 */
const NESTED_AGENT_MENU_COLUMN_MIN_WIDTH_PX = 240;

/**
 * Props required to render one recursive column of the agent directory dropdown.
 *
 * @private type of AgentDirectoryDropdown
 */
type AgentMenuColumnProps = {
    readonly nodes: ReadonlyArray<AgentMenuTreeNode>;
    readonly onNavigate: () => void;
    readonly isTouchInput: boolean;
    readonly depth: number;
    readonly keyPrefix: string;
    readonly expandedFolders: Record<string, boolean>;
    readonly toggleFolder: (folderKey: string) => void;
};

/**
 * Shared props passed to one rendered tree node inside a column.
 *
 * @private type of AgentMenuColumn
 */
type AgentMenuNodeProps = Omit<AgentMenuColumnProps, 'nodes'> & {
    readonly node: AgentMenuTreeNode;
};

/**
 * Props for rendering a folder node entry.
 *
 * @private type of AgentMenuColumn
 */
type AgentMenuFolderNodeItemProps = Omit<AgentMenuColumnProps, 'nodes'> & {
    readonly node: AgentMenuFolderNode;
};

/**
 * Props for rendering the nested children of a folder node.
 *
 * @private type of AgentMenuColumn
 */
type AgentMenuFolderChildrenProps = Omit<AgentMenuColumnProps, 'nodes'> & {
    readonly childNodes: ReadonlyArray<AgentMenuTreeNode>;
    readonly isExpanded: boolean;
};

/**
 * Props for rendering an action node entry.
 *
 * @private type of AgentMenuColumn
 */
type AgentMenuActionNodeItemProps = Pick<AgentMenuColumnProps, 'onNavigate' | 'isTouchInput'> & {
    readonly node: AgentMenuActionNode;
};

/**
 * Props for rendering an agent node entry.
 *
 * @private type of AgentMenuColumn
 */
type AgentMenuAgentNodeItemProps = Pick<AgentMenuColumnProps, 'onNavigate' | 'isTouchInput'> & {
    readonly node: AgentMenuAgentNode;
};

/**
 * Props for rendering a fallback-or-custom node label.
 *
 * @private type of AgentMenuColumn
 */
type AgentMenuNodeLabelProps = {
    readonly label: string;
    readonly renderLabel?: ReactNode;
};

/**
 * Creates the stable React key used for one tree node.
 *
 * @private function of AgentMenuColumn
 */
function createAgentMenuNodeKey(node: AgentMenuTreeNode): string {
    if (node.type === 'folder') {
        return `folder-${node.id}`;
    }

    if (node.type === 'action') {
        return `action-${node.id}`;
    }

    return `agent-${node.agentName}`;
}

/**
 * Resolves the state key used to track one folder expansion branch.
 *
 * @private function of AgentMenuColumn
 */
function createFolderKey(keyPrefix: string, folderId: number): string {
    return `${keyPrefix}-folder-${folderId}`;
}

/**
 * Returns whether the folder currently has any child nodes to render.
 *
 * @private function of AgentMenuColumn
 */
function hasFolderChildren(node: AgentMenuFolderNode): boolean {
    return node.children.length > 0;
}

/**
 * Resolves whether a touch-first folder click should expand instead of navigate.
 *
 * @private function of AgentMenuColumn
 */
function shouldExpandFolderOnTouchClick(
    isTouchInput: boolean,
    hasChildren: boolean,
    isExpanded: boolean,
): boolean {
    return isTouchInput && hasChildren && !isExpanded;
}

/**
 * Handles folder link activation while preserving touch-first expand behavior.
 *
 * @private function of AgentMenuColumn
 */
function handleFolderLinkClick(
    event: MouseEvent<HTMLAnchorElement>,
    isTouchInput: boolean,
    hasChildren: boolean,
    isExpanded: boolean,
    folderKey: string,
    toggleFolder: (folderKey: string) => void,
    onNavigate: () => void,
): void {
    if (shouldExpandFolderOnTouchClick(isTouchInput, hasChildren, isExpanded)) {
        event.preventDefault();
        toggleFolder(folderKey);
        return;
    }

    onNavigate();
}

/**
 * Creates the outer wrapper class for one recursive menu column.
 *
 * @private function of AgentMenuColumn
 */
function createColumnClassName(isTouchInput: boolean, depth: number): string {
    return ['relative flex flex-col gap-1 px-1 py-1', isTouchInput && depth > 0 ? 'bg-transparent' : 'bg-white']
        .filter(Boolean)
        .join(' ');
}

/**
 * Creates the minimum width used by desktop columns.
 *
 * @private function of AgentMenuColumn
 */
function createColumnMinWidth(isTouchInput: boolean, depth: number): number | undefined {
    if (isTouchInput) {
        return undefined;
    }

    return depth === 0 ? ROOT_AGENT_MENU_COLUMN_MIN_WIDTH_PX : NESTED_AGENT_MENU_COLUMN_MIN_WIDTH_PX;
}

/**
 * Creates the folder wrapper class, enabling hover groups only for pointer input.
 *
 * @private function of AgentMenuColumn
 */
function createFolderWrapperClassName(isTouchInput: boolean): string {
    return ['relative', isTouchInput ? '' : 'group'].filter(Boolean).join(' ');
}

/**
 * Creates the shared folder trigger styling for touch and pointer input.
 *
 * @private function of AgentMenuColumn
 */
function createFolderEntryClassName(isTouchInput: boolean): string {
    return [
        'flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors',
        isTouchInput
            ? 'text-gray-800 hover:bg-white active:bg-gray-100'
            : 'text-gray-800 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900',
    ].join(' ');
}

/**
 * Creates the rotation class for the folder chevron indicator.
 *
 * @private function of AgentMenuColumn
 */
function createFolderChevronClassName(isTouchInput: boolean, isExpanded: boolean): string {
    return [
        'h-4 w-4 text-gray-400 transition-transform duration-150',
        isTouchInput && isExpanded ? 'rotate-90' : '',
    ]
        .filter(Boolean)
        .join(' ');
}

/**
 * Creates the touch-only nested branch wrapper styling.
 *
 * @private function of AgentMenuColumn
 */
function createTouchFolderChildrenClassName(isExpanded: boolean): string {
    return ['ml-3 border-l border-gray-200 pl-2', isExpanded ? 'mt-1 block' : 'hidden'].join(' ');
}

/**
 * Creates the shared action entry styling while preserving bold and bordered variants.
 *
 * @private function of AgentMenuColumn
 */
function createActionEntryClassName(node: AgentMenuActionNode, isTouchInput: boolean): string {
    return [
        'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors',
        node.isBold ? 'font-semibold text-gray-900' : 'text-gray-700',
        isTouchInput
            ? 'hover:bg-white active:bg-gray-100'
            : 'border border-transparent hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900',
        node.isBordered ? 'mt-1 border-t border-gray-100 pt-3' : '',
    ]
        .filter(Boolean)
        .join(' ');
}

/**
 * Creates the styling for a leaf agent entry.
 *
 * @private function of AgentMenuColumn
 */
function createAgentEntryClassName(isTouchInput: boolean): string {
    return [
        'flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors',
        isTouchInput
            ? 'text-gray-700 hover:bg-white active:bg-gray-100'
            : 'text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900',
    ].join(' ');
}

/**
 * Renders either the richer prebuilt label or the default truncated text fallback.
 *
 * @private function of AgentMenuColumn
 */
function AgentMenuNodeLabel({ label, renderLabel }: AgentMenuNodeLabelProps) {
    return <span className="min-w-0">{renderLabel ?? <span className="truncate">{label}</span>}</span>;
}

/**
 * Renders the nested children of a folder branch using the correct touch vs. pointer container.
 *
 * @private function of AgentMenuColumn
 */
function AgentMenuFolderChildren({
    childNodes,
    onNavigate,
    depth,
    isTouchInput,
    keyPrefix,
    expandedFolders,
    toggleFolder,
    isExpanded,
}: AgentMenuFolderChildrenProps) {
    if (childNodes.length === 0) {
        return null;
    }

    if (isTouchInput) {
        return (
            <div className={createTouchFolderChildrenClassName(isExpanded)}>
                <AgentMenuColumn
                    nodes={childNodes}
                    onNavigate={onNavigate}
                    depth={depth + 1}
                    isTouchInput={isTouchInput}
                    keyPrefix={keyPrefix}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                />
            </div>
        );
    }

    return (
        <div className="absolute left-full top-0 z-50 mt-0 hidden w-[260px] rounded-xl border border-gray-100 bg-white shadow-xl shadow-slate-900/10 group-hover:block">
            <AgentMenuColumn
                nodes={childNodes}
                onNavigate={onNavigate}
                depth={depth + 1}
                isTouchInput={isTouchInput}
                keyPrefix={keyPrefix}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
            />
        </div>
    );
}

/**
 * Renders one folder entry and its recursive children.
 *
 * @private function of AgentMenuColumn
 */
function AgentMenuFolderNodeItem({
    node,
    onNavigate,
    depth,
    isTouchInput,
    keyPrefix,
    expandedFolders,
    toggleFolder,
}: AgentMenuFolderNodeItemProps) {
    const folderKey = createFolderKey(keyPrefix, node.id);
    const isExpanded = Boolean(expandedFolders[folderKey]);
    const hasChildren = hasFolderChildren(node);

    return (
        <div className={createFolderWrapperClassName(isTouchInput)}>
            <HeadlessLink
                href={node.href}
                onClick={(event) =>
                    handleFolderLinkClick(
                        event,
                        isTouchInput,
                        hasChildren,
                        isExpanded,
                        folderKey,
                        toggleFolder,
                        onNavigate,
                    )
                }
                className={createFolderEntryClassName(isTouchInput)}
                title={node.label}
            >
                <AgentMenuNodeLabel label={node.label} renderLabel={node.renderLabel} />
                {hasChildren && <ChevronRight className={createFolderChevronClassName(isTouchInput, isExpanded)} />}
            </HeadlessLink>

            <AgentMenuFolderChildren
                childNodes={node.children}
                onNavigate={onNavigate}
                depth={depth}
                isTouchInput={isTouchInput}
                keyPrefix={folderKey}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                isExpanded={isExpanded}
            />
        </div>
    );
}

/**
 * Renders one action entry, handling button, link, and passive label variants.
 *
 * @private function of AgentMenuColumn
 */
function AgentMenuActionNodeItem({ node, onNavigate, isTouchInput }: AgentMenuActionNodeItemProps) {
    const className = createActionEntryClassName(node, isTouchInput);

    if (node.onClick) {
        return (
            <button
                type="button"
                onClick={() => {
                    void node.onClick?.();
                    onNavigate();
                }}
                className={`${className} w-full text-left`}
                title={node.label}
            >
                <AgentMenuNodeLabel label={node.label} renderLabel={node.renderLabel} />
            </button>
        );
    }

    if (node.href) {
        return (
            <HeadlessLink href={node.href} onClick={onNavigate} className={className} title={node.label}>
                <AgentMenuNodeLabel label={node.label} renderLabel={node.renderLabel} />
            </HeadlessLink>
        );
    }

    return (
        <span className={className} title={node.label}>
            <AgentMenuNodeLabel label={node.label} renderLabel={node.renderLabel} />
        </span>
    );
}

/**
 * Renders one leaf agent entry.
 *
 * @private function of AgentMenuColumn
 */
function AgentMenuAgentNodeItem({ node, onNavigate, isTouchInput }: AgentMenuAgentNodeItemProps) {
    return (
        <HeadlessLink
            href={node.href}
            onClick={onNavigate}
            className={createAgentEntryClassName(isTouchInput)}
            title={node.label}
        >
            <AgentMenuNodeLabel label={node.label} renderLabel={node.renderLabel} />
        </HeadlessLink>
    );
}

/**
 * Routes one tree node to the focused renderer that matches its node type.
 *
 * @private function of AgentMenuColumn
 */
function AgentMenuNode({
    node,
    onNavigate,
    depth,
    isTouchInput,
    keyPrefix,
    expandedFolders,
    toggleFolder,
}: AgentMenuNodeProps) {
    if (node.type === 'folder') {
        return (
            <AgentMenuFolderNodeItem
                node={node}
                onNavigate={onNavigate}
                depth={depth}
                isTouchInput={isTouchInput}
                keyPrefix={keyPrefix}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
            />
        );
    }

    if (node.type === 'action') {
        return <AgentMenuActionNodeItem node={node} onNavigate={onNavigate} isTouchInput={isTouchInput} />;
    }

    return <AgentMenuAgentNodeItem node={node} onNavigate={onNavigate} isTouchInput={isTouchInput} />;
}

/**
 * Renders one column of the agent tree, showing folders and agents.
 *
 * @private function of AgentDirectoryDropdown
 */
export function AgentMenuColumn({
    nodes,
    onNavigate,
    depth,
    isTouchInput,
    keyPrefix,
    expandedFolders,
    toggleFolder,
}: AgentMenuColumnProps) {
    return (
        <div
            className={createColumnClassName(isTouchInput, depth)}
            style={{ minWidth: createColumnMinWidth(isTouchInput, depth) }}
        >
            {nodes.map((node) => (
                <AgentMenuNode
                    key={createAgentMenuNodeKey(node)}
                    node={node}
                    onNavigate={onNavigate}
                    depth={depth}
                    isTouchInput={isTouchInput}
                    keyPrefix={keyPrefix}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                />
            ))}
        </div>
    );
}
