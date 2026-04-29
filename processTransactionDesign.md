# Transaction date model
pk: USER#<userId>
sk: TXN#<txnDate>#ACCOUNT#<accountId>#<txnId>

Relevant Attributes:
- userId
- txnId
- txnDate
- accountId
- instrumentId
- assetType (STOCK | ETF | OPTION | CASH)
- transactionType:
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
- split_ratio (nullable)


# Event of insertion

## Events about CASH
transactionType = DEPOSIT / INTEREST / WITHDRAW / ADJUST / BUY / SELL / DIVIDEND
- CASH: the latest balance: update balance; populate last_updated
- SUMMARY: update total_cash, net_worth; populate last_updated
- NETWORTH: update total_cash, net_worth; populate last_updated


## Buy stock/etf
assetType = STOCK | EFT, transactionType = BUY

### create a lot
PK: USER#<userId>#ACCOUNT#<accountId>#INSTR#<instrumentId>
SK: LOT#<txnDate>#<lotId>
Attributes:
- quantity_opened <-- txn.quantity
- quantity_remaining <-- txn.quantity
- cost_per_unit <-- txn.price
- total_cost <-- txn.amount = txn.price * txn.quantity
- open_transaction_id <-- txn.txnId
- status (OPEN | CLOSED) <-- OPEN
- created_at
- closed_at <-- null

### update position
PK: USER#<user_id>#ACCOUNT#<account_id>
SK: POS#<instrument_id>

Attributes:
- quantity (signed) <-- plus txn.quantity
- average_cost <-- (average_cost*quantity+txn.amount)/(quantity+txn.quantity)
- market_price
- market_value
- unrealized_pnl 
- last_updated


## Sell stock/etf (still designing)
assetType = STOCK | EFT, transactionType = SELL

### consume lot
1. query PK = USER#<userId>#ACCOUNT#<accountId>#INSTR#<instrumentId>
2. for each lot: SK = LOT#<txnDate>#<lotId>
   Attributes:
   - quantity_opened <-- no change
   - quantity_remaining <-- quantity_remaining - txn.quantity
   - cost_per_unit <-- no change
   - total_cost <-- no change
   - open_transaction_id <-- no change
   - status (OPEN | CLOSED) <-- CLOSED if txn.quantity >= quantity_remaining 
   - created_at
   - closed_at <-- null
   

### update position
PK: USER#<user_id>#ACCOUNT#<account_id>
SK: POS#<instrument_id>

Attributes:
- quantity (signed) <-- plus txn.quantity
- average_cost <-- (average_cost*quantity+txn.amount)/(quantity+txn.quantity)
- market_price
- market_value
- unrealized_pnl 
- last_updated