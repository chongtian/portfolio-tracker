import { useEffect, useMemo, useState } from 'react'
import { fetchAccountDetails } from '../services/api'
import type { GlobalDetail } from '../models/types'
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  // Line,
  // LineChart,
  // XAxis,
  // YAxis,
  // CartesianGrid,
  // Legend,
} from 'recharts'
import './PageStyles.css'
import { formatCurrency } from '../utils/formatCurrency'
import { cleanUpPieData, pieChartColors } from '../utils/chartHelper'

const chartColors = pieChartColors

export default function GlobalNetWorthPage() {
  const [summary, setSummary] = useState<GlobalDetail | null>(null)

  useEffect(() => {
    fetchAccountDetails().then(details => {
      const ret: GlobalDetail = {
        summary: {
          PK: '',
          SK: '',
          createdAt: '',
          entityType: '',
          totalCash: 0,
          totalAvailableCash: 0,
          totalPositionsValue: 0,
          unrealizedPnl: 0,
          lastUpdated: ''
        },
        positions: []
      }

      for (const account of details) {
        ret.summary.totalCash += account.summary.totalCash
        ret.summary.totalAvailableCash! += account.summary.totalAvailableCash || 0
        ret.summary.totalPositionsValue += account.summary.totalPositionsValue
        ret.summary.unrealizedPnl += account.summary.unrealizedPnl

        for (const position of account.positions) {
          const existing = ret.positions.find(p => p.instrumentId === position.instrumentId)
          if (existing) {
            existing.quantity += position.quantity
            existing.totalCost += position.totalCost
            existing.marketValue = (existing.marketValue || 0) + (position.marketValue || 0)
            existing.unrealizedPnl = (existing.unrealizedPnl || 0) + (position.unrealizedPnl || 0)
            existing.realizedPnl = (existing.realizedPnl || 0) + (position.realizedPnl || 0)
          } else {
            ret.positions.push(position)
          }
        }
      }

      setSummary(ret)

    }).catch(console.error)

  }, [])

  const pieData = useMemo(() => {
    if (!summary) return []

    const positions = summary.positions.map((position) => ({
      name: position.instrumentId,
      value: position.marketValue,
    }))

    return cleanUpPieData([
      ...positions,
      { name: 'Cash', value: summary.summary.totalCash },
    ], chartColors.length)
  }, [summary])

  // const cashHistory = summary?.cashHistory?.map((point) => ({ name: point.date, value: point.value })) ?? [
  //   { name: 'Current', value: summary?.availableCash ?? 0 },
  // ]

  // const netWorthHistory = summary?.netWorthHistory?.map((point) => ({ name: point.date, value: point.value })) ?? [
  //   { name: 'Current', value: summary?.netWorth ?? 0 },
  // ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Global net worth</h1>
          <p>View aggregated portfolio status across all accounts.</p>
        </div>
      </div>

      {!summary ? (
        <div className="info-card">Loading global summary…</div>
      ) : (
        <>
          <section className="summary-grid">
            <div className="summary-card">
              <h2>Cash balance</h2>
              <div className="summary-value">{formatCurrency(summary.summary.totalCash)}</div>
            </div>
            <div className="summary-card">
              <h2>Available cash</h2>
              <div className="summary-value">{formatCurrency(summary.summary.totalAvailableCash)}</div>
            </div>
            <div className="summary-card">
              <h2>Net worth</h2>
              <div className="summary-value">{formatCurrency(summary.summary.totalCash + summary.summary.totalPositionsValue)}</div>
            </div>
            <div className="summary-card">
              <h2>Unrealized PnL</h2>
              <div className="summary-value">{formatCurrency(summary.summary.unrealizedPnl)}</div>
            </div>
          </section>

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
                {summary.positions.map((position) => (
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

          <div className="chart-grid">
            <div className="chart-card">
              <h2>Value breakdown</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} >
                    {pieData.map((_, index) => (
                      <Cell key={`slice-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value ? parseFloat(value.toString()) : null)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* <div className="chart-card">
              <h2>Cash history</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cashHistory} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div> */}
          </div>

          {/* <div className="chart-grid">
            <div className="chart-card">
              <h2>Net worth history</h2>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={netWorthHistory} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div> */}
        </>
      )}
    </div>
  )
}
