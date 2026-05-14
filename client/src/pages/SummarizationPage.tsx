import { useMemo, useState } from 'react'
import { triggerSummarization } from '../services/api'
import './PageStyles.css'
import { useAccounts } from '../hooks/useAccounts'
import { useGlobalLoading } from '../hooks/LoadingContext'

export default function SummarizationPage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const { state } = useAccounts()
  const { accounts, loading } = state
  if (loading) {
    startLoading()
  } else {
    stopLoading()
  }
  const accountMap = useMemo(() => {
    return new Map(accounts.map(a => [a.accountId, a.accountName]))
  }, [accounts])

  const [status, setStatus] = useState('idle')
  const [messages, setMessage] = useState([] as string[])

  const handleTrigger = async () => {
    const confirm = window.confirm('This will trigger a back-end summarization process. Continue?')
    if (!confirm) return

    setStatus('pending')
    setMessage(['Running summarization...'])

    triggerSummarization().then(
      messages => {
        const message = ['Summarization has been triggered.']
        for (const [key, value] of Object.entries(messages)) {
          const msgs = value.split('\n').map(m => `${accountMap.get(key) || 'Unknown'}: ${m}`)
          message.push(...msgs)
        }
        setStatus('success')
        setMessage(message)
      }
    ).catch(
      err => {
        console.error(err)
        setStatus('error')
        setMessage(['Unable to trigger summarization.'])
      }
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Manual summarization</h1>
          <p>Trigger the backend position summarization process on demand.</p>
        </div>
      </div>

      <div className="form-card">
        <p>
          Use this action only when you need to refresh derived account summaries and positions immediately.
        </p>
        <button type="button" className="danger-button" onClick={handleTrigger}>
          Trigger summarization
        </button>
        {messages && <div className={`status-message ${status}`}>{messages.map(m => (<p>{m}</p>))}</div>}
      </div>
    </div>
  )
}
