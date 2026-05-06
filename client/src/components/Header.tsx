import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { fullName, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleMenu = () => {
    console.log('toggleMenu called')
    setMenuOpen((open) => !open)
  }

  return (
    <header className="relative bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
      <div className="flex flex-col">
        <div className="text-lg font-bold">Portfolio Tracker</div>
      </div>

      <button
        className="md:hidden bg-gray-100 p-2 rounded flex flex-col space-y-1"
        type="button"
        onClick={toggleMenu}
        aria-label="Toggle navigation"
      >
        <span className="w-6 h-1 bg-gray-600"></span>
        <span className="w-6 h-1 bg-gray-600"></span>
        <span className="w-6 h-1 bg-gray-600"></span>
      </button>

      <nav
        className={[
          menuOpen ? 'flex' : 'hidden',                 // mobile toggle
          'absolute top-full left-0 right-0 z-10',      // mobile dropdown
          'flex-col space-y-2 p-4 bg-white border-b border-gray-200',
          'md:static md:z-auto md:flex md:flex-row md:space-y-0 md:space-x-6 md:p-0 md:bg-transparent md:border-0',
        ].join(' ')}
      >
        <NavLink
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => `block py-2 px-3 rounded-lg ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          to="/dashboard"
        >
          Dashboard
        </NavLink>
        <NavLink
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => `block py-2 px-3 rounded-lg ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          to="/accounts"
        >
          Accounts
        </NavLink>
        <NavLink
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => `block py-2 px-3 rounded-lg ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          to="/net-worth"
        >
          Global Net Worth
        </NavLink>
        <NavLink
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => `block py-2 px-3 rounded-lg ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          to="/transactions"
        >
          Transactions
        </NavLink>
        <NavLink
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => `block py-2 px-3 rounded-lg ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          to="/summarize"
        >
          Summarize
        </NavLink>
      </nav>

      <div className="flex items-center space-x-4">
        <span className="text-gray-700">{fullName || 'Guest'}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Log out
        </button>
      </div>
    </header>
  )
}
