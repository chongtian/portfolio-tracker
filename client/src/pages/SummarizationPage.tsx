import { useMemo, useState } from 'react'
import { fetchLogsForSummarization, triggerSummarization } from '../services/api'
import './PageStyles.css'
import { useAccounts } from '../hooks/useAccounts'
import { useGlobalLoading } from '../hooks/LoadingContext'

export default function SummarizationPage() {
  const { startLoading, stopLoading } = useGlobalLoading()
  const { state } = useAccounts()
  const { accounts } = state

  const accountMap = useMemo(() => {
    return new Map(accounts.map(a => [a.accountId, a.accountName]))
  }, [accounts])

  const [status, setStatus] = useState('idle')
  const [messages, setMessage] = useState([] as string[])

  useState(() => {
    startLoading()
    fetchLogsForSummarization().then(
      data => {
        // there shall be only one log
        if (data && data[0]) {
          const log = data[0]
          const message = []
          message.push(`source: ${log.source}`, `last run: ${(new Date(log.createdAt)).toLocaleString()}`, `isProcessing: ${log.isProcessing ?? false}`)
          if (log.logs) {
            for (const [key, value] of Object.entries(log.logs)) {
              const msgs = value.split('\n').map(m => `${accountMap.get(key) || 'Unknown'}: ${m}`)
              message.push(...msgs)
            }
          }
          setMessage(message)
        }
      }
    ).catch(
      err => {
        console.error(err)
      }
    ).finally(stopLoading)
  })

  const handleTrigger = async () => {
    const confirm = window.confirm('This will trigger a back-end summarization process. Continue?')
    if (!confirm) return

    setStatus('pending')
    setMessage(['Running summarization...'])

    startLoading()
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
    ).finally(stopLoading)
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
