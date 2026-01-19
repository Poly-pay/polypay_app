import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: "default" | "compact";
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  variant = "default",
}) => {
  if (variant === "compact") {
    return (
      <div className="relative mb-3">
        <div
          className="absolute left-2 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer bg-[#FCFCFC]"
          style={{ boxShadow: "0 0 4px 0 rgba(18, 18, 18, 0.10)" }}
        >
          <Search size={12} />
        </div>
        <input
          type="text"
          className="w-full bg-grey-50 pl-11 pr-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="relative mb-3">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};
