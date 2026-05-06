import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
    BatchWriteCommand,
    QueryCommandInput,
    UpdateCommandInput,
    TransactWriteCommand,
    TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";

export type TransactItems = NonNullable<TransactWriteCommandInput["TransactItems"]>;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const TABLE_NAME = (stage?: string) => {
    // return `${process.env.TABLE_NAME ?? "portfolio_tracker"}_${stage ?? "dev"}`;
    return process.env.TABLE_NAME ?? "portfolio_tracker_dev";
};

export const sendCommand = async (command: TransactWriteCommand) => {
    return await docClient.send(command);
}

export const putItem = async (item: Record<string, unknown> | object, tableName: string, conditionExpression?: string) =>
    docClient.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: conditionExpression }));

export const getItem = async <T = Record<string, unknown>>(key: Record<string, unknown>, tableName: string) => {
    const result = await docClient.send(new GetCommand({ TableName: tableName, Key: key }));
    return result.Item as T | undefined;
};

export const deleteItem = async (key: Record<string, unknown> | object, tableName: string, conditionExpression?: string) =>
    docClient.send(new DeleteCommand({ TableName: tableName, Key: key, ConditionExpression: conditionExpression }));

const queryItems = async <T = Record<string, unknown>>(params: QueryCommandInput) => {
    const result = await docClient.send(new QueryCommand(params));
    return (result.Items ?? []) as T[];
};

export const updateItem = async (params: UpdateCommandInput) =>
    docClient.send(new UpdateCommand(params));

export const batchWriteItems = async (requestItems: Record<string, any[]>) =>
    docClient.send(new BatchWriteCommand({ RequestItems: requestItems }));

export const getItemsByPK = async <T = Record<string, unknown>>(pkValue: string, tableName: string, entityType?: string) => {

    const params = entityType ?
        {
            TableName: tableName,
            KeyConditionExpression: "PK = :pkValue AND begins_with(SK, :entityType)",
            ExpressionAttributeValues: {
                ":pkValue": pkValue,
                ":entityType": entityType,
            },
        } : {
            TableName: tableName,
            KeyConditionExpression: "PK = :pkValue",
            ExpressionAttributeValues: {
                ":pkValue": pkValue,
            },
        };

    const result = await queryItems<T>(params);
    return result;
}

export const getItemsByPKandSK = async <T = Record<string, unknown>>(pkValue: string, skValue: string, tableName: string) => {

    const params = {
        TableName: tableName,
        KeyConditionExpression: "PK = :pkValue AND SK = :skValue",
        ExpressionAttributeValues: {
            ":pkValue": pkValue,
            ":skValue": skValue,
        },
    };

    const result = await queryItems<T>(params);
    return result;
}

export const queryTable = async (params: QueryCommandInput) => {
    const result = await docClient.send(new QueryCommand(params));
    return result;
};
