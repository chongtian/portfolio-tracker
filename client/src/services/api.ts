import { API_BASE_URL } from '../config';
import type { AccountDetail, AccountEntity } from '../models/account';
import type { PnLEntity } from '../models/pnl';
import type { SummaryEntity } from '../models/summary';
import type { TransactionEntity } from '../models/transaction';
import type { AccountPayload, QueryResult } from '../models/types'
import { validateOrRefreshSession } from './cognitoAuth';

const apiBase = import.meta.env.VITE_API_BASE_URL || API_BASE_URL

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {

  const valid = await validateOrRefreshSession();

  if (!valid) {
    throw new Error('Session expired');
  }

  const accessToken = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    headers,
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function requestWithoutContent(path: string, init?: RequestInit): Promise<boolean> {

  const valid = await validateOrRefreshSession();

  if (!valid) {
    throw new Error('Session expired');
  }

  const accessToken = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    headers,
    ...init,
  });

  return response.ok;
}

export async function fetchAccounts(): Promise<AccountEntity[]> {
  return jsonRequest<AccountEntity[]>('/accounts');
}

export async function fetchAccountDetails(): Promise<AccountDetail[]> {
  const items = await jsonRequest<AccountDetail[]>('/accounts?summary=true&position=true');
  return items;
}

export async function fetchAccountDetail(accountId: string): Promise<AccountDetail | null> {
  const items = await jsonRequest<AccountDetail[]>('/accounts?summary=true&position=true');
  return (items.find(a => a.accountId == accountId)) || null;
}

export async function fetchAccount(accountId: string): Promise<AccountEntity | null> {
  const accounts = await fetchAccounts();
  return (accounts.find(a => a.accountId == accountId)) || null;
}

export async function saveAccount(payload: AccountPayload, accountId?: string | undefined): Promise<AccountEntity> {
  if (accountId) {
    // update existing account
    return jsonRequest<AccountEntity>(`/account/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } else {
    // create new account
    return jsonRequest<AccountEntity>(`/account`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export async function fetchTransactions(startDate?: string | undefined, endDate?: string | undefined, pageSize?: number | undefined, nextToken?: string | undefined): Promise<QueryResult<TransactionEntity>> {
  const params = new URLSearchParams()
  if (startDate) {
    params.append('startDate', startDate)
  }
  if (endDate) {
    params.append('endDate', endDate)
  }
  if (pageSize !== undefined) {
    params.append('pageSize', String(pageSize))
  }
  if (nextToken) {
    params.append('nextToken', nextToken)
  }

  const query = params.toString()
  return jsonRequest(`/transactions${query ? `?${query}` : ''}`)
}

export async function fetchTransactionById(sk: string): Promise<TransactionEntity> {
  return jsonRequest(`/transaction/${encodeURIComponent(sk)}`)
}

export async function createTransaction(payload: Record<string, unknown>): Promise<TransactionEntity> {
  return jsonRequest<TransactionEntity>('/transaction', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteTransaction(transactionId: string): Promise<boolean> {
  return await requestWithoutContent(`/transaction/${encodeURIComponent(transactionId)}`, {
    method: 'DELETE',
  })
}

export async function triggerSummarization(): Promise<Record<string, string>> {
  return jsonRequest<Record<string, string>>('/summarize-position', {
    method: 'POST',
  })
}

export async function fetchSummaryHistory(
  accountId: string,
  startDate?: string | undefined,
  endDate?: string | undefined,
  pageSize?: number | undefined,
  nextToken?: string | undefined): Promise<QueryResult<SummaryEntity>> {
  const params = new URLSearchParams()
  if (startDate) {
    params.append('startDate', startDate)
  }
  if (endDate) {
    params.append('endDate', endDate)
  }
  if (pageSize !== undefined) {
    params.append('pageSize', String(pageSize))
  }
  if (nextToken) {
    params.append('nextToken', nextToken)
  }

  const query = params.toString()
  return jsonRequest(`/account/${accountId}/history/summary${query ? `?${query}` : ''}`)
}

export async function fetchPnL(
  accountId: string,
  startDate?: string | undefined,
  endDate?: string | undefined,
  pageSize?: number | undefined,
  nextToken?: string | undefined):
  Promise<QueryResult<PnLEntity>> {

  const params = new URLSearchParams()
  if (startDate) {
    params.append('startDate', startDate)
  }
  if (endDate) {
    params.append('endDate', endDate)
  }
  if (pageSize !== undefined) {
    params.append('pageSize', String(pageSize))
  }
  if (nextToken) {
    params.append('nextToken', nextToken)
  }

  const query = params.toString()
  return jsonRequest(`/account/${accountId}/realizedpnl${query ? `?${query}` : ''}`)
}

