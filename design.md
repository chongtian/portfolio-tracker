# Design Document of Personal Portfolio Tracker - Phase 1
Personal Portfolio Tracker is a web application. Its main features include:
- User can log transactions for buying and selling stock, ETF, stock options, etc.
- User can log transactions for multiple broker accounts.
- User can delete a wrong transaction.
- User can view the positions, realized/unrealized profit and losee, etc. within one account or across all accounts.

## Overview of Tech Stack
Serverless web application built on AWS.
- database: DynamoDB
- service: Lambda functions written in typescript
- API: API Gateway
- Authorization: Cognito
- frontend: react.js or other javascript framework

## Phase Plan
Phase 1 works on backend, including Lambda functions and Cognito/API Gateway setup.
Phase 2 works on frontend.

## Trading System Data Model (DynamoDB Single-Table Design)

### 1. Overview

This document defines the data model for a trading system that supports:
- Stocks and ETFs
- Options (contracts, lifecycle events)
- Multiple broker accounts per user
- Dividends and cash balances
- Split and reverse-split
- Realized and unrealized P&L
- Multi-account aggregation (net worth)

The system is designed using Amazon DynamoDB single-table architecture.

### 2. Design Principles
#### Single Source of Truth
Transactions are immutable and authoritative.

All derived data (lots, positions, P&L) are computed from transactions

#### Event-Driven Processing
Transaction writes trigger updates:

Transactions → Lots → Realized P&L → Positions → Summaries

#### Denormalization
Data is duplicated intentionally to support query patterns.

No joins at query time.

### 3. Table Definition
#### Table Name: 
portfolio_tracker (with prefix like dev_, prod_, test_, etc)

#### Primary Key:
pk (Partition Key): string
sk (Sort Key): string

### 4. Entity Model
All entities are stored in a single table using namespaced keys.

#### 4.1 User

pk: USER#<user_id>
sk: META

Attributes:
- name
- email
- created_at

#### 4.2 Account

pk: USER#<user_id>
sk: ACCOUNT#<account_id>

Attributes:
- active
- broker_name
- account_name
- account_type (Taxable, IRA, 401K, HSA, Other)
- base_currency
- created_at

### 4.3 Transactions (Ledger)

pk: USER#<user_id>
sk: TXN#<ISO_TIMESTAMP>#ACCOUNT#<account_id>#<txn_id>

Attributes:
- txn_date
- account_id
- instrument_id
- asset_type (STOCK | ETF | OPTION)
- transaction_type:
  - BUY, SELL
  - DIVIDEND, INTEREST
  - EXPIRATION, ASSIGNMENT, EXERCISE
  - SPLIT
  - DEPOSIT
  - WITHDRAW
  - ADJUST
- quantity
- price
- fees
- amount
- currency
- option_contract_id (nullable)
- split_ratio (nullable)
- created_at

### 4.4 Instruments

#### Equity / ETF
instrument_id is the symbol of the stock and ETF

#### Option Contract
instrument_id is in the format of "<underlying_security><expiration YYMMDD><C|P><strike_price>"
strike_price has 8 digits, the last 3 digits represent decimals.
Example: SPY260430C00500000 -> SPY Call Expired on 2026/04/30 with spike price 500.000

### 4.5 Lots (Cost Basis Tracking)

pk: USER#<user_id>#ACCOUNT#<account_id>#INSTR#<instrument_id>
sk: LOT#<open_timestamp>#<lot_id>

Attributes:
- quantity_opened
- quantity_remaining
- cost_per_unit
- total_cost
- open_transaction_id
- status (OPEN | CLOSED)
- created_at
- closed_at (nullable)

#### Notes
- Lots are consumed using FIFO
- Partial consumption reduces quantity_remaining
- A lot is CLOSED when quantity_remaining = 0

### 4.6 Realized P&L (Lot Closures)

#### track log closures
pk: USER#<user_id>#ACCOUNT#<account_id>#INSTR#<instrument_id>
sk: PNL#<close_timestamp>#<close_txn_id>

