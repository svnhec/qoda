'use client';

import { useDashboardStore } from '@/store/dashboard-store';

export function RiskGauge() {
    const riskScore = useDashboardStore(state => state.stats.riskScore);

    // Helper to get color
    const getColor = (score: number) => {
        if (score <= 30) return "#10b981"; // Green
        if (score <= 70) return "#f59e0b"; // Amber
        return "#ef4444"; // Red
    };

    const color = getColor(riskScore);
    const rotation = (riskScore / 100) * 180 - 90; // -90 to +90 degrees

    return (
        <div className="w-full h-full p-4 border border-white/5 rounded-xl bg-[#050505] flex flex-col">
            <div className="flex justify-between items-center text-xs font-mono uppercase text-white/40 mb-4">
                <span>Anomaly Monitor</span>
                <span style={{ color }}>{riskScore}% Risk</span>
            </div>

            <div className="flex-1 flex items-end justify-center pb-2 relative">
                {/* Gauge Background */}
                <div className="w-48 h-24 overflow-hidden relative">
                    <div className="w-48 h-48 rounded-full border-[12px] border-white/5 box-border"></div>
                </div>

                {/* Gauge Needle Wrapper - Centered at bottom of semicircle */}
                <div className="absolute bottom-2 left-1/2 -ml-[96px] w-48 h-24 overflow-hidden mask-image-b">
                    {/* Colored Arc - Rotated to show filled portion? 
                 Actually simpler: Needle approach */}
                </div>

                <div
                    className="absolute bottom-2 left-1/2 w-48 h-1 origin-bottom transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                >
                    <div className="w-1 h-24 bg-transparent mx-auto relative">
                        {/* The needle pointer */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0 
                    border-l-[6px] border-l-transparent
                    border-r-[6px] border-r-transparent
                    border-b-[16px]"
                            style={{ borderBottomColor: color }}
                        ></div>
                    </div>
                </div>

                {/* Center Hub */}
                <div className="absolute bottom-0 w-4 h-4 rounded-full bg-white/20 backdrop-blur-md z-10 translate-y-1/2"></div>

                {/* Ticks/Segments (Visual Candy) */}
                <svg className="absolute inset-x-0 bottom-0 h-full w-full pointer-events-none" viewBox="0 0 200 100">
                    {/* Green Range */}
                    <path d="M 20 100 A 80 80 0 0 1 65 35" fill="none" stroke="#10b981" strokeWidth="4" strokeOpacity="0.2" />
                    {/* Amber Range */}
                    <path d="M 70 30 A 80 80 0 0 1 130 30" fill="none" stroke="#f59e0b" strokeWidth="4" strokeOpacity="0.2" />
                    {/* Red Range */}
                    <path d="M 135 35 A 80 80 0 0 1 180 100" fill="none" stroke="#ef4444" strokeWidth="4" strokeOpacity="0.2" />
                </svg>
            </div>

            <div className="mt-4 text-center">
                <div className="text-xs text-white/40 font-mono">
                    STATUS: <span style={{ color }}>{riskScore > 70 ? 'CRITICAL' : riskScore > 30 ? 'CAUTION' : 'NOMINAL'}</span>
                </div>
            </div>
        </div>
    );
}
