interface CheckboxProps {
  checked: boolean;
  onChange?: () => void;
  variant?: "round" | "square";
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, variant = "square" }) => {
  const baseClasses = "flex items-center justify-center cursor-pointer transition-colors";
  const variantClasses =
    variant === "round"
      ? "w-5 h-5 rounded-full border-2"
      : "w-4 h-4 rounded-md border flex items-center justify-center";

  const checkedClasses = checked ? "bg-main-pink border-white" : "bg-grey-200 border-grey-400";

  return (
    <div className={`${baseClasses} ${variantClasses} ${checkedClasses}`} onClick={onChange}>
      {checked && variant === "round" && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
  );
};
