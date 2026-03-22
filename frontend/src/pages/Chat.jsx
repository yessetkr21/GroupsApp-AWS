import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import ChatView from '../components/chat/ChatView';
import MessageInput from '../components/chat/MessageInput';

export default function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { type: 'group'|'channel'|'dm', id, name, ... }
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Load groups and contacts
  useEffect(() => {
    api.get('/groups').then((res) => setGroups(res.data));
    api.get('/contacts').then((res) => setContacts(res.data));
  }, []);

  // Join group rooms on socket connect
  useEffect(() => {
    if (!socket || groups.length === 0) return;
    groups.forEach((g) => socket.emit('join_group', g.id));
  }, [socket, groups]);

  // Load channels when group is selected
  useEffect(() => {
    if (activeChat?.type === 'group') {
      api.get(`/groups/${activeChat.id}/channels`).then((res) => setChannels(res.data));
      api.get(`/groups/${activeChat.id}/members`).then((res) => setMembers(res.data));
    }
  }, [activeChat?.type, activeChat?.id]);

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChat) return;
    setMessages([]);
    setTypingUsers([]);

    let endpoint;
    if (activeChat.type === 'group') {
      endpoint = `/messages/group/${activeChat.id}`;
    } else if (activeChat.type === 'channel') {
      endpoint = `/messages/channel/${activeChat.id}`;
      socket?.emit('join_channel', activeChat.id);
    } else if (activeChat.type === 'dm') {
      endpoint = `/messages/dm/${activeChat.id}`;
    }

    if (endpoint) {
      api.get(endpoint).then((res) => setMessages(res.data));
    }

    return () => {
      if (activeChat.type === 'channel') {
        socket?.emit('leave_channel', activeChat.id);
      }
    };
  }, [activeChat?.type, activeChat?.id]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      // Update group last message
      if (message.group_id) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === message.group_id ? { ...g, last_message: message.content, last_message_at: message.created_at } : g
          )
        );
      }

      // Mark as read if it's the active chat
      if (message.sender_id !== user.id) {
        const isActive =
          (activeChat?.type === 'group' && message.group_id === activeChat.id && !message.channel_id) ||
          (activeChat?.type === 'channel' && message.channel_id === activeChat.id) ||
          (activeChat?.type === 'dm' && message.sender_id === activeChat.id);

        if (isActive) {
          socket.emit('mark_read', { message_ids: [message.id] });
        }
      }
    };

    const handleTyping = ({ user_id, username }) => {
      if (user_id === user.id) return;
      setTypingUsers((prev) => {
        if (prev.some((t) => t.user_id === user_id)) return prev;
        return [...prev, { user_id, username }];
      });
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((t) => t.user_id !== user_id));
      }, 3000);
    };

    const handleStopTyping = ({ user_id }) => {
      setTypingUsers((prev) => prev.filter((t) => t.user_id !== user_id));
    };

    const handleMessagesRead = ({ reader_id, message_ids }) => {
      setMessages((prev) =>
        prev.map((m) => (message_ids.includes(m.id) ? { ...m, status: 'read' } : m))
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, activeChat, user?.id]);

  const sendMessage = useCallback(
    (content, messageType = 'text', fileUrl = null, fileName = null) => {
      if (!socket || !activeChat) return;

      const data = {
        content,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        tempId: Date.now(),
      };

      if (activeChat.type === 'group') {
        data.group_id = activeChat.id;
      } else if (activeChat.type === 'channel') {
        data.channel_id = activeChat.id;
      } else if (activeChat.type === 'dm') {
        data.receiver_id = activeChat.id;
      }

      socket.emit('send_message', data);
    },
    [socket, activeChat]
  );

  const handleTyping = useCallback(() => {
    if (!socket || !activeChat) return;
    const data = {};
    if (activeChat.type === 'group') data.group_id = activeChat.id;
    else if (activeChat.type === 'channel') data.channel_id = activeChat.id;
    socket.emit('typing', data);
  }, [socket, activeChat]);

  const refreshGroups = () => {
    api.get('/groups').then((res) => setGroups(res.data));
  };

  return (
    <div className="h-screen flex bg-[#f0f2f5]">
      {/* Main container */}
      <div className="flex w-full max-w-[1600px] mx-auto shadow-xl h-full">
        {/* Sidebar */}
        <Sidebar
          groups={groups}
          contacts={contacts}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          onGroupCreated={refreshGroups}
          channels={channels}
          setContacts={setContacts}
        />

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {activeChat ? (
            <>
              <Header
                activeChat={activeChat}
                members={members}
                typingUsers={typingUsers}
              />
              <ChatView
                messages={messages}
                currentUser={user}
              />
              <MessageInput
                onSend={sendMessage}
                onTyping={handleTyping}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
              <div className="text-center">
                <div className="w-64 h-64 mx-auto mb-6 flex items-center justify-center">
                  <svg viewBox="0 0 303 172" width="250" className="opacity-30">
                    <path fill="#DAF7C3" d="M229.565 160.229c32.647-12.196 50.461-45.109 42.594-78.452-3.554-15.075-13.084-27.596-26.116-35.85-12.893-8.166-28.571-11.675-43.565-10.394-7.652.654-15.202 2.463-22.098 5.663-7.119 3.303-13.5 7.942-19.443 13.07a131.4 131.4 0 0 0-16.378 17.262c-5.168 6.537-10.058 13.48-16.064 19.302-5.9 5.72-13.122 10.164-21.1 11.107-7.957.94-16.339-1.92-21.327-8.242-4.87-6.17-5.773-14.422-4.73-22.065 1.04-7.627 3.875-14.886 7.394-21.657 3.52-6.77 7.718-13.12 11.887-19.462 4.17-6.342 8.311-12.677 11.743-19.382 5.028-9.827 8.627-21.058 5.817-31.727-2.82-10.72-13.198-19.013-24.226-19.676-5.46-.328-10.974 1.072-15.586 3.89-4.612 2.82-8.356 6.997-10.792 11.862-4.936 9.858-4.726 21.706-1.37 32.09 3.355 10.385 9.285 19.718 15.514 28.67 13.125 18.862 28.718 36.174 40.14 55.96 5.694 9.867 10.44 20.479 12.214 31.742.926 5.882.97 11.884-.289 17.706-1.258 5.82-3.915 11.413-8.106 15.539-4.153 4.087-10.11 6.488-16.133 5.988-5.908-.492-11.373-3.908-14.633-8.86-3.218-4.89-4.193-10.944-3.57-16.75.627-5.842 2.717-11.426 5.327-16.702 10.476-21.168 28.89-37.506 50.34-44.474"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-light text-gray-600 mb-2">GroupsApp Web</h2>
                <p className="text-gray-400">Selecciona un grupo o contacto para empezar a chatear</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
