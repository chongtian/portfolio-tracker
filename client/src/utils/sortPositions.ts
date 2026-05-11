import type { PositionEntity } from "../models/position"

export const sortPositions =
    (a: PositionEntity, b: PositionEntity) => {
        // Options are on top          
        // If both are Options, sort by their expiration
        // Otherwise, sort by market value
        if (a.instrumentId.length > 5 && b.instrumentId.length > 5) {
            const regex = /(\d{6})[PC]/
            const match1 = regex.exec(a.instrumentId)
            const match2 = regex.exec(b.instrumentId)
            if (match1 && match2) {
                return match1[1].localeCompare(match2[1])
            } else {
                // fall back to sort by instrumentId
                return a.instrumentId.localeCompare(b.instrumentId)
            }
        } else if (a.instrumentId.length > 5 && b.instrumentId.length <= 5) {
            return -1
        } else if (b.instrumentId.length > 5 && a.instrumentId.length <= 5) {
            return 1
        } else {
            return (b.marketValue || 0) - (a.marketValue || 0)
        }
    };