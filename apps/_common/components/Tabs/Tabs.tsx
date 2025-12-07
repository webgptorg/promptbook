'use client';

import { createContext, ReactNode, useContext, useState } from 'react';

type TabsContextType = {
    activeTab: string;
    setActiveTab: (value: string) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

function useTabsContext() {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within a Tabs provider');
    }
    return context;
}

type TabsProps = {
    defaultValue: string;
    children: ReactNode;
    className?: string;
};

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultValue);

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
}

type TabsListProps = {
    children: ReactNode;
    className?: string;
};

export function TabsList({ children, className = '' }: TabsListProps) {
    return (
        <div
            className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}
            role="tablist"
        >
            {children}
        </div>
    );
}

type TabsTriggerProps = {
    value: string;
    children: ReactNode;
    className?: string;
};

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
    const { activeTab, setActiveTab } = useTabsContext();
    const isActive = activeTab === value;

    return (
        <button
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(value)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'hover:bg-gray-50 hover:text-gray-900'
            } ${className}`}
        >
            {children}
        </button>
    );
}

type TabsContentProps = {
    value: string;
    children: ReactNode;
    className?: string;
};

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
    const { activeTab } = useTabsContext();

    if (activeTab !== value) {
        return null;
    }

    return (
        <div
            role="tabpanel"
            className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${className}`}
        >
            {children}
        </div>
    );
}
