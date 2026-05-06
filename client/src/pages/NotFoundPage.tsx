import { Link } from 'react-router-dom'
import './PageStyles.css'

export default function NotFoundPage() {
  return (
    <div className="page page-center">
      <div className="auth-card">
        <h1>Page not found</h1>
        <p>
          <Link to="/dashboard" className="primary-button">
            Go to dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}
