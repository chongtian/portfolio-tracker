import { EntityTypeAccount, EntityTypeCash, EntityTypeTransaction } from '@shared/utils/getKeys';
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';

export const streamProcessor = async (event: DynamoDBStreamEvent): Promise<void> => {
    for (const record of event.Records) {
        console.log('Event ID:', record.eventID);
        console.log('Event Name:', record.eventName); // INSERT, MODIFY, REMOVE

        if (record.dynamodb) {
            const tableName = record.eventSourceARN?.split("/")[1];
            const newImage = record.dynamodb.NewImage;
            const oldImage = record.dynamodb.OldImage;

            if (newImage) {
                const SK = newImage.SK?.S;
                if (!SK?.startsWith(EntityTypeTransaction)){
                    console.log(`Skipped item with SK: ${SK}`);
                    continue;
                }
            }

        }
    }
};