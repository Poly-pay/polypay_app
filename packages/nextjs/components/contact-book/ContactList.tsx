import { Contact } from "@polypay/shared";

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

function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ContactList({ contacts, isLoading, selectedContactId, onSelectContact }: ContactListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
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
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-lg">No contacts found</p>
        <p className="text-sm">Add your first contact to get started</p>
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
            className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
              isSelected
                ? "bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-pink-350"
                : "bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-white font-semibold text-sm">{contact.name.charAt(0).toUpperCase()}</span>
            </div>

            {/* Contact Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{contact.name}</p>
              <p className="text-sm text-gray-400 truncate">{formatAddress(contact.address)}</p>
            </div>

            {/* Group Tags */}
            {contact.groups && contact.groups.length > 0 && (
              <div className="flex gap-1 flex-shrink-0">
                {contact.groups.slice(0, 2).map(({ group }) => (
                  <span
                    key={group?.id}
                    className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded-full"
                  >
                    {group?.name}
                  </span>
                ))}
                {contact.groups.length > 2 && (
                  <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                    +{contact.groups.length - 2}
                  </span>
                )}
              </div>
            )}

            {/* Selected Indicator */}
            {isSelected && <div className="w-2 h-2 rounded-full bg-pink-350 flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}
