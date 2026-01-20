interface FormButtonsProps {
  onCancel: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  submitText?: string;
  cancelText?: string;
}

export const FormButtons: React.FC<FormButtonsProps> = ({
  onCancel,
  isLoading = false,
  submitText = "Submit",
  cancelText = "Cancel",
}) => {
  return (
    <div className="flex gap-3 mt-6 bg-grey-50 p-4 border-t border-grey-200 rounded-b-3xl">
      <button
        type="button"
        className="flex-1 p-3 max-w-[90px] w-full bg-grey-100 font-medium rounded-xl transition-colors cursor-pointer"
        onClick={onCancel}
      >
        {cancelText}
      </button>
      <button
        type="submit"
        className="flex-[2] px-6 py-3 bg-pink-350 font-medium rounded-xl hover:bg-pink-450 transition-colors disabled:opacity-50 cursor-pointer"
        disabled={isLoading}
      >
        {isLoading ? <span className="loading loading-spinner loading-sm" /> : submitText}
      </button>
    </div>
  );
};
