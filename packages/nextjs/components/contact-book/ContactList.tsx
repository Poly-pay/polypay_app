import Image from "next/image";
import { Contact } from "@polypay/shared";
import { copyToClipboard } from "~~/utils/copy";
import { formatAddress } from "~~/utils/format";

interface ContactListProps {
  contacts: Contact[];
  isLoading: boolean;
  selectedContactId: string | null;
  onSelectContact: (contact: Contact) => void;
}

// Avatar colors
const avatarColors = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-rose-500",
];

function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}

const SKELETON_ITEMS = Array.from({ length: 4 }, (_, i) => i + 1);

export function ContactList({ contacts, isLoading, selectedContactId, onSelectContact }: ContactListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {SKELETON_ITEMS.map(i => (
          <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-100 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <Image src={"/common/empty-avatar.svg"} alt="No contact" width={200} height={200} />
        <p className="text-2xl font-medium text-main-violet">No contact</p>
        <p className="text-xl text-center text-grey-700">Looks like you don’t have any contacts yet. Let’s add one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact, index) => {
        const isSelected = selectedContactId === contact.id;

        return (
          <div
            key={contact.id}
            onClick={() => onSelectContact(contact)}
            className={`flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all ${
              isSelected ? "bg-main-violet" : "bg-white shadow-sm"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 ${
                isSelected ? "bg-pink-350 border-white" : "bg-grey-200 border-grey-400"
              }`}
            />

            <div
              className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-white font-semibold text-sm">{contact.name.charAt(0).toUpperCase()}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate text-sm ${isSelected ? "text-white" : "text-grey-950"}`}>
                {contact.name}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className={`px-2 py-0.5 rounded-full ${isSelected ? "bg-black" : "bg-blue-700"}`}>
                <p className="text-white text-xs">{formatAddress(contact.address, { start: 3, end: 3 })}</p>
              </div>
              <Image
                src="/contact-book/copy-icon.svg"
                alt="Copy address"
                width={16}
                height={16}
                className={`cursor-pointer ${isSelected ? "brightness-0 invert" : ""}`}
                onClick={() => copyToClipboard(contact.address)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
