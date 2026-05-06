import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'
import './Layout.css'

export default function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
