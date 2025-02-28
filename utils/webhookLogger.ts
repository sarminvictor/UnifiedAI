export function logWebhookEvent(type: string, data: any) {
    console.log('🎣 Webhook Event >', {
        type,
        timestamp: new Date().toISOString(),
        data: JSON.stringify(data, null, 2)
    });
}

export function logTransactionDetails(action: string, details: any) {
    console.log('💳 Transaction >', {
        action,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(details, null, 2)
    });
}
