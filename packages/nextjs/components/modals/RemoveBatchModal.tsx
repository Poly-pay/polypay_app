import Image from "next/image";
import { ArrowRightIcon } from "../icons/ArrowRight";
import ModalContainer from "./ModalContainer";
import { XIcon } from "lucide-react";
import { ModalProps } from "~~/types/modal";
import { formatAddress, formatAmount } from "~~/utils/format";
import { network } from "~~/utils/network-config";

interface RemoveBatchModalProps extends ModalProps {
  item?: any;
  onRemove?: () => void;
}

const RemoveBatchModel: React.FC<RemoveBatchModalProps> = ({ isOpen, onClose, item, onRemove }) => {
  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      isCloseButton={false}
      className="bg-white max-w-md p-0 rounded-xl"
    >
      <div className="p-3 flex items-center justify-between">
        <div>
          <span className="font-semibold uppercase">CONfirmation</span> <br />
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-sm">Delete transaction</span>
            <div className="text-sm flex items-center gap-1">
              <span>{formatAmount(item.amount, network, item.tokenAddress)}</span>
              <ArrowRightIcon />
              <span className="max-w-[100px] overflow-hidden truncate">
                {item.contact?.name ? (
                  <>
                    <span className="font-medium mr-0.5">{item.contact.name}</span>
                    <span>{"(" + `${formatAddress(item.recipient, { start: 3, end: 3 })}` + ")"}</span>
                  </>
                ) : (
                  formatAddress(item.recipient, { start: 3, end: 3 })
                )}
              </span>
            </div>
          </div>
        </div>
        <XIcon width={16} height={16} onClick={onClose} className="mr-1 cursor-pointer" />
      </div>
      <div className="flex flex-col items-center justify-center w-full gap-5 my-5">
        <Image src="/modals/remove.svg" alt="Remove Batch" width={200} height={200} />
        <span className="text-red-500 text-center text-xl">
          Are you sure you want to delete this <br /> transaction from batch?
        </span>
      </div>
      <div className="flex gap-1.5  bg-grey-50 px-5 py-4 rounded-b-xl">
        <button onClick={onClose} className="w-[90px] text-center text-sm font-medium bg-grey-100 rounded-lg h-9">
          Cancel
        </button>
        <button
          className="flex-1 text-white text-sm font-medium rounded-lg bg-red-500 h-9"
          onClick={() => {
            onRemove?.();
            onClose();
          }}
        >
          Delete
        </button>
      </div>
    </ModalContainer>
  );
};

export default RemoveBatchModel;
