export interface SubscriptionDetails {
    planName: string;
    renewalDate: string;
    isDowngradePending: boolean;
    creditsRemaining: string;
    planId: string;
}

export interface SubscriptionBannerProps {
    details: SubscriptionDetails | null;
    onRestore: () => void;
    onCancel: () => void;
    formatDate: (date?: string) => string;
}

export interface SubscriptionModalsProps {
    isRestoreOpen: boolean;
    isChangeOpen: boolean;
    onRestoreClose: () => void;
    onChangeClose: () => void;
    onRestoreConfirm: () => void;
    onChangeConfirm: () => void;
    selectedPlan?: string;
}
