## Overview of Tech Stack of backend of Portfolio Tracker
Serverless web application built on AWS.
- database: DynamoDB, single table model
- service: Lambda functions written in typescript
- API: API Gateway
- Authorization: Cognito
- Deployment: AWS CDK

### Future consideration:
Use AWS EventBridge for scheduled tasks.

## Overview of data models

### User
Portfolio Tracker uses CognitoUser.Claims.sub as the userId. It is saved when an account is created.

Attributes:
- PK: META
- SK: USER
- userId:

### Account
Store the metadata of accounts.

Attributes:
- PK: USER#<user_id>
- SK: ACCOUNT#<account_id>
- entityType: "ACCOUNT"
- createdAt: IsoString
- accountId: system-generated ulid
- accountName: user-entered account name/description
- brokerName?
- accountNumber?
- accountType: "TAXABLE", "IRA", "401K", "HSA", "OTHER"
- baseCurrency: "USD"
- active: true

### Transaction (Ledger)
Store all transactions. This is the single source of truth. It is used to derive the other items.

Attributes:
- PK: USER#<user_id>
- SK: TXN#<ISO_TIMESTAMP>#ACCOUNT#<account_id>#<txn_id>
- entityType: "TXN"
- createdAt: IsoString
- txnId: unique id of transaction
- txnDate: IsoString
- accountId
- instrumentId
- assetType: STOCK, OPTION, CASH
- transactionType: BUY, SELL, DIVIDEND, SPLIT, INTEREST, DEPOSIT, WITHDRAW, ADJUST
- quantity?
- price?
- fees?: total fees of the transaction. The system does not allocate the fees.
- amount?: for DIVIDEND, this is the total amount of dividend. Otherwise, this is optional.
- currency: USD
- splitRatio?: only used by SPLIT
- cashCollateral?: only used by Sell/Short PUT option. User provides. The system does not calculate it.
- note?

#### Instruments
- Equity (stock. ETF, etc.): instrumentId is the symbol of the stock and ETF.
- Option: 
  - instrumentId is in the format of "<underlying_security><expiration YYMMDD><C|P><strike_price>"
  - strike_price has 8 digits, the last 3 digits represent decimals.
  - Example: SPY260430C00500000 -> SPY Call Expired on 2026/04/30 with spike price 500.000

### Lot
Cost basis tracking.

Attributes:
- PK: USER#<user_id>#ACCOUNT#<account_id>#INSTR#<instrument_id>
- SK: LOT#<open_timestamp>#<lot_id>
- entityType: "LOT"
- createdAt: IsoString
- lotId: systen-generated ulid
- userId
- accountId
- instrumentId
- openTransactionSK
- openQuantity
- remainingQuantity: can be positive, zero, or negative. zero means the lot is closed.
- openPrice
- cost: the current cost of the lot. The system calculates it from openPrice and remainingQuantity
- cashCollateral: only used by Sell/Short PUT option
- realizedPnl?: only for dividends
- feesAllocated?
- lastUpdated: IsoString

### Position
Store positions.

Attributes:
- PK: USER#<user_id>#ACCOUNT#<account_id>
- SK: POS#<instrument_id> or POS#<as_of_date>#<instrument_id>
- entityType: "POS"
- createdAt: IsoString
- userId
- accountId
- instrumentId
- quantity
- totalCost
- marketPrice?: the system automatically updates it
- marketValue?: the system automatically updates it
- unrealizedPnl?: calculate by marketValue - totalCost
- realizedPnl?: only for dividends
- asOfDate?: only used in history

#### Notes
- the history contains the actual values, not delta

### Realized P&L
Stores realized profit and loss, from lot closure 

Attributes:
- PK: USER#<user_id>#ACCOUNT#<account_id>
- SK: PNL#<close_timestamp>#INSTR#<instrument_id>#<lot_id>
- entityType: "PNL"
- createdAt: IsoString
- userId
- accountId
- instrumentId
- closedLotSK 
- closedTxnSK: This can be empty for expiration of options
- closedDate: IsoString
- quantityClosed
- openPrice
- closePrice
- realizedPnl
- feesAllocated

### Account Summary
Store summary of an account

Attributes:
- PK: USER#<user_id>#ACCOUNT#<account_id>
- SK: SUMMARY or SUMMARY#<as_of_date>
- entityType: "SUMMARY"
- createdAt: IsoString
- totalCash
- totalAvailableCash?
- totalPositionsValue
- unrealizedPnl
- realizedPnl?: only used in history
- netWorth: totalCash + totalPositionsValue
- asOfDate?: only used in history
- lastUpdated: IsoString

