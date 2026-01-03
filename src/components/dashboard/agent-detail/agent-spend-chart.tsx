'use client';

import { createChart, ColorType, Time, AreaSeries } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { useHoverContext } from './hover-context';

export function AgentSpendChart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const { setHoveredTimestamp } = useHoverContext();

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#050505' },
                textColor: '#94a3b8',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            grid: {
                vertLines: { color: '#ffffff05' },
                horzLines: { color: '#ffffff05' },
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
            },
            crosshair: {
                vertLine: {
                    labelVisible: false,
                    color: '#ffffff20',
                },
                horzLine: {
                    labelVisible: false,
                    color: '#10b981',
                    labelBackgroundColor: '#10b981',
                }
            }
        });

        const series = chart.addSeries(AreaSeries, {
            lineColor: '#10b981', // Neon Green
            topColor: '#10b98120',
            bottomColor: '#10b98100',
            lineWidth: 2,
        });

        // Generate correlated data (Cost spikes usually align with logs)
        const data = [];
        const date = new Date();
        date.setHours(date.getHours() - 24);
        let value = 10;

        for (let i = 0; i < 1440; i++) {
            date.setMinutes(date.getMinutes() + 1);
            // Spiky behavior
            if (Math.random() > 0.98) value += 50;
            value = Math.max(0, value * 0.9 + (Math.random() - 0.4) * 20); // Decay and noise

            data.push({
                time: (date.getTime() / 1000) as Time,
                value: value
            });
        }

        series.setData(data);
        chart.timeScale().fitContent();

        // Subscribe to crosshair move
        chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                setHoveredTimestamp(param.time as number * 1000);
            } else {
                setHoveredTimestamp(null);
            }
        });

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [setHoveredTimestamp]);

    return (
        <div className="w-full h-full p-4 border border-white/5 rounded-xl bg-[#050505] flex flex-col">
            <div className="flex justify-between items-center text-xs font-mono uppercase text-white/40 mb-2 shrink-0">
                <span>Operations Cost (24h)</span>
            </div>
            <div ref={chartContainerRef} className="flex-1 min-h-0" />
        </div>
    );
}
