import { validateTransaction } from '@shared/business/validateTransaction';
import { LotEntity } from '@shared/models/lot';
import { PnLEntity } from '@shared/models/pnl';
import { PositionEntity } from '@shared/models/position';
import { SummaryEntity } from '@shared/models/summary';
import { AssetType, TransactionEntity, TransactionType } from '@shared/models/transaction';
import { EntityTypeLot, EntityTypePnL, EntityTypePosition, EntityTypeSummary, EntityTypeTransaction, lotPartitionKey, lotSortKey, pnlPartitionKey, pnlSortKey, positionHistorySortKey, positionPartitionKey, positionSortKey, summaryHistorySortKey, summaryPartitionKey, summarySortKey, transactionPartitionKey, transactionSortKey } from '@shared/utils/getKeys';
import { getMultipler } from '@shared/utils/getMultipler';
import { parseOptionContract } from '@shared/utils/parseOptionContract';
import * as fs from 'fs';
import * as readline from "readline";
import { ulid } from 'ulid';
import { batchWriteAll } from './dynamoDbBatchWriter';

const REGION = process.env.AWS_REGION ?? "us-east-2";
const DB_TABLE = process.env.DB_TABLE ?? "portfolio_tracker_manual";

const UserID = "obslMFAhcGRLmcGFIHtC4A";
const AccountMapping: Record<string, string> = {
    "Gao IRA": "01KQZ7NTQQETWTCTNXZ11NJWJJ",
    "Vanguard Broker": "01KQWTE9M761E2HQ9A2FZ7F155",
    "Tang IRA": "01KQWV7PRBK6T6QQE2ZSSCAKDJ",
    "Robinhood": "01KQWM6QE218DZ462TXGG8QSHX"
};
const PriceCacheFile = "price.json"; // a local json file contains price information

type TransactionRow = {
    txnDate: string;
    instrument: string;
    account: string;
    transactionType: string;
    quantity: number;
    price: number;
    fees: number;
    amount: number;
    assetType: string;
    splitRatio: number;
    cashCollateral: number;
};

const columnIndex: Record<string, number> =
{
    'txnDate': 0,
    'instrument': 1,
    'account': 2,
    'transactionType': 3,
    'quantity': 4,
    'price': 5,
    'fees': 6,
    'amount': 7,
    'assetType': 8,
    'splitRatio': 9,
    'cashCollateral': 10
};

async function readCsv(filePath: string): Promise<string[][]> {
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const rows: string[][] = [];

    for await (const line of rl) {
        const values = parseCsvLine(line);
        rows.push(values);
    }

    return rows;
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            // Handle escaped quotes ("")
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map(v => v.trim());
}

function toNumber(value: string): number {
    let cleaned = value.replace('$', '').replace(',', '').trim();
    if (cleaned === '') return 0;
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
}

async function readTransactionsFromCsv(filePath: string): Promise<TransactionRow[]> {

    const data = await readCsv(filePath);
    if (data.length < 2) {
        throw new Error('CSV must include a header and at least one data row.');
    }

    const rows: TransactionRow[] = data.slice(1).map((line, rowIdx) => {

        return {
            txnDate: (new Date(line[columnIndex['txnDate']!] ?? '')).toISOString().slice(0, 10),
            instrument: (line[columnIndex['instrument']!] ?? '').toUpperCase(),
            account: line[columnIndex['account']!] ?? '',
            transactionType: (line[columnIndex['transactionType']!] ?? '').toUpperCase(),
            quantity: toNumber(line[columnIndex['quantity']!] ?? ''),
            price: toNumber(line[columnIndex['price']!] ?? ''),
            fees: toNumber(line[columnIndex['fees']!] ?? ''),
            amount: toNumber(line[columnIndex['amount']!] ?? ''),
            assetType: (line[columnIndex['assetType']!] ?? '').toUpperCase(),
            splitRatio: toNumber(line[columnIndex['splitRatio']!] ?? ''),
            cashCollateral: toNumber(line[columnIndex['cashCollateral']!] ?? ''),
        };
    });

    return rows;
}

