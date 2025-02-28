import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { SubscriptionUpdateEvent } from '@/types/api/subscriptions';

export function useSubscriptionSSE(
    onSubscriptionUpdate: (data: SubscriptionUpdateEvent) => void
) {
    const { data: session } = useSession();
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (!session?.user?.id) return;

        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 3000;

        const connectSSE = () => {
            const eventSource = new EventSource(`/api/subscriptions/updates`);
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'subscription_updated') {
                        onSubscriptionUpdate(data);
                    }
                } catch (error) {
                    console.error("❌ Error processing SSE update:", error);
                }
            };

            eventSource.onopen = () => {
                retryCount = 0;
            };

            eventSource.onerror = () => {
                eventSource.close();
                if (retryCount < maxRetries) {
                    retryCount++;
                    reconnectTimeoutRef.current = setTimeout(connectSSE, retryDelay);
                }
            };

            return eventSource;
        };

        const eventSource = connectSSE();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            eventSource.close();
        };
    }, [session?.user?.id, onSubscriptionUpdate]);
}
