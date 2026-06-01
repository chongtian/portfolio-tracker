import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { fetchAccountDetail, fetchPnL, fetchSummaryHistory } from '../services/api'
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import './PageStyles.css'
import type { AccountDetail } from '../models/account'
import { formatCurrency } from '../utils/formatCurrency'
import { cleanUpPieData, pieChartColors } from '../utils/chartHelper'
import type { SummaryEntity } from '../models/summary'
import type { PnLEntity } from '../models/pnl'
import { sortPositions } from '../utils/sortPositions'
import { useGlobalLoading } from '../hooks/LoadingContext'

const chartColors = pieChartColors

export default function AccountDetailPage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const { id } = useParams()
  const { state } = useLocation()
  const entity = state?.account

  const [account, setAccount] = useState<AccountDetail | null>(entity)
  const [summaryHistory, setSummaryHistory] = useState<SummaryEntity[] | undefined>()
  const [pnl, setPnl] = useState<PnLEntity[] | null>([])

  useEffect(() => {
    if (!id) {
      return
    }

    if (!entity) {
      startLoading()
      fetchAccountDetail(id).then(
        data => {
          data?.positions?.sort(sortPositions)
          setAccount(data)
        }
      ).catch(console.error).finally(stopLoading)
    }

    const endDateStr = (new Date()).toISOString().slice(0, 10)
    const startDateStr = (new Date(new Date().setFullYear(new Date().getFullYear() - 1))).toISOString().slice(0, 10)
    const pageSize = 366
    startLoading()
    fetchSummaryHistory(id, startDateStr, endDateStr, pageSize).then(data => {
      setSummaryHistory(data.items.sort((a, b) => (a.asOfDate || '0000-00-00').localeCompare(b.asOfDate || '0000-00-00')))
    }).catch(console.error).finally(stopLoading)

  }, [entity, id])

  useEffect(() => {
    const endDateStr = (new Date()).toISOString().slice(0, 10)
    const startDateStr = (new Date(new Date().setFullYear(new Date().getFullYear() - 1))).toISOString().slice(0, 10)
    const pageSize = 366
    startLoading()
    fetchPnL((id ?? account?.accountId) ?? 'unk', startDateStr, endDateStr, pageSize).then(items => {
      setPnl(items.items ?? [])
    }).catch(console.error).finally(stopLoading)

  }, [id, account])

  const pieDataValue = useMemo(() => {
    if (!account) return []

    const positions = account.positions.filter(p => Math.round(Math.abs(p.quantity) * 10000) > 0).map((position) => ({
      name: position.instrumentId,
      value: position.marketValue,
    }))

    return cleanUpPieData([
      ...positions,
      { name: 'Cash', value: account.summary.totalCash },
    ], chartColors.length)
  }, [account])

  const summaryHistory1yr = summaryHistory?.map(h => {
    return {
      name: h.asOfDate || '0000-00-00',
      totalCash: h.totalCash,
      totalAvailableCash: h.totalAvailableCash
    }
  })

  const summaryHistoryYtd = useMemo(() => {
    return summaryHistory?.filter(h => (h.asOfDate || '0000-00-00') >= `${(new Date()).getFullYear()}-01-01`)
      .map(h => {
        return {
          name: h.asOfDate || '0000-00-00',
          totalCash: h.totalCash,
          totalAvailableCash: h.totalAvailableCash
        }
      })
  }, [summaryHistory])

  const pnlYtd = useMemo(() => {
    return pnl?.filter(h => (h.closedDate || '0000-00-00') >= `${(new Date()).getFullYear()}-01-01`).reduce((sum, p) => sum = sum + p.realizedPnl, 0)
  }, [pnl])

  const pnl1yr = useMemo(() => {
    return pnl?.reduce((sum, p) => sum = sum + p.realizedPnl, 0)
  }, [pnl])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Account detail - {account?.account.accountName} - {account?.account.accountType}</h1>
          <p>Broker: {account?.account.brokerName || 'Not Set'} - Account Number: {account?.account.accountNumber || 'Not Set'}</p>
        </div>
        <Link to={`/accounts/${id}/edit`} className="secondary-button">
          Update account
        </Link>
      </div>

      {!account ? (
        <div className="info-card">Loading account data…</div>
      ) : (
        <>
          <section className="summary-grid">
            <div className="summary-card">
              <h2>Cash balance</h2>
              <div className="summary-value">{formatCurrency(account.summary.totalCash)}</div>
            </div>
            <div className="summary-card">
              <h2>Available cash</h2>
              <div className="summary-value">{formatCurrency(account.summary.totalAvailableCash)}</div>
            </div>
            <div className="summary-card">
              <h2>Net worth</h2>
              <div className="summary-value">{formatCurrency(account.summary.totalCash + account.summary.totalPositionsValue)}</div>
            </div>
            <div className="summary-card">
              <h2>Unrealized PnL</h2>
              <div className="summary-value">{formatCurrency(account.summary.unrealizedPnl)}</div>
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
                {account.positions.filter(p => Math.round(Math.abs(p.quantity) * 10000) > 0).map((position) => (
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
                  <Pie data={pieDataValue} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95}
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
              <h2>Cash History in 1 year</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={summaryHistory1yr} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
            <div className="chart-card">
              <h2>Cash History YTD</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={summaryHistoryYtd} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
          </div>

        </>
      )}
    </div>
  )
}
