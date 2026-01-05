'use client';

import { ResponsiveSankey } from '@nivo/sankey';
import { formatCurrency } from '@/lib/types/currency';

// Custom Colors
const COLORS = {
    client: '#3b82f6', // Blue-500
    revenue: '#ffffff', // White
    spend: '#ef4444',   // Red-500
    profit: '#10b981',  // Emerald-500 (Neon ish)
};

const DATA = {
    nodes: [
        { id: 'Client A', nodeColor: COLORS.client },
        { id: 'Client B', nodeColor: COLORS.client },
        { id: 'Client C', nodeColor: COLORS.client },
        { id: 'Total Revenue', nodeColor: COLORS.revenue },
        { id: 'Cost of AI', nodeColor: COLORS.spend },
        { id: 'Net Profit', nodeColor: COLORS.profit },
    ],
    links: [
        { source: 'Client A', target: 'Total Revenue', value: 12500 },
        { source: 'Client B', target: 'Total Revenue', value: 8200 },
        { source: 'Client C', target: 'Total Revenue', value: 5400 },
        { source: 'Total Revenue', target: 'Cost of AI', value: 8900 }, // ~34% costs
        { source: 'Total Revenue', target: 'Net Profit', value: 17200 }, // ~66% margin
    ],
};

export function MoneyFlowSankey() {
    return (
        <ResponsiveSankey
            data={DATA}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            align="justify"
            colors={(node: any) => node.nodeColor || '#666'}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={18}
            nodeSpacing={24}
            nodeBorderWidth={0}
            nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
            nodeBorderRadius={6} // Nivo generic prop (might not work directly on Sankey without custom layer, trying default first)
            linkOpacity={0.5}
            linkHoverOthersOpacity={0.1}
            linkContract={3}
            enableLinkGradient={true}
            labelPosition="outside" // "inside" or "outside"
            labelOrientation="horizontal"
            labelPadding={16}
            labelTextColor={{ from: 'color', modifiers: [['brighter', 1]] }}
            nodeTooltip={({ node }: any) => (
                <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl text-xs font-mono">
                    <div className="text-white/60 mb-1">{node.id}</div>
                    <div className="text-lg text-white font-bold">{formatCurrency(BigInt(Math.round(node.value)))}</div>
                </div>
            )}
            linkTooltip={({ link }) => (
                <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl text-xs font-mono">
                    <div className="text-white/60 mb-1 flex items-center gap-2">
                        <span>{link.source.id}</span>
                        <span>→</span>
                        <span>{link.target.id}</span>
                    </div>
                    <div className="text-lg text-white font-bold">{formatCurrency(BigInt(Math.round(link.value)))}</div>
                </div>
            )}
            theme={{
                labels: {
                    text: {
                        fontSize: 12,
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fill: '#94a3b8' // Slate-400
                    }
                },
                tooltip: {
                    container: {
                        background: '#0a0a0a',
                        color: '#fff',
                        fontSize: '12px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    },
                },
            }}
        />
    );
}
