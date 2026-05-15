import { summarizePositions } from "@shared/business/summarizePositions";
import { getItemsByPKandSK, putItem, TABLE_NAME } from "@shared/clients/dynamoDb";
import { UserMetadata } from "@shared/models/user";
import { metadataPartitionKey, userSortKey } from "@shared/utils/getKeys";
import { parseEvent } from "@shared/utils/parseEvent";
import { badRequest, internalError, ok } from "@shared/utils/response";
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from "aws-lambda";

type ScheduleEventPayload = {
    action: string;
};

const isApiGatewayEvent = (event: any): event is APIGatewayProxyEventV2WithJWTAuthorizer => event?.requestContext?.http !== undefined;
const isEventBridgeEvent = (event: any): event is ScheduleEventPayload => !!event?.action;

export const summarizePositionHandler = async (event: any):
    Promise<APIGatewayProxyResult | { ok: boolean; message: string }> => {

    if (isApiGatewayEvent(event)) {

        try {
            const result = parseEvent(event);
            if (!result.success) return badRequest(result.error);

            const { body, userId, stage } = result.data;
            const results = await summarizePositions(userId, TABLE_NAME(), 'API Gateway');

            return ok(results);

        } catch (error) {
            console.error(error);
            return internalError();
        }

    }

    if (isEventBridgeEvent(event)) {
        if (event.action === 'summarize_positions') {
            try {

                const users = await getItemsByPKandSK<UserMetadata>(metadataPartitionKey, userSortKey, TABLE_NAME());

                for (const user of users) {
                    await summarizePositions(user.userId, TABLE_NAME(), 'EventBridge');
                }

                return { ok: true, message: 'Successfully summarized all Positions' };

            } catch (error) {
                console.error(error);
                return { ok: false, message: 'Failed to summarize all Positions' };
            }
        } 
    }

    console.log("Full Event Structure:", JSON.stringify(event, null, 2));
    throw new Error(`Unsupported event source. `);
};