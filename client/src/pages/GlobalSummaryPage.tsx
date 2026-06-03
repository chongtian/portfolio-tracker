import { useEffect, useMemo, useState } from 'react'
import { fetchAccountDetails, fetchPnL } from '../services/api'
import type { GlobalDetail } from '../models/types'
import './PageStyles.css'
import { useAccounts } from '../hooks/useAccounts'
import type { PnLEntity } from '../models/pnl'
import { sortPositions } from '../utils/sortPositions'
import { useGlobalLoading } from '../hooks/LoadingContext'
import SummaryCard from '../components/SummaryCard'
import PositionCard from '../components/PositionsCard'
import PositionPieChart from '../components/PositionPieChart'

export default function GlobalSummaryPage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const [summary, setSummary] = useState<GlobalDetail | null>(null)
  const [pnl, setPnl] = useState<PnLEntity[] | null>([])
  const { state } = useAccounts()
  const { accounts } = state

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

    return [
      ...positions,
      { name: 'Cash', value: summary.summary.totalCash },
    ]
  }, [summary])

  const pieDataUnrealizedProfit = useMemo(() => {
    if (!summary) return []

    const positions = summary.positions.filter(p => (p.unrealizedPnl || 0) > 0 && (p.unrealizedPnl || 0) * (p.quantity || 0) > 0).map((position) => ({
      name: position.instrumentId,
      value: Math.abs(position.unrealizedPnl || 0),
    }))

    return positions
  }, [summary])

  const pieDataUnrealizedLoss = useMemo(() => {
    if (!summary) return []

    const positions = summary.positions.filter(p => (p.unrealizedPnl || 0) < 0 && (p.unrealizedPnl || 0) * (p.quantity || 0) < 0).map((position) => ({
      name: position.instrumentId,
      value: Math.abs(position.unrealizedPnl || 0),
    }))

    return positions
  }, [summary])

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
          <SummaryCard summary={summary.summary} pnl={pnl} />
          <PositionCard positions={summary.positions} />

          <div className="chart-grid">
            <PositionPieChart data={pieDataValue} title={"Value breakdown"} />
          </div>

          <div className="chart-grid">
            <PositionPieChart data={pieDataUnrealizedProfit} title={"Unrealized Profit breakdown"} />
          </div>
          <div className="chart-grid">
            <PositionPieChart data={pieDataUnrealizedLoss} title={"Unrealized Loss breakdown"} />
          </div>
        </>
      )}
    </div>
  )
}
