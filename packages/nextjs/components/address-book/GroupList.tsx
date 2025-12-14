import { AddressGroup } from "@polypay/shared";
import { Trash2, Users } from "lucide-react";

interface GroupListProps {
  groups: AddressGroup[];
  isLoading: boolean;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onDeleteGroup: (group: AddressGroup) => void;
}

export function GroupList({
  groups,
  isLoading,
  selectedGroupId,
  onSelectGroup,
  onDeleteGroup,
}: GroupListProps) {
  if (isLoading) {
    return (
      <div className="bg-base-200 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-base-300 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <h2 className="font-semibold mb-4 text-sm text-base-content/60 uppercase">
        Groups
      </h2>

      <div className="space-y-2">
        {/* All Contacts option */}
        <button
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
            selectedGroupId === null
              ? "bg-primary text-primary-content"
              : "hover:bg-base-300"
          }`}
          onClick={() => onSelectGroup(null)}
        >
          <div className="flex items-center gap-3">
            <Users size={18} />
            <span>All Contacts</span>
          </div>
        </button>

        {/* Group list */}
        {groups.map(group => (
          <div
            key={group.id}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
              selectedGroupId === group.id
                ? "bg-primary text-primary-content"
                : "hover:bg-base-300"
            }`}
            onClick={() => onSelectGroup(group.id)}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              <span>{group.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedGroupId === group.id
                    ? "bg-primary-content/20"
                    : "bg-base-300"
                }`}
              >
                {group.contacts?.length || 0}
              </span>
            </div>

            <button
              className={`p-1 rounded hover:bg-error/20 hover:text-error ${
                selectedGroupId === group.id ? "text-primary-content" : ""
              }`}
              onClick={e => {
                e.stopPropagation();
                onDeleteGroup(group);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {groups.length === 0 && (
          <p className="text-center text-base-content/40 py-4 text-sm">
            No groups yet
          </p>
        )}
      </div>
    </div>
  );
}
