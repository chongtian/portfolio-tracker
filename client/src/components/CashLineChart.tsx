import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts";
import { formatCurrency } from "../utils/formatCurrency";
import type { SummaryEntity } from "../models/summary";
import { useMemo } from "react";

type LineChartData = {
    data: SummaryEntity[] | undefined;
    title?: string;
    ytd?: boolean;
}

export default function CashLineChart({ data, title, ytd = false }: LineChartData) {

    let chartTitle = ytd ? "Cash History YTD" : "Cash History in 1 year"
    if (title) {
        chartTitle = title
    }

    const chartData = useMemo(() => {
        if (ytd) {
            return data?.filter(h => (h.asOfDate || '0000-00-00') >= `${(new Date()).getFullYear()}-01-01`)
                .map(h => {
                    return {
                        name: h.asOfDate || '0000-00-00',
                        totalCash: h.totalCash,
                        totalAvailableCash: h.totalAvailableCash
                    }
                })
        } else {
            return data?.map(h => {
                return {
                    name: h.asOfDate || '0000-00-00',
                    totalCash: h.totalCash,
                    totalAvailableCash: h.totalAvailableCash
                }
            })
        }
    }, [data])

    return (
        <div className="chart-card">
            <h2>{chartTitle}</h2>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 'auto']} allowDataOverflow={true} />
                    <Tooltip formatter={(value) => formatCurrency(value ? parseFloat(value.toString()) : null)} />
                    <Legend />
                    <Line type="monotone" dataKey="totalCash" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="totalAvailableCash" stroke="#16a34a" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}