function getTransactionEntityGroupByDate(rows: TransactionRow[], txnsSave: TransactionEntity[]): Record<string, TransactionEntity[]> {
    const txns: Record<string, TransactionEntity[]> = {};

    rows.forEach((r, idx) => {
        const accountId = AccountMapping[r.account];
        if (!accountId) {
            console.error(`Cannot find ${r.account}`);
            return;
        }

        const txnId = ulid();
        const txn = {
            PK: transactionPartitionKey(UserID),
            SK: transactionSortKey(accountId, r.txnDate, txnId),
            createdAt: (new Date()).toISOString(),
            entityType: EntityTypeTransaction,
            txnId: txnId,
            txnDate: r.txnDate,
            accountId: accountId,
            instrumentId: r.instrument,
            assetType: r.assetType,
            transactionType: r.transactionType,
            quantity: r.quantity,
            price: r.price,
            fees: r.fees,
            amount: r.amount,
            currency: "USD",
            splitRatio: r.splitRatio,
            cashCollateral: r.cashCollateral
        } as TransactionEntity;

        const validateResult = validateTransaction(txn);
        if (!validateResult.success) {
            console.error(`Row ${idx + 1}: ${validateResult.error}`);
            return;
        }

        if (!txns[txn.txnDate]) {
            txns[txn.txnDate] = [];
        }

        txns[txn.txnDate]!.push(txn);
        txnsSave.push(txn);
    });

    return txns;
}

function createUpdateSummary(summaries: SummaryEntity[],
    accountId: string,
    totalCash?: number | undefined,
    totalAvailableCash?: number | undefined,
    totalPositionsValue?: number | undefined,
    unrealizedPnl?: number | undefined,
    realizedPnl?: number | undefined
) {
    const summary = summaries.find(s => s.PK.includes(accountId) && s.SK === EntityTypeSummary);
    if (summary) {
        summary.totalCash = (summary.totalCash || 0) + (totalCash || 0);
        summary.totalAvailableCash = (summary.totalAvailableCash || 0) + (totalAvailableCash || 0);
        summary.totalPositionsValue = (summary.totalPositionsValue || 0) + (totalPositionsValue || 0);
        summary.unrealizedPnl = (summary.unrealizedPnl || 0) + (unrealizedPnl || 0);
        summary.realizedPnl = (summary.realizedPnl || 0) + (realizedPnl || 0);
    } else {
        summaries.push({
            PK: summaryPartitionKey(UserID, accountId),
            SK: EntityTypeSummary,
            createdAt: (new Date()).toISOString(),
            entityType: EntityTypeSummary,
            totalCash: totalCash || 0,
            totalAvailableCash: totalAvailableCash || 0,
            totalPositionsValue: totalPositionsValue || 0,
            unrealizedPnl: unrealizedPnl || 0,
            realizedPnl: realizedPnl || 0,
            lastUpdated: (new Date()).toISOString()
        });
    }
}

function createUpdatePosition(positions: PositionEntity[], lot: LotEntity) {
    const position = positions.find(p => p.PK === positionPartitionKey(UserID, lot.accountId) && p.SK === positionSortKey(lot.instrumentId));
    if (position) {
        position.quantity = (position.quantity || 0) + (lot.remainingQuantity || 0);
        position.totalCost = (position.totalCost || 0) + (lot.cost || 0)
    } else {
        positions.push({
            PK: positionPartitionKey(UserID, lot.accountId),
            SK: positionSortKey(lot.instrumentId),
            lastUpdated: (new Date()).toISOString(),
            entityType: EntityTypePosition,
            userId: UserID,
            accountId: lot.accountId,
            instrumentId: lot.instrumentId,
            quantity: lot.remainingQuantity,
            totalCost: lot.cost
        });
    }
}

