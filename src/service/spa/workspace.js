'use strict';

/*
 * The desktop workspace's tab model, shared by the dashboard page and its tests. A workspace lists open project pages and
 * documents by identity (`key`) in one strip: pinned tabs first, then regular tabs, and at most one reusable preview.
 * Every operation returns a new workspace; nothing here renders, loads or saves.
 */
(function (root, factory) {
    root.PtbkWorkspace = factory();
})(self, () => {
    /** An empty workspace: the project overview. */
    function empty() {
        return { tabs: [], active: null };
    }

    /** Pinned tabs stay at the left, in their own order; the others keep theirs. */
    function ordered(tabs) {
        return [...tabs.filter((tab) => tab.mode === 'pinned'), ...tabs.filter((tab) => tab.mode !== 'pinned')];
    }

    /** The tab of a key. */
    function find(workspace, key) {
        return workspace.tabs.find((tab) => tab.key === key);
    }

    /** The workspace's reusable preview tab, if any. */
    function preview(workspace) {
        return workspace.tabs.find((tab) => tab.mode === 'preview');
    }

    /**
     * Opens a tab and makes it active. An already open document is focused (opening it for editing promotes its
     * preview). A preview replaces the previous preview in place; any other opening adds a regular tab.
     */
    function open(workspace, tab, options = {}) {
        const existing = find(workspace, tab.key);
        if (existing) {
            const tabs = workspace.tabs.map((item) => (item.key === tab.key ? { ...item, ...tab, mode: item.mode === 'preview' && !options.preview ? 'regular' : item.mode } : item));
            return { tabs, active: tab.key };
        }
        const opened = { ...tab, mode: options.preview ? 'preview' : options.pinned ? 'pinned' : 'regular' };
        const current = preview(workspace);
        if (options.preview && current) return { tabs: workspace.tabs.map((item) => (item === current ? opened : item)), active: tab.key };
        return { tabs: ordered([...workspace.tabs, opened]), active: tab.key };
    }

    /** Keeps a preview open as a regular tab (starting an edit, double-click or Keep Open). */
    function promote(workspace, key) {
        return { ...workspace, tabs: workspace.tabs.map((tab) => (tab.key === key && tab.mode === 'preview' ? { ...tab, mode: 'regular' } : tab)) };
    }

    /** Pins a tab (a preview is kept open first); it moves to the end of the pinned tabs. */
    function pin(workspace, key) {
        const tab = find(workspace, key);
        if (!tab || tab.mode === 'pinned') return workspace;
        const rest = workspace.tabs.filter((item) => item !== tab);
        const pinned = rest.filter((item) => item.mode === 'pinned');
        return { ...workspace, tabs: [...pinned, { ...tab, mode: 'pinned' }, ...rest.filter((item) => item.mode !== 'pinned')] };
    }

    /** Unpins a tab: it becomes the first regular tab. */
    function unpin(workspace, key) {
        const tab = find(workspace, key);
        if (!tab || tab.mode !== 'pinned') return workspace;
        const rest = workspace.tabs.filter((item) => item !== tab);
        return { ...workspace, tabs: [...rest.filter((item) => item.mode === 'pinned'), { ...tab, mode: 'regular' }, ...rest.filter((item) => item.mode !== 'pinned')] };
    }

    /** The tab activated when the active one closes: its right neighbor, else its left one, else the overview. */
    function successor(tabs, remaining, key) {
        const index = tabs.findIndex((tab) => tab.key === key);
        const right = tabs.slice(index + 1).find((tab) => remaining.includes(tab));
        const left = tabs.slice(0, index).reverse().find((tab) => remaining.includes(tab));
        return (right || left || { key: null }).key;
    }

    /** Keeps only the tabs `keep` accepts; the active tab moves to a remaining neighbor (or the overview). */
    function retain(workspace, keep) {
        const tabs = workspace.tabs.filter(keep);
        const active = tabs.some((tab) => tab.key === workspace.active) ? workspace.active : workspace.active === null ? null : successor(workspace.tabs, tabs, workspace.active);
        return { tabs, active };
    }

    /** Closes one tab. Closing the last tab returns to the project overview. */
    function close(workspace, key) {
        return retain(workspace, (tab) => tab.key !== key);
    }

    /** Close Others: pinned tabs and the chosen tab stay. */
    function closeOthers(workspace, key) {
        const result = retain(workspace, (tab) => tab.key === key || tab.mode === 'pinned');
        return find(result, key) ? { ...result, active: key } : result;
    }

    /** Closes every regular tab and the preview; pinned tabs stay. */
    function closeUnpinned(workspace) {
        return retain(workspace, (tab) => tab.mode === 'pinned');
    }

    /** Activates an open tab (null shows the project overview). */
    function activate(workspace, key) {
        return key === null || find(workspace, key) ? { ...workspace, active: key } : workspace;
    }

    /** The part kept for a restart: regular and pinned tabs (a temporary preview is disposable). */
    function persisted(workspace) {
        const tabs = workspace.tabs.filter((tab) => tab.mode !== 'preview');
        return { tabs, active: tabs.some((tab) => tab.key === workspace.active) ? workspace.active : null };
    }

    /** A workspace restored from its persisted part (unknown modes become regular tabs, pinned stay first). */
    function restored(value) {
        const tabs = [];
        for (const tab of (value && Array.isArray(value.tabs) ? value.tabs : [])) {
            if (tab && typeof tab.key === 'string' && !tabs.some((item) => item.key === tab.key)) tabs.push({ ...tab, mode: tab.mode === 'pinned' ? 'pinned' : 'regular' });
        }
        const result = { tabs: ordered(tabs), active: null };
        return activate(result, value && typeof value.active === 'string' ? value.active : null);
    }

    return { empty, find, preview, open, promote, pin, unpin, close, closeOthers, closeUnpinned, activate, persisted, restored };
});
