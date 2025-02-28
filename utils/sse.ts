type SSEConnection = {
    writer: WritableStreamDefaultWriter<any>;
    userId: string;
};

const connections = new Map<string, SSEConnection>();

export const addConnection = (userId: string, writer: WritableStreamDefaultWriter<any>) => {
    connections.set(userId, { writer, userId });
    console.log(`✅ SSE connection added for user: ${userId}`);
};

export const removeConnection = (userId: string) => {
    connections.delete(userId);
    console.log(`❌ SSE connection removed for user: ${userId}`);
};

export const sendSubscriptionUpdate = async (userId: string, data: any) => {
    const connection = connections.get(userId);
    if (!connection) {
        console.log(`⚠️ No active SSE connection for user: ${userId}`);
        return;
    }

    try {
        const encoder = new TextEncoder();
        await connection.writer.write(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
        console.log(`✅ SSE update sent to user: ${userId}`);
    } catch (error) {
        console.error(`❌ Failed to send SSE update to user: ${userId}`, error);
        removeConnection(userId);
    }
};
