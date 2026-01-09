import ModalContainer from "./ModalContainer";
import { QRCodeSVG } from "qrcode.react";
import { ModalProps } from "~~/types/modal";
import { notification } from "~~/utils/scaffold-eth";

interface QRAddressReceiverModalProps extends ModalProps {
  address?: string;
}

const QRAddressReceiverModal: React.FC<QRAddressReceiverModalProps> = ({ isOpen, onClose, address }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(address ?? "");
    notification.success("Address copied to clipboard");
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      isCloseButton={true}
      className="bg-[url('/common/bg-qrcode.png')] bg-no-repeat bg-center bg-cover rounded-2xl w-[600px] px-0 pb-0"
    >
      <div className="flex flex-col p-5 pb-0">
        <div className="w-full mb-3">
          <div className="flex items-center justify-center">
            <div className="font-semibold text-white text-[24px] w-[420px] text-center">
              Scan the QR code or copy your wallet address to receive tokens securely
            </div>
          </div>
        </div>

        <div className="mb-4 p-4 flex flex-col gap-5 justify-center items-center bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
          <QRCodeSVG
            value={address ?? ""}
            size={280}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            imageSettings={{
              src: `/logo/polypay-icon.svg`,
              width: 64,
              height: 64,
              excavate: true,
            }}
            className="border-pink-350 border-8 rounded-3xl cursor-pointer"
            onClick={handleCopy}
          />
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between gap-2 p-3 bg-gray-200 rounded-2xl border">
              <div className="flex-1 font-mono text-md text-grey-1000 font-semibold break-all">{address}</div>
              <span className="text-white bg-black px-3 py-1 rounded-3xl cursor-pointer" onClick={handleCopy}>
                Copy
              </span>
            </div>
          </div>
        </div>
      </div>
    </ModalContainer>
  );
};

export default QRAddressReceiverModal;
