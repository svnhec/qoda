"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartDataPoint {
    time: string;
    value: number;
}

export function SpendChart() {
    const [data, setData] = useState<ChartDataPoint[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // For now, use mock data since we don't have the API route set up yet
                // This will be replaced when the dashboard API is implemented
                const mockData = Array.from({ length: 24 }, (_, i) => ({
                    time: `${String(i).padStart(2, '0')}:00`,
                    value: Math.floor(Math.random() * 200) + 50,
                }));
                setData(mockData);
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchData();
    }, []);

    if (!isLoaded) return <div className="h-[300px] w-full bg-white/5 animate-pulse rounded-xl" />;

    return (
        <div className="h-[350px] w-full p-4 rounded-xl border border-white/5 bg-[#0a0a0a]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white">Spend Volume</h3>
                    <p className="text-sm text-white/40">Real-time aggregation across all agents</p>
                </div>
                <div className="flex gap-2">
                    {["1h", "24h", "7d", "Live"].map((range) => (
                        <button
                            key={range}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${range === "Live"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-white/5 text-white/40 hover:text-white"
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="#ffffff40"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#ffffff40"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#050505",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                        }}
                        itemStyle={{ color: "#fff" }}
                        labelStyle={{ color: "#ffffff60" }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
