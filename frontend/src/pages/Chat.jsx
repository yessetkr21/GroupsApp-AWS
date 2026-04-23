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

    const handleReactionUpdated = ({ message_id, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, reactions } : m))
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('reaction_updated', handleReactionUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('reaction_updated', handleReactionUpdated);
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

  const handleReact = useCallback(
    (messageId, emoji) => {
      if (!socket || !activeChat) return;
      const messageTable = activeChat.type === 'dm' ? 'messages' : 'group_messages';
      const data = { message_id: messageId, emoji, message_table: messageTable };
      if (activeChat.type === 'group') data.group_id = activeChat.id;
      else if (activeChat.type === 'channel') data.channel_id = activeChat.id;
      else if (activeChat.type === 'dm') data.receiver_id = activeChat.id;
      socket.emit('toggle_reaction', data);
    },
    [socket, activeChat]
  );

  const refreshGroups = () => {
    api.get('/groups').then((res) => setGroups(res.data));
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#09090f', overflow: 'hidden' }}>
      <Sidebar
        groups={groups}
        contacts={contacts}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        onGroupCreated={refreshGroups}
        channels={channels}
        setContacts={setContacts}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeChat ? (
          <>
            <Header activeChat={activeChat} members={members} typingUsers={typingUsers} />
            <ChatView messages={messages} currentUser={user} onReact={handleReact} typingUsers={typingUsers} />
            <MessageInput onSend={sendMessage} onTyping={handleTyping} />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090f' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px 0' }}>GroupsApp</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>Selecciona un grupo o contacto para empezar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
