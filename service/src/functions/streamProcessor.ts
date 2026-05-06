import { EntityTypeCash} from '@shared/utils/getKeys';
import { isEventProcessed } from '@shared/utils/isEventProcessed';
import { DynamoDBStreamEvent } from 'aws-lambda';

// this function is a placeholder to handle DynamoDB stream event
export const streamProcessor = async (event: DynamoDBStreamEvent): Promise<void> => {
    for (const record of event.Records) {
        console.log('Event ID:', record.eventID);
        console.log('Event Name:', record.eventName); // INSERT, MODIFY, REMOVE

        if (record.dynamodb && record.eventID && record.eventSourceARN) {
            const tableName = record.eventSourceARN?.split("/")[1];
            const newImage = record.dynamodb.NewImage;
            const oldImage = record.dynamodb.OldImage;

            const SK = newImage?.SK?.S || oldImage?.SK?.S;
            if (!SK) {
                console.log('SK not found in record, skipping...');
                continue;
            }

            if (await isEventProcessed(record.eventID, tableName!)) {
                console.log('Event already processed, skipping...');
                continue;
            }

            if (SK.startsWith(EntityTypeCash)) {
                console.log('Processing cash record...');
                // update summary and networth
            }
        }
    }
};