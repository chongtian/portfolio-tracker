import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
// import { forgotPassword, confirmPassword } from '../services/cognitoAuth'

export default function LoginPage() {
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login')
  // const [resetCode, setResetCode] = useState('')
  // const [newPassword, setNewPassword] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    if (!userName.trim() || !password.trim()) {
      setError('Please enter both username and password.')
      setLoading(false)
      return
    }

    const result = await login(userName.trim(), password.trim())
    setLoading(false)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || 'Login failed')
    }
  }

  // const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault()
  //   setError('')
  //   setLoading(true)

  //   if (!userName.trim()) {
  //     setError('Please enter your username.')
  //     setLoading(false)
  //     return
  //   }

  //   const result = await forgotPassword(userName.trim())
  //   setLoading(false)

  //   if (result.success) {
  //     setMode('reset')
  //   } else {
  //     setError(result.message || 'Failed to send reset code')
  //   }
  // }

  // const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault()
  //   setError('')
  //   setLoading(true)

  //   if (!resetCode.trim() || !newPassword.trim()) {
  //     setError('Please enter the code and new password.')
  //     setLoading(false)
  //     return
  //   }

  //   const result = await confirmPassword(userName.trim(), resetCode.trim(), newPassword.trim())
  //   setLoading(false)

  //   if (result.success) {
  //     setMode('login')
  //     setPassword('')
  //     setNewPassword('')
  //     setResetCode('')
  //     setError('Password reset successful. Please log in.')
  //   } else {
  //     setError(result.message || 'Password reset failed')
  //   }
  // }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">
          Sign in Portfolio Tracker
        </h1>
        {/* <h1 className="text-2xl font-bold text-center mb-6">
          {mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Forgot Password' : 'Reset Password'}
        </h1> */}

        {/* {mode === 'login' && ( */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="Enter your username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            {/* <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-full text-blue-600 text-sm hover:underline"
            >
              Forgot your password?
            </button> */}
          </form>
        {/* )} */}

        {/* {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="Enter your username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-blue-600 text-sm hover:underline"
            >
              Back to Login
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reset Code
              </label>
              <input
                type="text"
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value)}
                placeholder="Enter the code from your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter your new password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-blue-600 text-sm hover:underline"
            >
              Back to Login
            </button>
          </form>
        )} */}
      </div>
    </div>
  )
}
