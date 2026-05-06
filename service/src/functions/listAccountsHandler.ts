import { getItemsByPK, getItemsByPKandSK, queryTable, TABLE_NAME } from "@shared/clients/dynamoDb";
import { AccountEntity } from "@shared/models/account";
import { PositionEntity } from "@shared/models/position";
import { SummaryEntity } from "@shared/models/summary";
import { accountPartitionKey, EntityTypeAccount, EntityTypePosition, positionPartitionKey, summaryPartitionKey, summarySortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, internalErrorForDebug, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

interface AccountDetail {
    accountId: string;
    account: AccountEntity;
    positions?: PositionEntity[];
    summary?: SummaryEntity | undefined;
}

export const listAccountsHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
    try {

        const result = parseEvent(event);
        if (!result.success) return badRequest(result.error);

        const { pathParameters, queryStringParameters, userId, stage } = result.data;
        const { summary, position } = queryStringParameters || {};

        const fetchSummary = summary?.toLowerCase() === "true";
        const fetchPosition = position?.toLowerCase() === "true";

        const PK = accountPartitionKey(userId);
        const accounts = await getItemsByPK<AccountEntity>(PK, TABLE_NAME(), EntityTypeAccount);

        if (!fetchSummary && !fetchPosition) {
            return ok(accounts);
        } else {
            const accountDetails = accounts.map(a => {
                return {
                    accountId: a.accountId,
                    account: a
                } as AccountDetail;
            });

            for (const a of accountDetails) {
                if (fetchSummary) {
                    const PK = summaryPartitionKey(userId, a.accountId);
                    const SK = summarySortKey();
                    const summaryItems = await getItemsByPKandSK<SummaryEntity>(PK, SK, TABLE_NAME());
                    a.summary = summaryItems[0];
                }

                if (fetchPosition) {
                    const PK = positionPartitionKey(userId, a.accountId);
                    const queryParams = {
                        TableName: TABLE_NAME(),
                        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :entityType)',
                        FilterExpression: 'quantity <> :zero AND attribute_not_exists(asOfDate)',
                        ExpressionAttributeValues: {
                            ':pk': PK,
                            ':entityType': EntityTypePosition,
                            ':zero': 0
                        }
                    }

                    const queryResult = await queryTable(queryParams);
                    const positionItems = queryResult.Items as PositionEntity[];
                    a.positions = positionItems;
                }
            }

            return ok(accountDetails);
        }

    } catch (error) {
        console.error(error);
        if (process.env.STAGE === "dev") {
            return internalErrorForDebug(error);
        }
        return internalError();
    }
};