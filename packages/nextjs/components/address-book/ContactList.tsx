import { Contact } from "@polypay/shared";
import { User } from "lucide-react";

interface ContactListProps {
  contacts: Contact[];
  isLoading: boolean;
  selectedContactId: string | null;
  onSelectContact: (contact: Contact) => void;
  selectedGroupName: string | null | undefined;
}

export function ContactList({
  contacts,
  isLoading,
  selectedContactId,
  onSelectContact,
  selectedGroupName,
}: ContactListProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-base-200 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-base-300 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm text-base-content/60 uppercase">
          {selectedGroupName ? selectedGroupName : "All Contacts"}
        </h2>
        <span className="text-sm text-base-content/40">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {contacts.map(contact => (
          <div
            key={contact.id}
            className={`flex items-center gap-4 p-4 rounded-lg transition-colors cursor-pointer ${
              selectedContactId === contact.id ? "bg-primary text-primary-content" : "hover:bg-base-300"
            }`}
            onClick={() => onSelectContact(contact)}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedContactId === contact.id ? "bg-primary-content/20" : "bg-base-300"
              }`}
            >
              <User size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{contact.name}</p>
              <p
                className={`text-sm truncate ${
                  selectedContactId === contact.id ? "text-primary-content/70" : "text-base-content/50"
                }`}
              >
                {formatAddress(contact.address)}
              </p>
            </div>

            {contact.groups && contact.groups.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
                {contact.groups.slice(0, 2).map(({ group }) => (
                  <span
                    key={group?.id}
                    className={`text-xs px-2 py-0.5 rounded-full truncate max-w-[60px] ${
                      selectedContactId === contact.id ? "bg-primary-content/20" : "bg-base-300"
                    }`}
                  >
                    {group?.name}
                  </span>
                ))}
                {contact.groups.length > 2 && (
                  <span
                    key="more-groups"
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedContactId === contact.id ? "bg-primary-content/20" : "bg-base-300"
                    }`}
                  >
                    +{contact.groups.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {contacts.length === 0 && <p className="text-center text-base-content/40 py-8 text-sm">No contacts found</p>}
      </div>
    </div>
  );
}
