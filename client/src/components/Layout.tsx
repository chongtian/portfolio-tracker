import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'
import './Layout.css'
import { useGlobalLoading } from '../hooks/LoadingContext';

export default function Layout() {
  const { isLoading } = useGlobalLoading();
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        {isLoading &&
          <div className="progress-bar-container">
            <div className="progress-bar" />
          </div>
        }
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
