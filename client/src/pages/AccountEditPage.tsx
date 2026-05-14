import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchAccount, saveAccount } from '../services/api'
import './PageStyles.css'
import type { AccountEntity } from '../models/account'
import { ConfirmMessage } from '../utils/constants'
import { useAccounts } from '../hooks/useAccounts'
import { useGlobalLoading } from '../hooks/LoadingContext'

export default function AccountEditPage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const { id } = useParams()
  const navigate = useNavigate()
  const [account, setAccount] = useState<AccountEntity | null>(null)
  const [error, setError] = useState('')
  const { dispatch } = useAccounts()

  useEffect(() => {
    if (!id) return
    startLoading()
    fetchAccount(id).then(setAccount).catch(console.error).finally(stopLoading)
  }, [id])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!account) return

    const target = event.target
    let value: string | boolean
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      value = target.checked
    } else {
      value = target.value
    }

    setAccount({ ...account, [event.target.name]: value } as AccountEntity)
  }

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    if (!confirm(ConfirmMessage)) {
      return
    }

    event.preventDefault()
    if (!account) return

    startLoading()
    saveAccount({
      accountName: account.accountName,
      brokerName: account.brokerName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      baseCurrency: account.baseCurrency,
      active: account.active
    }, account.accountId).then(
      updatedAccount => {
        dispatch({ type: 'UPDATE_ACCOUNT', payload: updatedAccount })
        navigate(`/accounts/${id}`)
      }
    ).catch(err => {
      console.error(err)
      setError('Unable to update account. Please try again.')
    }).finally(stopLoading)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Update account</h1>
          <p>Modify account information then save to return to details.</p>
        </div>
      </div>

      {!account ? (
        <div className="info-card">Loading account data…</div>
      ) : (
        <form onSubmit={handleSubmit} className="form-card">
          <label>
            Account Name
            <input name="accountName" value={account.accountName} onChange={handleChange} required />
          </label>

          <label>
            Broker Name
            <input name="brokerName" value={account.brokerName ?? ''} onChange={handleChange} />
          </label>

          <label>
            Account Number
            <input name="accountNumber" value={account.accountNumber ?? ''} onChange={handleChange} />
          </label>

          <label>
            Account type
            <select name="accountType" value={account.accountType} onChange={handleChange}>
              <option value="TAXABLE">Taxable</option>
              <option value="IRA">IRA</option>
              <option value="401K">401K</option>
              <option value="HSA">HSA</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label>
            <span>Active?</span> <input type="checkbox" name="active" checked={account.active ?? false} onChange={handleChange} />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="primary-button">
            Save changes
          </button>
        </form>
      )}
    </div>
  )
}
