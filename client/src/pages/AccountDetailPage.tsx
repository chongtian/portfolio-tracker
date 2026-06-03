import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { fetchAccountDetail, fetchPnL, fetchSummaryHistory } from '../services/api'
import './PageStyles.css'
import type { AccountDetail } from '../models/account'
import type { SummaryEntity } from '../models/summary'
import type { PnLEntity } from '../models/pnl'
import { sortPositions } from '../utils/sortPositions'
import { useGlobalLoading } from '../hooks/LoadingContext'
import SummaryCard from '../components/SummaryCard'
import PositionCard from '../components/PositionsCard'
import PositionPieChart from '../components/PositionPieChart'
import CashLineChart from '../components/CashLineChart'

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

    return [
      ...positions,
      { name: 'Cash', value: account.summary.totalCash },
    ]
  }, [account])

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
          <SummaryCard summary={account.summary} pnl={pnl} />
          <PositionCard positions={account.positions} />

          <div className="chart-grid">
            <PositionPieChart data={pieDataValue} title={"Value breakdown"} />
          </div>

          <div className="chart-grid">
            <CashLineChart data={summaryHistory} ytd={false} />
            <CashLineChart data={summaryHistory} ytd={true} />
          </div>

        </>
      )}
    </div>
  )
}
