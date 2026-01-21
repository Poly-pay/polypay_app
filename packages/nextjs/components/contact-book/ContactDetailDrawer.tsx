"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { EditContact } from "./Editcontact";
import { Contact } from "@polypay/shared";
import { X } from "lucide-react";
import { formatAddress } from "~~/utils/format";

interface ContactDetailDrawerProps {
  isOpen: boolean;
  contact: Contact | null;
  accountId: string | null;
  editing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTransfer: () => void;
  onSuccess: () => void;
  onDelete: () => void;
}

export function ContactDetailDrawer({
  isOpen,
  contact,
  accountId,
  editing,
  onClose,
  onEdit,
  onTransfer,
  onSuccess,
  onDelete,
}: ContactDetailDrawerProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`lg:hidden fixed inset-0 bg-[#2b2929ad] bg-opacity-50 z-40 transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      ></div>
      <div
        className={`lg:hidden fixed right-0 top-0 h-full rounded-2xl w-[400px] max-w-[90vw] bg-white z-50 shadow-2xl transform transition-all duration-300 ease-in-out ${
          isAnimating ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col relative">
          <button
            className="absolute top-4 left-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100"
            onClick={onClose}
          >
            <X width={16} height={16} />
          </button>
          {!editing && (
            <div className="flex-1 flex flex-col">
              <div
                className="w-full h-[40%] flex-shrink-0 rounded-t-2xl"
                style={{
                  background: contact
                    ? "linear-gradient(180deg, #FF7CEB 0%, #FFF 100%)"
                    : "linear-gradient(180deg, #BDBDBD 0%, #FFF 100%)",
                }}
              ></div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
                <div className="w-6 h-64 bg-black py-8 flex flex-col items-center justify-between">
                  {[0, 1, 2].map(index => (
                    <p key={index} className="text-white text-xs font-medium -rotate-90 max-w-16 truncate">
                      {contact?.groups[0]?.group?.name || "PolyPay"}
                    </p>
                  ))}
                </div>
                <div className={contact ? "contact-card relative" : "contact-card-empty relative"}>
                  {contact && contact.groups.length > 0 && (
                    <div className="bg-main-violet rounded-full px-4 py-1.5 absolute top-2 right-2 max-w-40">
                      <p className="text-white text-sm font-medium truncate whitespace-nowrap">
                        {contact?.groups[0].group?.name}
                      </p>
                    </div>
                  )}

                  <div>
                    <Image
                      src={`/contact-book/${contact ? "profile-contact.png" : "empty-profile-contact.png"}`}
                      alt="icon"
                      width={180}
                      height={140}
                      className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/3"
                    />
                  </div>
                  {contact && (
                    <div className="absolute left-2 bottom-4">
                      <p className="text-2xl text-white mb-1 max-w-[200px] truncate">{contact?.name}</p>
                      <div className="rounded-full py-0.5 px-1.5 bg-white w-fit">
                        <p className="text-xs font-medium text-main-navy-blue">
                          {formatAddress(contact?.address ?? "", { start: 3, end: 3 })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {contact && (
                <div className="flex justify-end absolute top-4 right-4">
                  <button
                    className="px-6 py-2.5 rounded-xl bg-white w-fit text-main-black text-sm font-medium shadow-md"
                    onClick={onEdit}
                  >
                    Edit
                  </button>
                </div>
              )}
              {contact && (
                <div className="w-full px-5 bg-grey-50 mt-auto h-20 flex items-center justify-center border-t border-grey-200 rounded-b-2xl">
                  <button className="h-12 px-6 rounded-xl font-medium bg-main-pink w-full" onClick={onTransfer}>
                    Transfer
                  </button>
                </div>
              )}
            </div>
          )}
          {editing && contact && (
            <div className="flex flex-col h-full">
              <EditContact
                contact={contact}
                accountId={accountId ?? ""}
                onSuccess={onSuccess}
                onDelete={onDelete}
                onClose={() => onEdit()}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
