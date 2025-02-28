import { SubscriptionModalsProps } from '@/types/subscriptions/subscription';
import ConfirmationModal from "@/components/Modal/ConfirmationModal";

export const SubscriptionModals = ({
    isRestoreOpen,
    isChangeOpen,
    onRestoreClose,
    onChangeClose,
    onRestoreConfirm,
    onChangeConfirm,
    selectedPlan
}: SubscriptionModalsProps) => {
    return (
        <>
            <ConfirmationModal
                isOpen={isRestoreOpen}
                onClose={onRestoreClose}
                onConfirm={onRestoreConfirm}
                title="Restore Subscription"
                description={`Continue your ${selectedPlan} plan with automatic renewal?`}
                planName=""
            />

            <ConfirmationModal
                isOpen={isChangeOpen}
                onClose={onChangeClose}
                onConfirm={onChangeConfirm}
                title="Change Subscription"
                description={`Are you sure you want to change to the ${selectedPlan} plan?`}
                planName=""
            />
        </>
    );
};