#### Notes
- SK = SUMMARY: used to get the latest (current) summary
  - all the values are actual values
- SK = SUMMARY#<as_of_date>: used to get the history of summary
  - all the values are actual values


## Workflow

### Buy
1. a BUY transaction is created
2. process Lots:
   - If Short Lots (remaining quantity < 0) exist, close or partially close the Lot
   - If all such Lots are consumed and the quantity of the transaction is still not zero, create a lot (Long Lot) from the remain transaction quantity
3. If any Lots are closed, 
   - create Pnl (realized Profit and Loss) from the Lots
   - update Position to remove the closed quantity from the Lots
   - update the total portfolio value on Summary 
4. If a Lot is created, 
   - create or update Position to add quantity from the new Lot
   - update the total portfolio value on Summary as well as the history
5. Update cash value on Summary  as well as the history

### Sell
1. a SELL transaction is created
2. process Lots:
   - If Long Lots (remaining quantity > 0) exist, close or partially close the Lot
   - If all such Lots are consumed and the quantity of the transaction is still not zero, create a lot (Short Lot) from the remain transaction quantity
3. If any Lots are closed, 
   - create Pnl (realized Profit and Loss) from the Lots
   - update Position to remove the closed quantity from the Lots
   - update the total portfolio value on Summary 
4. If a Lot is created, 
   - create or update Position to add quantity from the new Lot
   - update the total portfolio value on Summary as well as the history
5. Update cash value on Summary  as well as the history

### Dividend
DIVIDEND transactions contain the total amount of dividends generated from a position in an account. The quantity and price of a DIVIDEND transaction are ignored by the system.  
1. a DIVIDEND transaction is created
2. process Lots:
   - Allocate the total amount of dividends across all Lots based on the remaining quantities
   - Dividends become the realized PnL on the Lots
3. create Pnl (realized Profit and Loss) from the Lots
4. update position to include the dividends
5. Update cash value on Summary as well as the history

### Cash
Cash transactions include DEPOSIT, WITHDRAW, INTEREST, ADJUST. These transactions do not touch Lots, Positions, and PnL. They only update the cash values on Cash, Summary, .
1. a CASH transaction is created
2. Update cash value on Summary as well as the history

### Delete a Transaction
When deleting a transaction, the transaction would be deleted, and the system would reverse the derivation of the transaction. The system will use the opposite values of the transaction to re-run BUY, SELL, DIVIDEND, and CASH workflows.

### Exipration of Option Contracts
Regardless the outcome of an option contract is expired, executed, or assigned, the option contract is expired. The Expiration of Option Contracts are handled by the system automatically. 
1. the expiration date has reached
2. close the Lots. For Short Lots, realized profit and loss would be generated.
3. close the Position
4. If there is realized profit and loss, create PnL
5. update the total portfolio value on Summary  as well as the history
6. Update cash value on Summary as well as the history


## Lambda Functions
- saveAccountHandler
- createTransactionHandler
- deleteTransactionHandler
- getTransactionHandler
- getSummaryHandler
- listAccountsHandler
- listHistoryHandler
- listPnlsHandler
- listPositionsHandler
- listTransactionsHandler
- summarizePositionHandler
- getLogsHandler


## API Endpoints
The API endpoints are created with AWS API Gateway. Each API is staged, the prod stage and dev stage, which point to staged Lambda functions and database.

### base url of API endpoints
```
{api_root}/{stage}/portfolio
```
For example, https://abcd123xxx.execute-api.us-east-2.amazonaws.com/dev/portfolio

### List of endpoints

Http Method | Url | Usage
---|---|---
POST|/account|create an account
PUT|/account/{accountId}|update an account, the payload shall include all attributes
GET|/accounts|list all accounts for the current user
GET|/accounts?summary=true,false&position=true,false|list all accounts and their details for the current user  
POST|/transaction|create transaction
DELETE|/transaction/{sk}|delete transaction, sk is the sort key of the transaction
GET|/transaction?startDate=&endDate=&pageSize=nextToken=|return a list of transactions
GET|/transaction/{sk}|get a single transaction, sk is the sort key of the transaction
GET|/account/{accountId}/positions|return a list of positions of the given account
GET|/account/{accountId}/realizedpnl?startDate=&endDate=&pageSize=nextToken=|return a list of realized pnl of the given account
GET|/account/{accountId}/summary|get the summary of the given account
GET|/account/{accountId}/history/summary?startDate=&endDate=&pageSize=nextToken=|return a list of account summary history
POST|/summarize-position|Retrieve market prices and update Positions, no payload is required
GET|/logs?event=summarize_position|get logs from the specified event, at this time it only supports summarize_position       
