import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ulid } from 'ulid'
import { createTransaction } from '../services/api'
import './PageStyles.css'
import { OptionMultipler } from '../models/transaction'
import { ConfirmMessage, ErrorMessageFailSaveTxn, ErrorMessageMissingAccount } from '../utils/constants'
import { useAccounts } from '../hooks/useAccounts'
import { useGlobalLoading } from '../hooks/LoadingContext'

const assetTypes = ['STOCK', 'OPTION', 'CASH']
const stockTypes = ['BUY', 'SELL', 'DIVIDEND', 'SPLIT']
const optionTypes = ['BUY', 'SELL']
const cashTypes = ['INTEREST', 'DEPOSIT', 'WITHDRAW', 'ADJUST']

interface OptionContractForm {
  underlying: string
  expiration: string
  callPut: 'C' | 'P'
  strike: string
}

function buildOptionInstrumentId(contract: OptionContractForm) {
  const underlying = contract.underlying.trim().toUpperCase()
  const expiration = contract.expiration.replace(/-/g, '').slice(2)
  const strike = Number(contract.strike || 0)
  const strikeValue = strike.toFixed(3).replace('.', '')
  const paddedStrike = strikeValue.padStart(8, '0')
  return `${underlying}${expiration}${contract.callPut}${paddedStrike}`
}

