## Overview of Tech Stack of frontend of Portfolio Tracker
Single Page Application hosted in AWS
- UI Framework: react.js + tailwind css
- Authorization: AWS Cognito
- Hosting: AWS S3
- Deployment: cdk

## API Endpoints
Refer to [design-backend](design-backend.md)

## Forms and Screens
- The web pages shall be mobile friendly.
- There are menus so that user can navigate and use each function.
- The page footer shall show in which stage the user is as well as the version of the application. The information is hard-coded in the application and can be changed by Ci/CD pipeline.
- Show user name in header or other proper place
- User can log out of the application

### Login
- Typical Login form
- Include the workflow of "forget password"
- Do not include "Sign Up" or "Register" in this phase

### Dashboard
- List all accounts, include:
  - account metadata, like name, broker, type, etc.
  - cash balance
  - total portfolio value
- Aggregated information across all accounts, include:
  - cash balance
  - total portfolio value
- From Dashboard, user can navigate to account details
- A button to navigate to the screen of creating transaction

### Create Account
- Typical form to enter data
- Included in menu

### List all Accounts
- simply list all accounts
- no search or pagination
- Included in menu

### Update Account
- Typical form to enter data
- For Updating Account, not all fields are editable, but the UI must send all fields to API.
- When update is done, it shall take user back to Account Detail
- Not included in menu

### Account Detail
- From the screen of List all Accounts, user can open the Account Detail
- From Account Detail, user can choose to open the screen of Update Account
- Not included in menu
- Account Detail lists:
  - Cash balance and available cash
  - Net worth
  - YTD realized PnL
  - all Positions
  - a pie chart of the value of these positions and cash balance
  - a line chart of YTD history of cash balance and available cash
  - a line chart of YTD history of networth 

### Global Net Worth
- User can access this screen from Dashboard or menu
- Included in menu
- It list global information aggregated from all accounts:
  - Cash balance and available cash
  - Net worth
  - YTD realized PnL
  - all Positions
  - a pie chart of the value of these positions and cash balance
  - a line chart of YTD history of cash balance and available cash
  - a line chart of YTD history of networth 

### Create Transaction
Included in menu. A wizard-like workflow. 
1. user first choose Asset Type from Stock, Option, and Cash.
2. based on the Asset Type, the form displays different fields.
3. common fields are:
   - txnId: if user does not provide one, the frontend uses ulid() to generate one. If user does enter one, remind user this shall be the actual transaction id from the broker or bank
   - txnDate: date picker. the frontend shall send ISO date string to API
   - accountId: allow user to choose an Account from drop down of all available accounts
   - quantity: shall be non-negative
   - price: can be negative (for Adjustment purpose)
   - amount
   - fees
   - currency: default to USD
   - note: a text area 
4. For Stock, the specific fields are:
   - transaction Type: select from BUY, SELL, DIVIDEND, SPLIT
   - instrumentId: user enters an instrument id
   - amount: automatically calcuated by price * quantity
   - splitRatio: only enabled when transaction type is SPLIT
   - When transaction type is SPLIT, set quantity, price, amount to 0, as they are not relevant
   - When transaction type is DIVIDEND, set quantity to 1, and remind user that the total amount of the dividend need to be entered (not the dividend per share)
5. For Option, the specific fields are:
   - transaction Type: select from BUY, SELL
   - instrument id: Provide an easy way to user to enter option contract:
     - it can be a popup or something similar 
     - User enters underlying, expiration, spike, Call or Put
     - The system generates intrument id
   - amount: readonly, automatically calcuated by price * quantity
   - Cash Collateral: enabled only when option type is PUT and transaction type is Sell. in this case, automatically populate it with spike * quantity * 100
6. For Cash, the specific fields are:
   - transaction Type: select from INTEREST, DEPOSIT, WITHDRAW, ADJUST
   - there is no intrument id, but the frontend silently populate it with _CASH
   - quantity: default to 1
   - amount: readonly, automatically calcuated by price * quantity
7. When save is done, take user to the screen of View Transaction

### Search Transactions
- User can enter a date range
- Implement pagination, if user keeps scrolling down, it keeps loading more data
- Included in menu

### View Transaction
- From the screen of Search Transactions, user can open a Transaction
- This is a read-only screen showing all relevant fields
- User can delete the transaction with confirmation
- Not included in menu

### Manual trigger summarization of positions
- The summarization of positions is a scheduled task in the backend, but user can trigger it from the frontend.
- Multiple confirmation to ensure this is not triggered by accident.
- Include in menu