function createLot(lots: LotEntity[], txn: TransactionEntity, actualQty: number, multiplier = 1): LotEntity {
    const lotid = ulid();
    const lot = {
        PK: lotPartitionKey(UserID, txn.accountId, txn.instrumentId),
        SK: lotSortKey(txn.txnDate, lotid),
        createdAt: (new Date()).toISOString(),
        entityType: EntityTypeLot,
        lotId: lotid,
        userId: UserID,
        accountId: txn.accountId,
        instrumentId: txn.instrumentId,
        openTransactionSK: txn.SK,
        openQuantity: actualQty,
        remainingQuantity: actualQty,
        openPrice: txn.price || 0,
        cost: (txn.price || 0) * actualQty * (multiplier || 1),
        lastUpdated: (new Date()).toISOString(),
        cashCollateral: txn.cashCollateral || 0
    };
    lots.push(lot);
    return lot;
}

function createPnL(pnls: PnLEntity[], lot: LotEntity, txn: TransactionEntity, closedQty: number, multiplier = 1) {
    pnls.push({
        PK: pnlPartitionKey(UserID, txn.accountId),
        SK: pnlSortKey(txn.txnDate, txn.instrumentId, lot.lotId, txn.txnId),
        createdAt: (new Date()).toISOString(),
        entityType: EntityTypePnL,
        userId: UserID,
        accountId: txn.accountId,
        instrumentId: txn.instrumentId,
        closedLotSK: lot.SK,
        closedTxnSK: txn.SK,
        closedDate: txn.txnDate,
        quantityClosed: closedQty,
        openPrice: lot.openPrice,
        closePrice: txn.price!,
        realizedPnl: (txn.price! - lot.openPrice) * closedQty * multiplier,
        feesAllocated: txn.fees || 0
    });
}

function summarizePositions(
    positions: PositionEntity[],
    positionHistories: PositionEntity[],
    lots: LotEntity[],
    pnls: PnLEntity[],
    summaries: SummaryEntity[],
    summaryHistories: SummaryEntity[],
    currentDate: Date,
    priceCache: Record<string, number>) {

    // get all open positions
    const openPositions = positions.filter(p => p.quantity !== 0);
    for (const position of openPositions) {
        const instrumentId = position.instrumentId;
        const accountId = position.accountId;

        // check if the instrument is an option contract and if the contract is expired
        const optionContract = parseOptionContract(instrumentId);
        if (optionContract) {
            const { expirationDate } = optionContract;
            if (expirationDate.toISOString().slice(0, 10) < currentDate.toISOString().slice(0, 10)) {

                // expire options: process lots, pnls
                const openLots = lots.filter(l =>
                    l.PK === lotPartitionKey(UserID, accountId, instrumentId) && l.remainingQuantity != 0);

                for (const openLot of openLots) {
                    // create pnl first
                    const dummyTxn = {
                        accountId: accountId,
                        instrumentId: instrumentId,
                        txnDate: currentDate.toISOString().slice(0, 10),
                        SK: 'EXPIRED',
                        txnId: 'EXPIRATION',
                        price: 0
                    } as TransactionEntity;
                    createPnL(pnls, openLot, dummyTxn, openLot.remainingQuantity, 100);
                    // close lot
                    openLot.remainingQuantity = 0;
                    openLot.cost = 0;
                    openLot.realizedPnl = -1 * openLot.openPrice * openLot.openQuantity * 100;

                    if (openLot.cashCollateral) {
                        createUpdateSummary(summaries, accountId, 0, openLot.cashCollateral);
                        // console.log(`release colleteral: ${openLot.instrumentId} $${openLot.cashCollateral}`);
                        openLot.cashCollateral = 0;
                    }
                }

                position.unrealizedPnl = 0;
                position.quantity = 0;
                continue;
            }
        }

        // get market price for the instrument
        const priceKey = `D${currentDate.toISOString().slice(0, 10)}-${instrumentId}`;
        if (priceCache[priceKey]) {
            // get market price from cache
            position.marketPrice = priceCache[priceKey];
        }

        if (position.marketPrice) {
            position.marketValue = position.marketPrice * position.quantity * getMultipler(instrumentId);
            position.unrealizedPnl = position.marketValue - position.totalCost;

            // Create a Position History
            const positionHistory = { ...position };
            positionHistory.SK = positionHistorySortKey(instrumentId, currentDate.toISOString().slice(0, 10));
            positionHistory.asOfDate = currentDate.toISOString().slice(0, 10);
            positionHistory.lastUpdated = (new Date()).toISOString();
            positionHistories.push(positionHistory);
        }
    }

    // update Summary
    const latestSummaries = summaries.filter(s => s.SK === summarySortKey());
    for (const summary of latestSummaries) {
        const totalPositionsValue = openPositions.filter(p => summary.PK.includes(p.accountId)).reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
        const totalUnrealizedPnl = openPositions.filter(p => summary.PK.includes(p.accountId)).reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);
        summary.totalPositionsValue = totalPositionsValue;
        summary.unrealizedPnl = totalUnrealizedPnl;
        summary.lastUpdated = currentDate.toISOString();

        // Create a Summary History
        const summaryHistory = { ...summary };
        summaryHistory.SK = summaryHistorySortKey(currentDate.toISOString().slice(0, 10));
        summaryHistory.asOfDate = currentDate.toISOString().slice(0, 10);
        summaryHistory.createdAt = currentDate.toISOString().slice(0, 10);
        summaryHistories.push(summaryHistory);
    }
}

