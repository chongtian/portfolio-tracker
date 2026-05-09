import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AccountListPage from './pages/AccountListPage'
import AccountCreatePage from './pages/AccountCreatePage'
import AccountDetailPage from './pages/AccountDetailPage'
import AccountEditPage from './pages/AccountEditPage'
import GlobalSummaryPage from './pages/GlobalSummaryPage'
import TransactionCreatePage from './pages/TransactionCreatePage'
import TransactionSearchPage from './pages/TransactionSearchPage'
import TransactionViewPage from './pages/TransactionViewPage'
import SummarizationPage from './pages/SummarizationPage'
import NotFoundPage from './pages/NotFoundPage'
import { AccountProvider } from './hooks/useAccounts'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div>Checking session...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="accounts" element={<AccountListPage />} />
              <Route path="accounts/new" element={<AccountCreatePage />} />
              <Route path="accounts/:id" element={<AccountDetailPage />} />
              <Route path="accounts/:id/edit" element={<AccountEditPage />} />
              <Route path="globalsummary" element={<GlobalSummaryPage />} />
              <Route path="transactions/new" element={<TransactionCreatePage />} />
              <Route path="transactions" element={<TransactionSearchPage />} />
              <Route path="transactions/:id" element={<TransactionViewPage />} />
              <Route path="summarize" element={<SummarizationPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* optional public 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AccountProvider>
    </AuthProvider>
  )
}

export default App
