import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './PageStyles.css'
import { fetchAccountDetails } from '../services/api'
import type { AccountDetail } from '../models/account'
import { formatCurrency } from '../utils/formatCurrency'
import { useAccounts } from '../hooks/useAccounts'

export default function DashboardPage() {
  const [accountDetails, setAccounts] = useState<AccountDetail[]>([])
  const { dispatch } = useAccounts()

  useEffect(() => {
    fetchAccountDetails().then(
      data => {
        if (data) {
          // only show active accounts
          const active = data.filter(d => d.account.active)
          active.sort((a, b) => (b.summary.totalCash + b.summary.totalPositionsValue) - (a.summary.totalCash + a.summary.totalPositionsValue))
          setAccounts(active)
          const accounts = data.map(d => {
            return d.account
          })
          accounts.sort((a, b) => a.accountName.localeCompare(b.accountName))
          dispatch({ type: 'SET_ACCOUNTS', payload: accounts })
        }
      }
    ).catch(console.error)
  }, [])

  const totalCash = accountDetails.reduce((sum, account) => sum + (account.summary.totalCash ?? 0), 0)
  const totalValue = totalCash + accountDetails.reduce((sum, account) => sum + (account.summary.totalPositionsValue ?? 0), 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of accounts and portfolio value.</p>
        </div>
        <Link to="/transactions/new" className="secondary-button">
          Create Transaction
        </Link>
      </div>

      <section className="summary-grid">
        <div className="summary-card">
          <h2>Total cash</h2>
          <div className="summary-value">{formatCurrency(totalCash)}</div>
        </div>
        <div className="summary-card">
          <h2>Portfolio value</h2>
          <div className="summary-value">{formatCurrency(totalValue)}</div>
        </div>
      </section>

      <section className="cards-grid">
        {accountDetails.map((account) => (
          <article key={account.accountId} className="account-card">
            <div className="card-header">
              <h3>{account.account.accountName}</h3>
              <span className="tag">{account.account.accountType}</span>
            </div>
            <p>{account.account.brokerName || 'Broker not set'}</p>
            <dl className="account-stats">
              <div>
                <dt>Cash balance</dt>
                <dd>{formatCurrency(account.summary.totalCash)}</dd>
              </div>
              <div>
                <dt>Total value</dt>
                <dd>{formatCurrency(account.summary.totalPositionsValue + account.summary.totalCash)}</dd>
              </div>
            </dl>
            <Link to={`/accounts/${account.accountId}`} className="link-button">
              View details
            </Link>
          </article>
        ))}
      </section>
    </div>
  )
}
