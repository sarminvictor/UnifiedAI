import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  planName: string;
  description: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, planName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Confirm Subscription Change</h2>
        <p className="mb-4">
          You are about to change your subscription to the <strong>{planName}</strong> plan.
          All current credits will be canceled, and a new subscription period will start from now.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="modal-cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="modal-confirm-button"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
