import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { deleteTransaction, fetchTransactionById } from '../services/api'
import './PageStyles.css'
import type { TransactionEntity } from '../models/transaction'
import { ConfirmDeleteMessage } from '../utils/constants'
import { formatCurrency } from '../utils/formatCurrency'
import { useAccounts } from '../hooks/useAccounts'


export default function TransactionViewPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const entity = state?.transaction
  const navigate = useNavigate()
  const [transaction, setTransaction] = useState<TransactionEntity | null>(entity)
  const [error, setError] = useState('')

  const { state: accountData } = useAccounts()
  const { accounts, loading } = accountData
  if (loading) return <div>Loading...</div>

  const accountMap = useMemo(() => {
    return new Map(accounts.map(a => [a.accountId, a.accountName]))
  }, [accounts])

  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      if (!entity) fetchTransactionById(id).then(setTransaction).catch(console.error)
    }
    loadData()
  }, [id])

  const handleDelete = async () => {
    if (!id) return

    const confirmed = window.confirm(ConfirmDeleteMessage)
    if (!confirmed) return

    deleteTransaction(transaction?.SK!).then(
      succesful => {
        if (succesful) {
          navigate('/transactions')
        } else {
          setError('Unable to delete transaction.')
        }
      }
    ).catch(console.error)
  }

  if (!transaction) {
    return <div className="page">Loading transaction…</div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Transaction details</h1>
        </div>
        <button type="button" className="danger-button" onClick={handleDelete}>
          Delete transaction
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="detail-card">
        <dl>
          <div>
            <dt>Transaction ID</dt>
            <dd>{transaction.txnId}</dd>
          </div>
          <div>
            <dt>Transaction Date</dt>
            <dd>{transaction.txnDate}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{accountMap.get(transaction.accountId)}</dd>
          </div>
          <div>
            <dt>Asset type</dt>
            <dd>{transaction.assetType}</dd>
          </div>
          <div>
            <dt>Transaction type</dt>
            <dd>{transaction.transactionType}</dd>
          </div>
          <div>
            <dt>Instrument</dt>
            <dd>{transaction.instrumentId}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{transaction.quantity}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{formatCurrency(transaction.price || 0)}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatCurrency(transaction.amount || 0)}</dd>
          </div>
          <div>
            <dt>Fees</dt>
            <dd>{formatCurrency(transaction.fees)}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{transaction.currency}</dd>
          </div>
          {transaction.splitRatio && (
            <div>
              <dt>Split Ratio</dt>
              <dd>{transaction.splitRatio}</dd>
            </div>
          )}
          {transaction.cashCollateral && (
            <div>
              <dt>Cash Collateral</dt>
              <dd>{formatCurrency(transaction.cashCollateral)}</dd>
            </div>
          )}
          {transaction.note && (
            <div>
              <dt>Note</dt>
              <dd>{transaction.note}</dd>
            </div>
          )}
          <div>
            <dt>Create Date</dt>
            <dd>{transaction.createdAt}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
