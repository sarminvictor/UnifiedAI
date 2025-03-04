import useSWR from 'swr';
import { AIProvider, ModelName } from '@/types/ai.types';

interface AISettings {
    provider: AIProvider;
    model: ModelName;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
};

export function useAISettings() {
    const { data, error, mutate } = useSWR<AISettings>('/api/settings/ai', fetcher);

    const setProvider = async (provider: AIProvider) => {
        try {
            const updatedData = await fetch('/api/settings/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, model: data?.model || 'gpt-3.5-turbo' })
            }).then(res => res.json());

            mutate(updatedData, false); // Update the local data without revalidation
        } catch (error) {
            console.error('Failed to update provider:', error);
        }
    };

    const setModel = async (model: ModelName) => {
        try {
            const updatedData = await fetch('/api/settings/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, provider: data?.provider || AIProvider.OPENAI })
            }).then(res => res.json());

            mutate(updatedData, false); // Update the local data without revalidation
        } catch (error) {
            console.error('Failed to update model:', error);
        }
    };

    return {
        provider: data?.provider || AIProvider.OPENAI,
        model: data?.model || 'gpt-3.5-turbo',
        setProvider,
        setModel,
        isLoading: !error && !data,
        isError: error
    };
}
