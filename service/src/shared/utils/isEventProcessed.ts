import { getItemsByPKandSK } from "@shared/clients/dynamoDb";
import { processedPartitionKey, processedSortKey } from "./getKeys";

export const isEventProcessed = async (eventID: string, tableName: string): Promise<boolean> => {

    try {
        const processed = await getItemsByPKandSK(processedPartitionKey(eventID), processedSortKey(), tableName);
        return processed && processed.length > 0;

    } catch (error) {
        return true;
    }
}