import { getInitials, getAvatarColor, formatTime } from '../../lib/utils';
import { Users } from 'lucide-react';

export default function GroupList({ groups, activeChat, onSelect }) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Users className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">No tienes grupos aún</p>
        <p className="text-gray-400 text-xs mt-1">Crea uno con el botón + arriba</p>
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <div
          key={group.id}
          onClick={() => onSelect(group)}
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 transition border-b border-gray-50 ${
            activeChat?.type === 'group' && activeChat?.id === group.id ? 'bg-gray-100' : ''
          }`}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{ backgroundColor: getAvatarColor(group.name) }}
          >
            {getInitials(group.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-[15px] text-gray-800 truncate">{group.name}</p>
              {group.last_message_at && (
                <span className="text-xs text-gray-400 shrink-0 ml-2">
                  {formatTime(group.last_message_at)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <p className="text-sm text-gray-500 truncate">
                {group.last_message || 'Sin mensajes aún'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
