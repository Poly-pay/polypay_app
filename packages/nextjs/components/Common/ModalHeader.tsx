import Image from "next/image";
import { X } from "lucide-react";

interface ModalHeaderProps {
  title: string;
  iconSrc?: string;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ title, iconSrc, onClose }) => {
  return (
    <div className="flex items-center justify-between p-6">
      <div className="flex items-center gap-3">
        {iconSrc && <Image src={iconSrc} alt={`${title} Icon`} width={32} height={32} />}
        <p className="font-semibold text-2xl uppercase">{title}</p>
      </div>
      <X size={20} className="cursor-pointer" onClick={onClose} />
    </div>
  );
};
