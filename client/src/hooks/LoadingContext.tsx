// LoadingContext.js
import { createContext, useContext, useState, type ReactNode } from "react"

interface GlobalLoadingState {
    isLoading: boolean
    startLoading: () => void
    stopLoading: () => void
}

const LoadingContext = createContext<GlobalLoadingState | undefined>(undefined);

export const useLoading = () => useContext(LoadingContext)

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
    const [loadingCount, setLoadingCount] = useState(0)

    const startLoading = () => setLoadingCount(c => c + 1)
    const stopLoading = () => setLoadingCount(c => Math.max(0, c - 1))

    const isLoading = loadingCount > 0

    return (
        <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useGlobalLoading = () => {
    const context = useContext(LoadingContext)

    if (!context) {
        throw new Error('useAccounts must be used within an LoadingProvider')
    }

    return context
}