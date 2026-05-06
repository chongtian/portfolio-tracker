import { APIGatewayProxyEventPathParameters, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { uuidToBase64Url } from "./uuidToBase64Url";

export interface LambdaContext {
    body: unknown;
    pathParameters?: APIGatewayProxyEventPathParameters | undefined;
    queryStringParameters?: APIGatewayProxyEventQueryStringParameters | undefined;
    userId: string;
    stage: string;
}

type ParseResult =
    | { success: true; data: LambdaContext }
    | { success: false; error: string };

/**
 * Parses an API Gateway proxy event to extract the request body, user ID, and stage.
 * Handles JSON parsing of the body if it's a string, extracts user ID from authorizer claims
 * (checking both standard and JWT claims), with a fallback to body.user_id, and determines
 * the deployment stage from requestContext.stage or defaults to "dev".
 * @param event The API Gateway proxy event from AWS Lambda.
 * @returns A ParseResult object: success with parsed LambdaContext data (containing body, userId, and stage), or failure with an error message.
 */
export const parseEvent = (event: APIGatewayProxyEventV2WithJWTAuthorizer): ParseResult => {
    try {

        const body = (typeof event.body === "string") ? JSON.parse(event.body) : event.body;

        let userId = event.requestContext?.authorizer?.jwt?.claims.sub || null;
        if (!userId) {
            console.warn("User ID not found in authorizer claims");
            userId = body.userId; //fall back to userId in body if available
        } else {
            userId = uuidToBase64Url(userId.toString());
        }

        if (body) {
            body.userId = userId; //override body userId with the one from claims to ensure consistency
        }

        return {
            success: true,
            data: {
                body: body,
                pathParameters: event.pathParameters,
                queryStringParameters: event.queryStringParameters,
                userId: userId?.toString() || "unknown", //fall back to "unknown" if userId is still not found
                stage: event.requestContext?.stage || "dev", //fall back to dev if stage is missing for some reason
            },
        };
    }
    catch (error) {
        return { success: false, error: "Invalid JSON body" };
    }

};