function processTransactions(txns: Record<string, TransactionEntity[]>,
    lots: LotEntity[], positions: PositionEntity[], positionHistories: PositionEntity[],
    pnls: PnLEntity[], summaries: SummaryEntity[], summaryHistories: SummaryEntity[]
) {

    let priceCache: Record<string, number> = {};
    const localPriceCache = fs.existsSync(PriceCacheFile);
    if (localPriceCache) {
        const fileContent = fs.readFileSync(PriceCacheFile, 'utf8');
        priceCache = JSON.parse(fileContent);
        console.log("Loaded Local Price Cache.");
    }

    const keys = Object.keys(txns);
    keys.sort();
    const minDate = keys[0]!;

    const current = new Date(minDate);
    while (current <= new Date()) {
        const day = current.getDay(); // 0 = Sun, 6 = Sat
        if (day !== 0 && day !== 6) {
            const dateKey = current.toISOString().slice(0, 10);
            const transactions = txns[dateKey];
            if (transactions) {
                for (const txn of transactions) {

                    if (txn.assetType === AssetType.CASH) {
                        // so far, there is no withdraw record
                        createUpdateSummary(summaries, txn.accountId, txn.price! * txn.quantity!, txn.price! * txn.quantity!);
                    }

                    if (txn.assetType === AssetType.STOCK) {

                        if (txn.transactionType === TransactionType.BUY) {
                            const lot = createLot(lots, txn, txn.quantity!);
                            createUpdatePosition(positions, lot);
                            createUpdateSummary(summaries, txn.accountId, -1 * txn.price! * txn.quantity!, -1 * txn.price! * txn.quantity!);
                        }

                        if (txn.transactionType === TransactionType.SELL) {
                            // find open lots
                            const openLots = lots.filter(l =>
                                l.PK === lotPartitionKey(UserID, txn.accountId, txn.instrumentId)
                                && l.remainingQuantity > 0);

                            if (openLots && openLots.length > 0) {
                                let qty = txn.quantity!;
                                for (const openLot of openLots) {
                                    if (qty >= openLot.remainingQuantity) {
                                        // close this lot
                                        qty = qty - openLot.remainingQuantity;
                                        createPnL(pnls, openLot, txn, openLot.remainingQuantity);
                                        // use dummy lot to update position
                                        const dummyLot = {
                                            accountId: openLot.accountId,
                                            instrumentId: openLot.instrumentId,
                                            remainingQuantity: -1 * openLot.remainingQuantity,
                                            cost: -1 * openLot.cost
                                        } as LotEntity;
                                        createUpdatePosition(positions, dummyLot);
                                        openLot.remainingQuantity = 0;
                                        openLot.cost = 0;
                                    } else {
                                        // partial close
                                        openLot.remainingQuantity = openLot.remainingQuantity - qty;
                                        openLot.cost = openLot.openPrice * openLot.remainingQuantity;
                                        createPnL(pnls, openLot, txn, qty);
                                        // use dummy lot to update position
                                        const dummyLot = {
                                            accountId: openLot.accountId,
                                            instrumentId: openLot.instrumentId,
                                            remainingQuantity: -1 * qty,
                                            cost: -1 * openLot.openPrice * qty
                                        } as LotEntity;
                                        createUpdatePosition(positions, dummyLot);
                                        qty = 0;
                                    }
                                }

                                // the scenario that qty > 0 is not possible in migration project

                            }
                            // the scenario that openLots not exist is not possible in migration project

                            createUpdateSummary(summaries, txn.accountId, txn.price! * txn.quantity!, txn.price! * txn.quantity!);
                        }

                        if (txn.transactionType === TransactionType.SPLIT) {
                            // find open lots
                            const openLots = lots.filter(l =>
                                l.PK === lotPartitionKey(UserID, txn.accountId, txn.instrumentId)
                                && l.remainingQuantity > 0);

                            if (openLots && openLots.length > 0) {
                                for (const openLot of openLots) {
                                    openLot.openQuantity = openLot.openQuantity * txn.splitRatio!;
                                    openLot.openPrice = openLot.openPrice / txn.splitRatio!;
                                }
                            }

                            const position = positions.find(p => p.PK === positionPartitionKey(UserID, txn.accountId) && p.SK === positionSortKey(txn.instrumentId));
                            if (position) {
                                position.quantity = position.quantity * txn.splitRatio!;
                            }
                        }

                        if (txn.transactionType === TransactionType.DIVIDEND) {
                            // find open lots
                            const openLots = lots.filter(l =>
                                l.PK === lotPartitionKey(UserID, txn.accountId, txn.instrumentId)
                                && l.remainingQuantity > 0);

                            if (openLots && openLots.length > 0) {
                                const totalRemainingQty = openLots.reduce((sum, l) => sum = sum + l.remainingQuantity, 0);
                                for (const openLot of openLots) {
                                    openLot.realizedPnl = (openLot.realizedPnl || 0) + txn.amount! * openLot.remainingQuantity / totalRemainingQty;
                                }
                            }

                            const position = positions.find(p => p.PK === positionPartitionKey(UserID, txn.accountId) && p.SK === positionSortKey(txn.instrumentId));
                            if (position) {
                                position.realizedPnl = (position.realizedPnl || 0) + txn.amount!;
                            }

                            createUpdateSummary(summaries, txn.accountId, txn.amount!, txn.amount!);
                        }

                    }

                    if (txn.assetType === AssetType.OPTION) {

                        if (txn.transactionType === TransactionType.BUY) {
                            // find open short lots
                            const openLots = lots.filter(l =>
                                l.PK === lotPartitionKey(UserID, txn.accountId, txn.instrumentId)
                                && l.remainingQuantity < 0);
                            let qty = txn.quantity!;

                            if (openLots && openLots.length > 0) {
                                // close open short lots
                                let releaseCollateral = 0;
                                for (const openLot of openLots) {
                                    if (qty >= Math.abs(openLot.remainingQuantity)) {
                                        // close this lot
                                        qty = qty - Math.abs(openLot.remainingQuantity);
                                        createPnL(pnls, openLot, txn, openLot.remainingQuantity, 100);
                                        // use dummy lot to update position
                                        const dummyLot = {
                                            accountId: openLot.accountId,
                                            instrumentId: openLot.instrumentId,
                                            remainingQuantity: -1 * openLot.remainingQuantity,
                                            cost: -1 * openLot.cost
                                        } as LotEntity;
                                        createUpdatePosition(positions, dummyLot);
                                        openLot.remainingQuantity = 0;
                                        openLot.cost = 0;
                                        releaseCollateral = releaseCollateral + (openLot.cashCollateral || 0);
                                        openLot.cashCollateral = 0;
                                    } else {
                                        // partial close
                                        openLot.remainingQuantity = openLot.remainingQuantity + qty;
                                        openLot.cost = openLot.openPrice * openLot.remainingQuantity;
                                        createPnL(pnls, openLot, txn, -1 * qty, 100);
                                        // use dummy lot to update position
                                        const dummyLot = {
                                            accountId: openLot.accountId,
                                            instrumentId: openLot.instrumentId,
                                            remainingQuantity: qty,
                                            cost: openLot.openPrice * qty
                                        } as LotEntity;
                                        createUpdatePosition(positions, dummyLot);
                                        releaseCollateral = releaseCollateral + (openLot.cashCollateral || 0) * qty / Math.abs(openLot.remainingQuantity);
                                        openLot.cashCollateral = (openLot.cashCollateral || 0) - (openLot.cashCollateral || 0) * qty / Math.abs(openLot.remainingQuantity);
                                        qty = 0;
                                    }
                                }

                                createUpdateSummary(summaries, txn.accountId, -1 * txn.price! * qty * 100, releaseCollateral - txn.price! * qty * 100);
                            }

                            if (qty > 0) {
                                // go through regular workflow of creating long lots
                                const lot = createLot(lots, txn, qty, 100);
                                createUpdatePosition(positions, lot);
                                createUpdateSummary(summaries, txn.accountId, -1 * txn.price! * qty * 100, -1 * txn.price! * qty * 100);
                            }
                        }

                        if (txn.transactionType === TransactionType.SELL) {
                            // find open long lots
                            const openLots = lots.filter(l =>
                                l.PK === lotPartitionKey(UserID, txn.accountId, txn.instrumentId)
                                && l.remainingQuantity > 0);
                            let qty = txn.quantity!;

                            if (openLots && openLots.length > 0) {
                                // close open long lots
                                for (const openLot of openLots) {
                                    if (qty >= openLot.remainingQuantity) {
                                        // close this lot
                                        qty = qty - openLot.remainingQuantity;
                                        createPnL(pnls, openLot, txn, openLot.remainingQuantity, 100);
                                        // use dummy lot to update position
                                        const dummyLot = {
                                            accountId: openLot.accountId,
                                            instrumentId: openLot.instrumentId,
                                            remainingQuantity: -1 * openLot.remainingQuantity,
                                            cost: -1 * openLot.cost
                                        } as LotEntity;
                                        createUpdatePosition(positions, dummyLot);
                                        openLot.remainingQuantity = 0;
                                        openLot.cost = 0;
                                    } else {
                                        // partial close
                                        openLot.remainingQuantity = openLot.remainingQuantity - qty;
                                        openLot.cost = openLot.openPrice * openLot.remainingQuantity;
                                        createPnL(pnls, openLot, txn, qty, 100);
                                        // use dummy lot to update position
                                        const dummyLot = {
                                            accountId: openLot.accountId,
                                            instrumentId: openLot.instrumentId,
                                            remainingQuantity: -1 * qty,
                                            cost: -1 * openLot.openPrice * qty
                                        } as LotEntity;
                                        createUpdatePosition(positions, dummyLot);
                                        qty = 0;
                                    }
                                }

                                createUpdateSummary(summaries, txn.accountId, -1 * txn.price! * qty, -1 * txn.price! * qty);
                            }

                            if (qty > 0) {
                                // go through regular workflow of creating short lots
                                const lot = createLot(lots, txn, -1 * qty, 100);
                                createUpdatePosition(positions, lot);
                                createUpdateSummary(summaries, txn.accountId, txn.price! * qty * 100, -1 * (txn.cashCollateral || 0) + txn.price! * qty * 100);
                            }
                        }

                    }

                }
            }

            // summarize positions
            if (localPriceCache) {
                summarizePositions(positions, positionHistories, lots, pnls, summaries, summaryHistories, current, priceCache);
            }
        }

        current.setDate(current.getDate() + 1); // move to next day
    }

}


