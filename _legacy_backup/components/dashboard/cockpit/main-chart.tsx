"use client";

/**
 * MAIN CHART - Spend Velocity Visualization
 * =============================================================================
 * Real-time area chart showing spend velocity over time
 * Uses lightweight-charts for performance
 * =============================================================================
 */

import { createChart, ColorType, ISeriesApi, Time, AreaSeries } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { Activity } from "lucide-react";

export function MainChart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "hsl(220, 20%, 60%)", // muted-foreground
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            grid: {
                vertLines: { color: "hsl(220, 15%, 18%)" }, // border
                horzLines: { color: "hsl(220, 15%, 18%)" },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
            },
            crosshair: {
                vertLine: {
                    labelVisible: false,
                    color: "hsl(220, 15%, 25%)",
                    style: 2,
                },
                horzLine: {
                    labelVisible: true,
                    color: "hsl(160, 84%, 45%)", // accent
                    labelBackgroundColor: "hsl(160, 84%, 45%)",
                },
            },
        });

        // Create area series with accent color
        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: "hsl(160, 84%, 45%)", // accent
            topColor: "hsla(160, 84%, 45%, 0.3)",
            bottomColor: "hsla(160, 84%, 45%, 0)",
            lineWidth: 2,
        });

        // Generate mock data (24 hours of minute-by-minute data)
        const data = [];
        const now = new Date();
        now.setHours(now.getHours() - 24);
        let value = 1000;

        for (let i = 0; i < 1440; i++) {
            now.setMinutes(now.getMinutes() + 1);
            // Random walk with slight upward bias
            value = Math.max(0, value + (Math.random() - 0.48) * 15);
            data.push({
                time: (now.getTime() / 1000) as Time,
                value: value,
            });
        }

        newSeries.setData(data);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = newSeries;

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-accent" />
                    <span className="font-medium text-foreground">Spend Velocity</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="status-dot-success animate-pulse" />
                    <span className="text-xs text-muted-foreground font-medium">LIVE</span>
                </div>
            </div>

            {/* Chart Container */}
            <div ref={chartContainerRef} className="flex-1 min-h-0" />

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Last 24 hours</span>
                <span className="font-mono">Updated just now</span>
            </div>
        </div>
    );
}