export default function TransactionCreatePage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const { state } = useAccounts()
  const { accounts } = state
  const [step, setStep] = useState(1)
  const [assetType, setAssetType] = useState<typeof assetTypes[number]>('STOCK')
  const [transactionType, setTransactionType] = useState<string>('BUY')
  const [optionContract, setOptionContract] = useState<OptionContractForm>({
    underlying: '',
    expiration: new Date().toISOString().slice(0, 10),
    callPut: 'P',
    strike: '0',
  })
  const [form, setForm] = useState({
    txnId: '',
    txnDate: new Date().toISOString().slice(0, 10),
    accountId: '',
    quantity: 0,
    price: 0,
    amount: 0,
    fees: 0,
    currency: 'USD',
    note: '',
    instrumentId: '',
    splitRatio: 1,
    cashCollateral: 0,
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!form.txnId) {
      setForm((current) => ({ ...current, txnId: ulid() }))
    }
  }, [form.txnId])

  useEffect(() => {
    const amount = assetType === 'STOCK' && transactionType === 'SPLIT' ? 0 : form.price * form.quantity
    setForm((current) => ({ ...current, amount }))
  }, [form.price, form.quantity, assetType, transactionType])

  useEffect(() => {
    if (assetType === 'CASH') {
      setForm((current) => ({ ...current, instrumentId: '_CASH', quantity: 1 }))
    }
  }, [assetType])

  useEffect(() => {
    if (transactionType === 'DIVIDEND') {
      setForm((current) => ({ ...current, quantity: 1 }))
    }
  }, [transactionType])

  useEffect(() => {
    if (assetType === 'OPTION') {
      const instrumentId = buildOptionInstrumentId(optionContract)
      setForm((current) => ({ ...current, instrumentId }))
    }
  }, [assetType, optionContract])

  useEffect(() => {
    if (assetType === 'OPTION' && transactionType === 'SELL' && optionContract.callPut === 'P') {
      const strike = Number(optionContract.strike || 0)
      setForm((current) => ({ ...current, cashCollateral: strike * current.quantity * OptionMultipler }))
    }
  }, [assetType, transactionType, optionContract.callPut, optionContract.strike, form.quantity])

  useEffect(() => {
    // Reset transaction type to a valid option when asset type changes
    if (assetType === 'CASH') {
      setTransactionType('INTEREST')
    } else if (assetType === 'OPTION') {
      setTransactionType('BUY')
      setForm((current) => ({ ...current, instrumentId: '' }))
    } else {
      setTransactionType('BUY')
      setForm((current) => ({ ...current, instrumentId: '' }))
    }
  }, [assetType])

  const transactionOptions = useMemo(() => {
    if (assetType === 'STOCK') return stockTypes
    if (assetType === 'OPTION') return optionTypes
    return cashTypes
  }, [assetType])

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const value = event.target.type === 'number' ? Number(event.target.value) : event.target.value
    setForm({ ...form, [event.target.name]: value })
  }

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.name === 'callPut' ? (event.target.value as 'C' | 'P') : event.target.value
    setOptionContract({ ...optionContract, [event.target.name]: value })
  }

  const handleNext = () => {
    if (step === 1 && !form.accountId) {
      setError(ErrorMessageMissingAccount)
      return
    }

    setError('')
    setStep((current) => Math.min(current + 1, 3))
  }

  const handleBack = () => {
    setError('')
    setStep((current) => Math.max(current - 1, 1))
  }

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    if (!confirm(ConfirmMessage)) {
      return
    }

    event.preventDefault()
    if (!form.accountId) {
      setError(ErrorMessageMissingAccount)
      return
    }

    if (!form.txnId) {
      form.txnId = ulid()
    }

    startLoading()
    createTransaction({
      ...form,
      assetType,
      transactionType,
      instrumentId: assetType === 'CASH' ? '_CASH' : form.instrumentId,
    }).then(txn => {
      if (txn && txn.SK) {
        navigate(`/transactions/${encodeURIComponent(txn.SK)}`)
      } else {
        setError(ErrorMessageFailSaveTxn)
      }
    }).catch(err => {
      console.error(err)
      setError(ErrorMessageFailSaveTxn)
    }).finally(stopLoading)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Create transaction</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="wizard-step">
          <div className={`wizard-pill ${step === 1 ? 'active' : ''}`}>1. Asset</div>
          <div className={`wizard-pill ${step === 2 ? 'active' : ''}`}>2. Details</div>
          <div className={`wizard-pill ${step === 3 ? 'active' : ''}`}>3. Review</div>
        </div>

        {step === 1 && (
          <>
            <label>
              Asset type
              <select name="assetType" value={assetType} onChange={(event) => setAssetType(event.target.value as typeof assetTypes[number])}>
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Transaction type
              <select name="transactionType" value={transactionType} onChange={(event) => setTransactionType(event.target.value)}>
                {transactionOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Account
              <select name="accountId" value={form.accountId} onChange={handleChange}>
                <option value="">Select account</option>
                {accounts.filter(a => a.active).map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.accountName}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <label>
              Transaction ID
              <input name="txnId" value={form.txnId} onChange={handleChange} />
            </label>

            <label>
              Transaction date
              <input name="txnDate" type="date" value={form.txnDate} onChange={handleChange} />
            </label>

            {assetType !== 'CASH' && (
              <label>
                Instrument ID
                <input name="instrumentId" value={form.instrumentId} onChange={handleChange} />
              </label>
            )}

            {assetType === 'OPTION' && (
              <fieldset className="option-builder">
                <legend>Option contract builder</legend>

                <label>
                  Underlying
                  <input name="underlying" value={optionContract.underlying} onChange={handleOptionChange} />
                </label>

                <label>
                  Expiration
                  <input name="expiration" type="date" value={optionContract.expiration} onChange={handleOptionChange} />
                </label>

                <label>
                  Call / Put
                  <select name="callPut" value={optionContract.callPut} onChange={handleOptionChange}>
                    <option value="C">Call</option>
                    <option value="P">Put</option>
                  </select>
                </label>

                <label>
                  Strike
                  <input name="strike" type="number" step="0.001" value={optionContract.strike} onChange={handleOptionChange} />
                </label>

                <p className="hint-text">Generated ID: {form.instrumentId || 'Enter contract details'}</p>
              </fieldset>
            )}

            {assetType === 'STOCK' && transactionType === 'SPLIT' && (
              <label>
                Split ratio
                <input name="splitRatio" value={form.splitRatio} onChange={handleChange} />
              </label>
            )}

            <label>
              Quantity
              <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleChange} />
            </label>

            <label>
              Price
              <input name="price" type="number" value={form.price} onChange={handleChange} />
            </label>

            <label>
              Amount
              <input name="amount" type="number" value={form.amount} readOnly />
            </label>

            {assetType === 'OPTION' && transactionType === 'SELL' && optionContract.callPut === 'P' && (
              <label>
                Cash collateral
                <input name="cashCollateral" type="number" value={form.cashCollateral} readOnly />
              </label>
            )}

            <label>
              Fees
              <input name="fees" type="number" value={form.fees} onChange={handleChange} />
            </label>

            <label>
              Currency
              <input name="currency" value={form.currency} onChange={handleChange} />
            </label>

            <label>
              Note
              <textarea name="note" value={form.note} onChange={handleChange} />
            </label>
          </>
        )}

        {step === 3 && (
          <div className="review-card">
            <h2>Review transaction</h2>
            <dl>
              <div>
                <dt>Asset type</dt>
                <dd>{assetType}</dd>
              </div>
              <div>
                <dt>Transaction type</dt>
                <dd>{transactionType}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{accounts.find((account) => account.accountId === form.accountId)?.accountName ?? 'Unknown'}</dd>
              </div>
              <div>
                <dt>Transaction ID</dt>
                <dd>{form.txnId}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{form.txnDate}</dd>
              </div>
              <div>
                <dt>Instrument</dt>
                <dd>{assetType === 'CASH' ? '_CASH' : form.instrumentId}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{form.quantity}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>${form.price.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>${form.amount.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Fees</dt>
                <dd>${form.fees.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{form.currency}</dd>
              </div>
              {form.note && (
                <div>
                  <dt>Note</dt>
                  <dd>{form.note}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          {step > 1 && (
            <button type="button" className="secondary-button" onClick={handleBack}>
              Back
            </button>
          )}
          {step < 3 && (
            <button type="button" className="secondary-button" onClick={handleNext}>
              Continue
            </button>
          )}
          {step === 3 && (
            <button type="submit" className="primary-button">
              Submit transaction
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
