import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTransactions } from '../services/api'
import './PageStyles.css'
import { OptionMultipler, type TransactionEntity } from '../models/transaction'
import type { QueryResult } from '../models/types'
import type { SubmitEvent } from 'react'
import { formatCurrency } from '../utils/formatCurrency'
import { useAccounts } from '../hooks/useAccounts'
import { useGlobalLoading } from '../hooks/LoadingContext'

interface TransactionPreview {
  transactionId: string; // SK of the transaction
  txnDate: string
  accountName: string
  description: string; // build from the transaction
  amount?: number; // from transaction
  note: string
}

function getTransactionPreview(txn: TransactionEntity, accountMap: Map<string, string>): TransactionPreview {
  const txnPreview: TransactionPreview = {
    transactionId: txn.SK,
    txnDate: txn.txnDate,
    accountName: accountMap.get(txn.accountId) ?? 'Loading...',
    note: txn.note || '',
    description: ''
  }

  if (txn.assetType === 'STOCK') {
    if (txn.transactionType === 'BUY' || txn.transactionType === 'SELL') {
      txnPreview.description = `${txn.transactionType} ${txn.quantity} shares of ${txn.instrumentId} at ${txn.price}`
      txnPreview.amount = txn.amount
    }

    if (txn.transactionType === 'DIVIDEND') {
      txnPreview.description = `Dividend from ${txn.instrumentId}, total amount is ${txn.amount}`
      txnPreview.amount = txn.amount
    }

    if (txn.transactionType === 'SPLIT') {
      txnPreview.description = `Split ${txn.instrumentId} with ratio ${txn.splitRatio}`
    }

  }

  if (txn.assetType === 'OPTION') {
    txnPreview.description = `${txn.transactionType} ${txn.quantity} contract of ${txn.instrumentId} at ${txn.price}`
    // some records from migration has the amount already multiplied by 100
    if ((txn.price || 0) * (txn.quantity || 0) === txn.amount) {
      txnPreview.amount = (txn.amount || 0) * OptionMultipler
    } else {
      txnPreview.amount = txn.amount || 0
    }
  }

  if (txn.assetType === 'CASH') {
    txnPreview.description = `Cash ${txn.transactionType}`
    txnPreview.amount = txn.amount
  }

  return txnPreview
}

export default function TransactionSearchPage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const { state } = useAccounts()
  const { accounts, loading } = state
  if (loading) {
    startLoading()
  } else {
    stopLoading()
  }
  const [queryResult, setTransactions] = useState<QueryResult<TransactionEntity>>({ items: [], hasMore: false })
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loadingTxn, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accountMap = useMemo(() => {
    return new Map(accounts.map(a => [a.accountId, a.accountName]))
  }, [accounts])

  const PAGE_SIZE = 25
  const loaderRef = useRef(null);

  const loadTransactions = async (nextToken?: string, append = false) => {
    try {
      startLoading()

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      
      const result = await fetchTransactions(startDate || undefined, endDate || undefined, PAGE_SIZE, nextToken)

      if (append) {
        setTransactions(prev => ({
          items: [...prev.items, ...result.items],
          hasMore: result.hasMore,
          nextToken: result.nextToken,
        }))
      } else {
        setTransactions(result)
      }
    } catch (err) {
      console.error(err)
      setError('Unable to load transactions. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
      stopLoading()
    }
  }

  const handleSearchSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    await loadTransactions(undefined, false)
  }

  // const handleLoadMore = async () => {
  //   if (!queryResult.nextToken) {
  //     return
  //   }

  //   await loadTransactions(queryResult.nextToken, true)
  // }


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadTransactions(queryResult.nextToken, true)
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current)
      }
    };
  }, [loaderRef.current, queryResult])


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const txnResult = await fetchTransactions(undefined, undefined, PAGE_SIZE)
        setTransactions(txnResult)
      } catch (err) {
        console.error(err)
        setError('Unable to load transactions or accounts. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
        </div>
        <Link to="/transactions/new" className="secondary-button">
          Create Transaction
        </Link>
      </div>

      <form className="table-card" onSubmit={handleSearchSubmit} style={{ marginBottom: '1rem' }}>
        <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            Start date
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            End date
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </label>
          <button type="submit" className="link-button" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error ? (
        <div className="table-card" style={{ color: 'var(--danger)' }}>{error}</div>
      ) : null}

      <div className="table-card">
        <table className="min-w-full block md:table">
          <thead className="hidden md:table-header-group">
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Transaction Description</th>
              <th>Amount</th>
              <th>Note</th>
              <th />
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {queryResult.items.length === 0 && !loadingTxn ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>
                  No transactions found.
                </td>
              </tr>
            ) : null}
            {queryResult.items.map(txn => {
              const transaction = getTransactionPreview(txn, accountMap)

              return (
                <tr key={transaction.transactionId} className="block md:table-row border-b mb-4 md:mb-0">
                  <td className="flex justify-start gap-2 md:table-cell px-4 py-2 whitespace-nowrap"><span className="font-bold md:hidden text-gray-700">Date</span> {transaction.txnDate}</td>
                  <td className="flex justify-start gap-2 md:table-cell px-4 py-2"><span className="font-bold md:hidden text-gray-700">Account</span>{transaction.accountName}</td>
                  <td className="flex justify-start gap-2 md:table-cell px-4 py-2"><span className="font-bold md:hidden text-gray-700">Detail</span>{transaction.description}</td>
                  <td className="flex justify-start gap-2 md:table-cell px-4 py-2"><span className="font-bold md:hidden text-gray-700">Amount</span>{formatCurrency(transaction.amount)}</td>
                  <td className="flex justify-start gap-2 md:table-cell px-4 py-2"><span className="font-bold md:hidden text-gray-700">Note</span>{transaction.note}</td>
                  <td className="flex justify-start gap-2 md:table-cell px-4 py-2">
                    <Link className="link-button" to={`/transactions/${transaction.transactionId}`} state={{ transaction: txn }}>
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {queryResult.hasMore ? (
        <div style={{ padding: '1rem' }}>
          {/* <button className="link-button" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading more...' : 'Load more transactions'}
          </button> */}
          <div ref={loaderRef} style={{ height: "50px", textAlign: "center" }}>
            {loadingMore ? 'Loading more...' : 'Load more transactions'}
          </div>
        </div>
      ) : null}
    </div>
  )
}
