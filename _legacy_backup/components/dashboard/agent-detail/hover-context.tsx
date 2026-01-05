'use client';

import { createContext, useContext, useState } from 'react';

interface HoverContextType {
    hoveredTimestamp: number | null;
    setHoveredTimestamp: (timestamp: number | null) => void;
}

export const HoverContext = createContext<HoverContextType>({
    hoveredTimestamp: null,
    setHoveredTimestamp: () => { },
});

export function HoverProvider({ children }: { children: React.ReactNode }) {
    const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);

    return (
        <HoverContext.Provider value={{ hoveredTimestamp, setHoveredTimestamp }}>
            {children}
        </HoverContext.Provider>
    );
}

export const useHoverContext = () => useContext(HoverContext);