Attributes:
- lot_id
- quantity_closed
- open_price
- close_price
- realized_pnl
- fees_allocated
- created_at

#### for query
pk: USER#<user_id>#ACCOUNT#<account_id>#PNL
sk: PNL#<close_timestamp>

Attributes:
- instrument_id


### 4.7 Positions

#### Equity / ETF

pk: USER#<user_id>#ACCOUNT#<account_id>
sk: POS#<instrument_id>

Attributes:
- quantity (signed)
- average_cost
- market_price
- market_value
- unrealized_pnl (=market_value-average_cost*quantity)
- last_updated

#### Notes
- Positions are updated incrementally
- Not recomputed from lots at query time

### 4.8 Cash Balances

#### the latest balance
pk: USER#<user_id>#ACCOUNT#<account_id>
sk: CASH

Attributes:
- balance
- last_updated

#### history (future consideration)
pk: USER#<user_id>#ACCOUNT#<account_id>
sk: CASH#<as_of_date>

Attributes:
- balance
- as_of_date

### 4.9 Account Summary

pk: USER#<user_id>#ACCOUNT#<account_id>
sk: SUMMARY

Attributes:
- total_cash
- total_positions_value
- unrealized_pnl
- realized_pnl
- net_worth
- last_updated

### 4.10 Global Net Worth

pk: USER#<user_id>
sk: NETWORTH

Attributes:
- total_cash
- total_positions_value
- total_unrealized_pnl
- total_realized_pnl
- net_worth
- last_updated

### 4.11. Future Extensions
- Performance analytics (Sharpe ratio, drawdown)
- Time-series snapshots for historical net worth 


## 5. Core Workflows

### 5.1 Buy Transaction

Insert transaction -> Create new lot -> Update position (increase quantity) -> Update cash (decrease) -> Update summaries

### 5.2 Sell Transaction

Insert transaction -> Fetch open lots (FIFO) -> Consume lots -> Write realized P&L records -> Update position (decrease quantity) -> Update cash (increase) -> Update summaries

### 5.3 Option Expiration

Long option:

close remaining lot -> realized P&L = −cost basis 

Short option:

realized P&L = premium received

### 5.4 Assignment / Exercise

Close option lots -> Generate corresponding stock transactions -> Update positions accordingly


## 6. Lambda Functions
Multiple Lambda functions are required. All the Lambda functions shall be maintained by one project.

The structure of project is like:
project/
├── src/
│   ├── functions/
│   │   ├── function1.ts
│   │   ├── function2.ts
│   │   └── function3.ts
│   ├── lib/
│   │   ├── db.ts
│   │   └── utils.ts
│   └── types/
├── dist/
├── package.json
├── tsconfig.json

Consider to using a bundler.

### List of Lambda functions

- saveAccount (done)
- insertTransaction (done)
- deleteTransaction (done)
- handleStream 
  - create lot (or delete lot)
  - update positions
  - consume lot (or rollback consumption)
  - update cash
  - update realized pnl
  - update summaries
- listAccounts (done)
- listAccountCashBalances
- listAccountSummary
- listAccountPositions
- listAccountRealizedPnl
- listTransactions (done)
- getNetworth


## 7. API Design
- POST /account Save an account (done)
- GET /accounts List all accounts (done)
- GET /account/<account_id>/balances?startDate=&endDate= List cash balances based on the query parameters
- GET /account/<account_id>/summary Get summary for the account
- GET /account/<account_id>/positions List all positions whose quantity is not zero
- GET /account/<account_id>/realizedpnl?startDate=&endDate= List Realized P&L based on the query parameters 
- POST /transaction Create a transaction (done)
- DELETE /transaction Delete a transaction (done)
- GET /transactions?startDate=&endDate= List transactions based on the query parameters (done)
- GET /networth Get Networth from all accounts


## 9. Test
Unit tests are required.


## 8. Github Action
CI/CD pipeline is required.