export type ApiResponse = {
    statusCode: number;
    headers: {
        "Content-Type": "application/json";
    };
    body: string;
};

const response = (statusCode: number, body: unknown): ApiResponse => {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };
}

export const ok = (body: unknown) => response(200, body);

export const okCreated = (body: unknown) => response(201, body);

export const okDeleted = () => response(204, null);

export const badRequest = (message: string) => response(400, { message });

export const notFound = (message: string) => response(404, { message });

// We don't want to leak internal error details to the client, so we return a generic message
export const internalError = () => response(500, { message: "Internal Server Error" });

export const internalErrorForDebug = (error: unknown) => response(500, error);