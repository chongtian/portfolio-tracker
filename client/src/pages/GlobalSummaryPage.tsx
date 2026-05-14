import { useEffect, useMemo, useState } from 'react'
import { fetchAccountDetails, fetchPnL } from '../services/api'
import type { GlobalDetail } from '../models/types'
import {
  Pie, PieChart, ResponsiveContainer, Tooltip, Cell,
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
import { useAccounts } from '../hooks/useAccounts'
import type { PnLEntity } from '../models/pnl'
import { sortPositions } from '../utils/sortPositions'
import { useGlobalLoading } from '../hooks/LoadingContext'

const chartColors = pieChartColors

export default function GlobalSummaryPage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const [summary, setSummary] = useState<GlobalDetail | null>(null)
  const [pnl, setPnl] = useState<PnLEntity[] | null>([])
  const { state } = useAccounts()
  const { accounts, loading } = state
  if (loading) {
    startLoading()
  } else {
    stopLoading()
  }

  useEffect(() => {
    startLoading()
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

        for (const position of account.positions.filter(p => Math.round(Math.abs(p.quantity) * 10000) > 0)) {
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

      ret.positions?.sort(sortPositions)

      setSummary(ret)

    }).catch(console.error).finally(stopLoading)
  }, [])

  useEffect(() => {
    const endDateStr = (new Date()).toISOString().slice(0, 10)
    const startDateStr = (new Date(new Date().setFullYear(new Date().getFullYear() - 1))).toISOString().slice(0, 10)
    const pageSize = 366
    const taxableAccounts = accounts.filter(a => a.accountType === 'TAXABLE')
    const fetchPromises = taxableAccounts.map(a =>
      fetchPnL(a.accountId, startDateStr, endDateStr, pageSize)
    )
    const results = Promise.all(fetchPromises)
    startLoading()
    results.then(items => {
      setPnl(items.flatMap(res => res.items ?? []))
    }).catch(console.error).finally(stopLoading)

  }, [accounts])

  const pieDataValue = useMemo(() => {
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

  const pieDataUnrealizedProfit = useMemo(() => {
    if (!summary) return []

    const positions = summary.positions.filter(p => (p.unrealizedPnl || 0) > 0).map((position) => ({
      name: position.instrumentId,
      value: position.unrealizedPnl,
    }))

    return cleanUpPieData(positions, chartColors.length)
  }, [summary])

  const pieDataUnrealizedLoss = useMemo(() => {
    if (!summary) return []

    const positions = summary.positions.filter(p => (p.unrealizedPnl || 0) < 0).map((position) => ({
      name: position.instrumentId,
      value: position.unrealizedPnl,
    }))

    return cleanUpPieData(positions, chartColors.length)
  }, [summary])

  const pnlYtd = useMemo(() => {
    return pnl?.filter(h => (h.closedDate || '0000-00-00') >= `${(new Date()).getFullYear()}-01-01`).reduce((sum, p) => sum = sum + p.realizedPnl, 0)
  }, [pnl])

  const pnl1yr = useMemo(() => {
    return pnl?.reduce((sum, p) => sum = sum + p.realizedPnl, 0)
  }, [pnl])

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
          <h1>Global Summary</h1>
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

            <div className="summary-card">
              <h2>Realized PnL YTD</h2>
              <div className="summary-value">{formatCurrency(pnlYtd)}</div>
            </div>

            <div className="summary-card">
              <h2>Realized PnL in one year</h2>
              <div className="summary-value">{formatCurrency(pnl1yr)}</div>
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
                  <Pie data={pieDataValue} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} >
                    {pieDataValue.map((_, index) => (
                      <Cell key={`slice-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value ? parseFloat(value.toString()) : null)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h2>Unrealized Profit breakdown</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieDataUnrealizedProfit} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} >
                    {pieDataUnrealizedProfit.map((_, index) => (
                      <Cell key={`slice-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value ? parseFloat(value.toString()) : null)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="chart-grid">
            <div className="chart-card">
              <h2>Unrealized Loss breakdown</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieDataUnrealizedLoss} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} >
                    {pieDataUnrealizedLoss.map((_, index) => (
                      <Cell key={`slice-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value ? parseFloat(value.toString()) : null)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
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
