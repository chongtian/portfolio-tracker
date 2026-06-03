import { useMemo } from "react";
import type { PnLEntity } from "../models/pnl";
import type { SummaryEntity } from "../models/summary";
import { formatCurrency } from "../utils/formatCurrency";

type SummaryData = {
    summary: SummaryEntity;
    pnl: PnLEntity[] | null;
}

export default function SummaryCard({ summary, pnl }: SummaryData) {

    const pnlYtd = useMemo(() => {
        return pnl?.filter(h => (h.closedDate || '0000-00-00') >= `${(new Date()).getFullYear()}-01-01`).reduce((sum, p) => sum = sum + p.realizedPnl, 0)
    }, [pnl])

    const pnl1yr = useMemo(() => {
        return pnl?.reduce((sum, p) => sum = sum + p.realizedPnl, 0)
    }, [pnl])

    return (
        <section className="summary-grid">
            <div className="summary-card">
                <h2>Cash balance</h2>
                <div className="summary-value">{formatCurrency(summary.totalCash)}</div>
            </div>
            <div className="summary-card">
                <h2>Available cash</h2>
                <div className="summary-value">{formatCurrency(summary.totalAvailableCash)}</div>
            </div>
            <div className="summary-card">
                <h2>Net worth</h2>
                <div className="summary-value">{formatCurrency(summary.totalCash + summary.totalPositionsValue)}</div>
            </div>
            <div className="summary-card">
                <h2>Unrealized PnL</h2>
                <div className="summary-value">{formatCurrency(summary.unrealizedPnl)}</div>
            </div>
            <div className="summary-card">
                <h2>Realized PnL YTD</h2>
                <div className="summary-value">{formatCurrency(pnlYtd)}</div>
            </div>
            <div className="summary-card">
                <h2>Realized PnL in one year</h2>
                <div className="summary-value">{formatCurrency(pnl1yr)}</div>
            </div>
        </section>
    )
}