(async () => {

    console.debug = function () { /* no-op */ };

    const filePath = 'C:/Personal/data.csv';
    const data = await readTransactionsFromCsv(filePath);
    console.log(`Loaded rows: ${data.length}`);

    const txnsSave: TransactionEntity[] = [];
    const txns = getTransactionEntityGroupByDate(data, txnsSave);

    const lots: LotEntity[] = [];
    const positions: PositionEntity[] = [];
    const positionHistories: PositionEntity[] = [];
    const pnls: PnLEntity[] = [];
    const summaries: SummaryEntity[] = [];
    const summaryHistories: SummaryEntity[] = [];

    processTransactions(txns, lots, positions, positionHistories, pnls, summaries, summaryHistories);

    const accounts = [
        {
            "PK": "USER#obslMFAhcGRLmcGFIHtC4A",
            "SK": "ACCOUNT#01KQWHPFQBKS8P8GA8RE01FRX4",
            "accountId": "01KQWHPFQBKS8P8GA8RE01FRX4",
            "accountName": "HSA1",
            "accountNumber": "397038263539",
            "accountType": "HSA",
            "active": true,
            "baseCurrency": "USD",
            "brokerName": "HSA Bank",
            "createdAt": "2026-05-05T17:06:45.631Z",
            "entityType": "ACCOUNT",
            "userId": "obslMFAhcGRLmcGFIHtC4A"
        },
        {
            "PK": "USER#obslMFAhcGRLmcGFIHtC4A",
            "SK": "ACCOUNT#01KQWM6QE218DZ462TXGG8QSHX",
            "accountId": "01KQWM6QE218DZ462TXGG8QSHX",
            "accountName": "Robinhood Investing",
            "accountNumber": "108843913",
            "accountType": "TAXABLE",
            "active": true,
            "baseCurrency": "USD",
            "brokerName": "Robinhood",
            "createdAt": "2026-05-05T17:50:34.969Z",
            "entityType": "ACCOUNT",
            "userId": "obslMFAhcGRLmcGFIHtC4A"
        },
        {
            "PK": "USER#obslMFAhcGRLmcGFIHtC4A",
            "SK": "ACCOUNT#01KQWTE9M761E2HQ9A2FZ7F155",
            "accountId": "01KQWTE9M761E2HQ9A2FZ7F155",
            "accountName": "Vanguard Broker",
            "accountNumber": "66590023",
            "accountType": "TAXABLE",
            "active": true,
            "baseCurrency": "USD",
            "brokerName": "Vanguard",
            "createdAt": "2026-05-05T19:39:34.436Z",
            "entityType": "ACCOUNT",
            "userId": "obslMFAhcGRLmcGFIHtC4A"
        },
        {
            "PK": "USER#obslMFAhcGRLmcGFIHtC4A",
            "SK": "ACCOUNT#01KQWV7PRBK6T6QQE2ZSSCAKDJ",
            "accountId": "01KQWV7PRBK6T6QQE2ZSSCAKDJ",
            "accountName": "Liming SEP-IRA",
            "accountNumber": "43462239",
            "accountType": "IRA",
            "active": true,
            "baseCurrency": "USD",
            "brokerName": "Vanguard",
            "createdAt": "2026-05-05T19:53:27.081Z",
            "entityType": "ACCOUNT",
            "userId": "obslMFAhcGRLmcGFIHtC4A"
        }
    ];

    console.log(txnsSave.length);
    console.log(lots.length);
    console.log(positions.length);
    console.log(positionHistories.length);
    console.log(pnls.length);
    console.log(summaries.length);
    console.log(summaryHistories.length);
    console.log(summaries);

    checkDuplicate(lots);
    checkDuplicate(positions);
    checkDuplicate(positionHistories);
    checkDuplicate(pnls);
    checkDuplicate(summaries);
    checkDuplicate(summaryHistories);

    // await await batchWriteAll(DB_TABLE, accounts);
    await batchWriteAll(DB_TABLE, txnsSave);
    await batchWriteAll(DB_TABLE, lots);
    await batchWriteAll(DB_TABLE, positions);
    await batchWriteAll(DB_TABLE, positionHistories);
    await batchWriteAll(DB_TABLE, pnls);
    await batchWriteAll(DB_TABLE, summaries);
    await batchWriteAll(DB_TABLE, summaryHistories);

})();


function checkDuplicate(data: any[]) {
    const counts: Record<string, number> = {};
    for (const d of data) {
        const key = d.PK + "###" + d.SK;
        counts[key] = (counts[key] || 0) + 1;
    }

    const result = Object.entries(counts)
        .filter(([_, value]) => value > 1);

    console.log(result);
}

