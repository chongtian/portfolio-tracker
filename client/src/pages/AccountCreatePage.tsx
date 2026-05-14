import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveAccount } from '../services/api'
import './PageStyles.css'
import { ConfirmMessage } from '../utils/constants'
import { useAccounts } from '../hooks/useAccounts'
import { useGlobalLoading } from '../hooks/LoadingContext'

export default function AccountCreatePage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const { dispatch } = useAccounts()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    accountName: '',
    brokerName: '',
    accountNumber: '',
    accountType: 'TAXABLE',
    baseCurrency: 'USD',
    active: true
  })
  const [error, setError] = useState('')

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    if (!confirm(ConfirmMessage)) {
      return
    }

    event.preventDefault()

    if (!form.accountName.trim()) {
      setError('Account name is required.')
      return
    }

    startLoading()
    saveAccount(form).then(
      newAccount => {
        dispatch({ type: 'ADD_ACCOUNT', payload: newAccount })
        // AccountEditPage always read account from api. this ensures the account is truly created.
        navigate(`/accounts/${newAccount.accountId}/edit`)
      }
    ).catch(
      err => {
        console.error(err)
        setError('Unable to create account. Please try again.')
      }
    ).finally(stopLoading)

  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Create account</h1>
          <p>Enter account metadata to connect a new portfolio account.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <label>
          Account Name
          <input name="accountName" value={form.accountName} onChange={handleChange} required />
        </label>

        <label>
          Broker Name
          <input name="brokerName" value={form.brokerName} onChange={handleChange} />
        </label>

        <label>
          Account Number
          <input name="accountNumber" value={form.accountNumber} onChange={handleChange} />
        </label>

        <label>
          Account type
          <select name="accountType" value={form.accountType} onChange={handleChange}>
            <option value="TAXABLE">Taxable</option>
            <option value="IRA">IRA</option>
            <option value="401K">401K</option>
            <option value="HSA">HSA</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label>
          Currency
          <input name="baseCurrency" value={form.baseCurrency} onChange={handleChange} />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="primary-button">
          Save account
        </button>
      </form>
    </div>
  )
}
