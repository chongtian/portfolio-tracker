import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAccountDetails } from '../services/api'
import './PageStyles.css'
import type { AccountDetail } from '../models/account'
import { formatCurrency } from '../utils/formatCurrency'
import { useAccounts } from '../hooks/useAccounts'
import { sortPositions } from '../utils/sortPositions'

export default function AccountListPage() {
  const [accounts, setAccounts] = useState<AccountDetail[]>([])
  const { dispatch } = useAccounts()

  useEffect(() => {
    fetchAccountDetails().then(
      data => {
        if (data) {
          data.sort((a, b) => (b.summary.totalCash + b.summary.totalPositionsValue) - (a.summary.totalCash + a.summary.totalPositionsValue))
          data?.forEach(d=>d.positions.sort(sortPositions))
          setAccounts(data)
          const accounts = data.map(d => {
            return d.account
          })
          dispatch({ type: 'SET_ACCOUNTS', payload: accounts })
        }
      }
    ).catch(console.error)
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Accounts</h1>
          <p>List all accounts in your portfolio.</p>
        </div>
        <Link to="/accounts/new" className="primary-button">
          Create account
        </Link>
      </div>

      <div className="table-card">
        <table className="min-w-full block md:table">
          <thead className="hidden md:table-header-group">
            <tr>
              <th>Name</th>
              <th>Broker</th>
              <th>Type</th>
              <th>Cash</th>
              <th>Total Value</th>
              <th />
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {accounts.map((account) => (
              <tr key={account.accountId} className="block md:table-row border-b mb-4 md:mb-0">
                <td className="flex justify-start gap-2 md:table-cell px-4 py-2"> <span className="font-bold md:hidden text-gray-700">Name</span>
                  {account.account.accountName}</td>
                <td className="flex justify-start gap-2 md:table-cell px-4 py-2"> <span className="font-bold md:hidden text-gray-700">Broker</span>
                  {account.account.brokerName || '-'}</td>
                <td className="flex justify-start gap-2 md:table-cell px-4 py-2"> <span className="font-bold md:hidden text-gray-700">Type</span>
                  {account.account.accountType}</td>
                <td className="flex justify-start gap-2 md:table-cell px-4 py-2"> <span className="font-bold md:hidden text-gray-700">Cash</span>
                  {formatCurrency(account.summary.totalCash)}</td>
                <td className="flex justify-start gap-2 md:table-cell px-4 py-2"> <span className="font-bold md:hidden text-gray-700">Total Value</span>
                  {formatCurrency(account.summary.totalCash + account.summary.totalPositionsValue)}</td>
                <td className="flex justify-start gap-2 md:table-cell px-4 py-2">
                  <Link to={`/accounts/${account.accountId}`} state={{ account: account }} className="link-button">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
