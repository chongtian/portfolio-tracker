import React, { createContext, useReducer, useEffect, useContext } from 'react'
import type { ReactNode } from 'react'
import type { AccountEntity } from '../models/account'
import { fetchAccounts } from '../services/api'
import { useAuth } from './useAuth'

interface AccountState {
    accounts: AccountEntity[]
    loading: boolean
}

type AccountAction =
    | { type: 'SET_ACCOUNTS'; payload: AccountEntity[] }
    | { type: 'ADD_ACCOUNT'; payload: AccountEntity }
    | { type: 'UPDATE_ACCOUNT'; payload: AccountEntity }
    | { type: 'CLEAR_CACHE' }
    | { type: 'REMOVE_ACCOUNT'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean }

interface AccountContextType {
    state: AccountState
    dispatch: React.Dispatch<AccountAction>
    refreshAccounts: () => Promise<void>
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

function accountReducer(state: AccountState, action: AccountAction): AccountState {
    switch (action.type) {
        case 'SET_ACCOUNTS':
            return { ...state, accounts: action.payload, loading: false }
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
            return { accounts: [], loading: false }
        default:
            return state
    }
}

export function AccountProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(accountReducer, { accounts: [], loading: true })
    const { isAuthenticated } = useAuth()

    useEffect(() => {
        if (isAuthenticated) {
            const initFetch = async () => {
                try {
                    const data = await fetchAccounts()
                    data.sort((a, b) => a.accountName.localeCompare(b.accountName))
                    dispatch({ type: 'SET_ACCOUNTS', payload: data })
                } catch (err) {
                    console.error(err)
                }
            }
            initFetch()
        } else {
            dispatch({ type: 'CLEAR_CACHE' })
        }
    }, [isAuthenticated])

    const refreshAccounts = async () => {
        dispatch({ type: 'SET_LOADING', payload: true })
        const data = await fetchAccounts()
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
