import React, { createContext, useReducer, useEffect, useContext } from 'react'
import type { ReactNode } from 'react'
import type { AccountEntity } from '../models/account'
import { fetchAccounts } from '../services/api'
import { useAuth } from './useAuth'
import { useGlobalLoading } from './LoadingContext'

interface AccountState {
    accounts: AccountEntity[]
}

type AccountAction =
    | { type: 'SET_ACCOUNTS'; payload: AccountEntity[] }
    | { type: 'ADD_ACCOUNT'; payload: AccountEntity }
    | { type: 'UPDATE_ACCOUNT'; payload: AccountEntity }
    | { type: 'CLEAR_CACHE' }
    | { type: 'REMOVE_ACCOUNT'; payload: string }
    | { type: 'SET_LOADING' }

interface AccountContextType {
    state: AccountState
    dispatch: React.Dispatch<AccountAction>
    refreshAccounts: () => Promise<void>
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

function accountReducer(state: AccountState, action: AccountAction): AccountState {
    switch (action.type) {
        case 'SET_ACCOUNTS':
            return { ...state, accounts: action.payload }
        case 'ADD_ACCOUNT':
            return { ...state, accounts: [...state.accounts, action.payload] }
        case 'UPDATE_ACCOUNT':
            return {
                ...state,
                accounts: state.accounts.map(acc =>
                    acc.accountId === action.payload.accountId ? action.payload : acc
                )
            }
        case 'REMOVE_ACCOUNT':
            return {
                ...state,
                accounts: state.accounts.filter(acc => acc.accountId !== action.payload)
            }

        case 'CLEAR_CACHE':
            return { accounts: [] }
        default:
            return state
    }
}

export function AccountProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(accountReducer, { accounts: [] })
    const { isAuthenticated } = useAuth()
    const { startLoading, stopLoading } = useGlobalLoading()

    useEffect(() => {
        if (isAuthenticated) {
            const initFetch = async () => {
                try {
                    startLoading()
                    const data = await fetchAccounts()
                    data.sort((a, b) => a.accountName.localeCompare(b.accountName))
                    dispatch({ type: 'SET_ACCOUNTS', payload: data })
                } catch (err) {
                    console.error(err)
                } finally {
                    stopLoading()
                }
            }
            initFetch()
        } else {
            dispatch({ type: 'CLEAR_CACHE' })
        }
    }, [isAuthenticated])

    const refreshAccounts = async () => {
        startLoading()
        const data = await fetchAccounts()
        stopLoading()
        dispatch({ type: 'SET_ACCOUNTS', payload: data })
    }

    return (
        <AccountContext.Provider value={{ state, dispatch, refreshAccounts }}>
            {children}
        </AccountContext.Provider>
    )
}

export const useAccounts = () => {
    const context = useContext(AccountContext)

    if (!context) {
        throw new Error('useAccounts must be used within an AccountProvider')
    }

    return context
}
