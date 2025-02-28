import { useCallback, useEffect, useRef } from 'react';
import { useSubscriptionState } from './useSubscriptionState';
import { useSubscriptionAPI } from './useSubscriptionAPI';
import { useSubscriptionUI } from './useSubscriptionUI';
import { useSubscriptionSSE } from './useSubscriptionSSE';
import type { SubscriptionUpdateEvent } from '@/types/api/subscriptions';

export function useSubscription() {
    const state = useSubscriptionState();
    const api = useSubscriptionAPI(state);
    const ui = useSubscriptionUI(state);
    const initialFetchRef = useRef(false);

    const handleSubscriptionUpdate = useCallback((event: SubscriptionUpdateEvent) => {
        state.setSubscriptionDetails(event.details);
    }, [state.setSubscriptionDetails]);

    useSubscriptionSSE(handleSubscriptionUpdate);

    // Initial data fetching - only once
    useEffect(() => {
        if (!initialFetchRef.current) {
            initialFetchRef.current = true;
            api.fetchPlans();
            api.fetchSubscriptionDetails();
        }
    }, [api]);

    return {
        ...state,
        ...api,
        ...ui,
    };
}
