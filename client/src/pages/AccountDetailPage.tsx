import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { fetchAccountDetail, fetchCashHistory } from '../services/api'
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
import type { CashEntity } from '../models/cash'

const chartColors = pieChartColors

export default function AccountDetailPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const entity = state?.account

  const [account, setAccount] = useState<AccountDetail | null>(entity)
  const [cashHistory, setCashHistory] = useState<CashEntity[] | undefined>()

  useEffect(() => {
    if (!id) {
      return
    }

    if (!entity) {
      fetchAccountDetail(id).then(setAccount).catch(console.error)
    }

    const endDateStr = (new Date()).toISOString().slice(0, 10)
    const startDateStr = (new Date(new Date().setFullYear(new Date().getFullYear() - 1))).toISOString().slice(0, 10)
    fetchCashHistory(id, startDateStr, endDateStr).then(data => {
      setCashHistory(data.items.sort((a, b) => (a.asOfDate || '0000-00-00').localeCompare(b.asOfDate || '0000-00-00')))
    }).catch(console.error)

  }, [entity, id])

  const pieData = useMemo(() => {
    if (!account) return []

    const positions = account.positions.map((position) => ({
      name: position.instrumentId,
      value: position.marketValue,
    }))

    return cleanUpPieData([
      ...positions,
      { name: 'Cash', value: account.summary.totalCash },
    ], chartColors.length)
  }, [account])

  const cashHistory1yr = cashHistory?.reduce<{ name: string; delta: number }[]>((acc, point) => {
    const prev = acc.length ? acc[acc.length - 1].delta : 0;
    acc.push({
      name: point.asOfDate || '0000-00-00',
      delta: prev + point.balance,
    });
    return acc;
  }, [])
  const cashHistoryYtd = cashHistory?.filter(h => (h.asOfDate || '0000-00-00') >= `${(new Date()).getFullYear()}-01-01`)
    .reduce<{ name: string; delta: number }[]>((acc, point) => {
      const prev = acc.length ? acc[acc.length - 1].delta : 0;
      acc.push({
        name: point.asOfDate || '0000-00-00',
        delta: prev + point.balance,
      });
      return acc;
    }, [])
  const balHistory1yr = cashHistory?.reduce<{ name: string; delta: number }[]>((acc, point) => {
    const prev = acc.length ? acc[acc.length - 1].delta : 0;
    acc.push({
      name: point.asOfDate || '0000-00-00',
      delta: prev + (point.availableBalance || 0),
    });
    return acc;
  }, [])
  const balHistoryYtd = cashHistory?.filter(h => (h.asOfDate || '0000-00-00') >= `${(new Date()).getFullYear()}-01-01`)
    .reduce<{ name: string; delta: number }[]>((acc, point) => {
      const prev = acc.length ? acc[acc.length - 1].delta : 0;
      acc.push({
        name: point.asOfDate || '0000-00-00',
        delta: prev + (point.availableBalance || 0),
      });
      return acc;
    }, [])

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
                {account.positions.map((position) => (
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
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h2>Cash Change in 1 year</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cashHistory1yr} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="delta" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h2>Cash Change YTD</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cashHistoryYtd} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="delta" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h2>Available Cash Change in 1 year</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={balHistory1yr} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="delta" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h2>Available Cash Change YTD</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={balHistoryYtd} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="delta" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </>
      )}
    </div>
  )
}
