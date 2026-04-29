When an Account is created, create the below initial items.

# Cash
PK: USER#<user_id>#ACCOUNT#<account_id>
SK: CASH
Attributes:
- balance = 0
- last_updated <- use this as idempotency attribute

# Account Summary
PK: USER#<user_id>#ACCOUNT#<account_id>
SK: SUMMARY
Attributes:
- total_cash = 0
- total_positions_value = 0
- unrealized_pnl = 0
- realized_pnl = 0
- net_worth = 0
- last_updated <- use this as idempotency attribute

# Global Net Worth
If no NetWorth exists, create one, otherwise do nothing

pk: USER#<user_id>
sk: NETWORTH
Attributes:
- total_cash = 0
- total_positions_value = 0
- total_unrealized_pnl = 0
- total_realized_pnl = 0
- net_worth = 0
- last_updated <- use this as idempotency attribute