type LogLevel = 'info' | 'error' | 'warn' | 'debug';

const logger = {
    log(level: LogLevel, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const logMessage = {
            timestamp,
            level,
            message,
            ...(data && { data })
        };

        // Use console methods for server-side logging
        switch (level) {
            case 'error':
                console.error(JSON.stringify(logMessage, null, 2));
                break;
            case 'warn':
                console.warn(JSON.stringify(logMessage, null, 2));
                break;
            case 'debug':
                console.debug(JSON.stringify(logMessage, null, 2));
                break;
            default:
                console.log(JSON.stringify(logMessage, null, 2));
        }

        // You could also write to a file here if needed
        // but for now we'll just use console
    }
};

export function logWebhookEvent(event: string, data: any) {
    logger.log('info', `Webhook ${event}`, data);
}

export function logTransactionDetails(type: string, details: any) {
    logger.log('info', `Transaction ${type}`, details);
}

export function logSubscriptionError(error: any, context: any) {
    logger.log('error', 'Subscription Error', { error, context });
}
