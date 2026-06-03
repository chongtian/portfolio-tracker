import type { PositionEntity } from "../models/position";
import { formatCurrency } from "../utils/formatCurrency";

type PositionsData = {
    positions: PositionEntity[]
}

export default function PositionCard({ positions }: PositionsData) {
    return (
        <section className="table-card">
            <h2>Positions</h2>
            <table>
                <thead>
                    <tr>
                        <th>Instrument</th>
                        <th>Quantity</th>
                        <th>Market value</th>
                        <th>Unrealized PnL</th>
                    </tr>
                </thead>
                <tbody>
                    {positions.filter(p => Math.round(Math.abs(p.quantity) * 10000) > 0).map((position) => (
                        <tr key={position.instrumentId}>
                            <td>{position.instrumentId}</td>
                            <td>{position.quantity}</td>
                            <td>{formatCurrency(position.marketValue)}</td>
                            <td>{formatCurrency(position.unrealizedPnl)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    )
}