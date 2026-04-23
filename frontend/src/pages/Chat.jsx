import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [activeChat, setActiveChat] = useState(null);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Keep a ref to activeChat so socket handlers always see the latest value
  const activeChatRef = useRef(null);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Limpiar contador de no leídos al abrir un chat
  useEffect(() => {
    if (!activeChat) return;
    const key = activeChat.type === 'dm' ? `dm-${activeChat.id}`
      : activeChat.type === 'channel' ? `channel-${activeChat.id}`
      : `group-${activeChat.id}`;
    setUnreadCounts((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }, [activeChat?.type, activeChat?.id]);

  // Load groups and contacts on mount
  useEffect(() => {
    api.get('/groups').then((res) => setGroups(res.data));
    api.get('/contacts').then((res) => setContacts(res.data));
  }, []);

  // Join group rooms when socket connects
  useEffect(() => {
    if (!socket || groups.length === 0) return;
    groups.forEach((g) => socket.emit('join_group', g.id));
  }, [socket, groups]);

  // Load channels + members when group/channel is selected
  useEffect(() => {
    if (!activeChat) return;
    if (activeChat.type === 'group') {
      api.get(`/groups/${activeChat.id}/channels`).then((res) => setChannels(res.data));
      api.get(`/groups/${activeChat.id}/members`).then((res) => setMembers(res.data));
    } else if (activeChat.type === 'channel' && activeChat.groupId) {
      api.get(`/groups/${activeChat.groupId}/members`).then((res) => setMembers(res.data));
    } else {
      setMembers([]);
    }
  }, [activeChat?.type, activeChat?.id]);

  // Load messages when active chat changes
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
      api.get(endpoint).then((res) => {
        setMessages(res.data);
        // Auto-mark unread messages as read
        if (socket) {
          const unreadIds = res.data
            .filter((m) => m.sender_id !== user.id && m.status !== 'read')
            .map((m) => m.id);
          if (unreadIds.length > 0) {
            socket.emit('mark_read', { message_ids: unreadIds });
          }
        }
      });
    }

    return () => {
      if (activeChat.type === 'channel') {
        socket?.emit('leave_channel', activeChat.id);
      }
    };
  }, [activeChat?.type, activeChat?.id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const chat = activeChatRef.current;

      // Check if this message belongs to the current active chat
      const belongsToActiveChat =
        (chat?.type === 'group' && message.group_id === chat.id && !message.channel_id) ||
        (chat?.type === 'channel' && message.channel_id === chat.id) ||
        (chat?.type === 'dm' && (message.sender_id === chat.id || message.receiver_id === chat.id));

      if (belongsToActiveChat) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Auto-mark as read if the message is from someone else
        if (message.sender_id !== user.id) {
          socket.emit('mark_read', { message_ids: [message.id] });
        }
      } else if (message.sender_id !== user.id) {
        const key = message.channel_id ? `channel-${message.channel_id}`
          : message.group_id ? `group-${message.group_id}`
          : `dm-${message.sender_id}`;
        setUnreadCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      }

      // Always update sidebar last message for groups
      if (message.group_id) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === message.group_id
              ? { ...g, last_message: message.content, last_message_at: message.created_at }
              : g
          )
        );
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

    const handleMessagesRead = ({ message_ids }) => {
      setMessages((prev) =>
        prev.map((m) => (message_ids.includes(m.id) ? { ...m, status: 'read' } : m))
      );
    };

    const handleMessagesDelivered = ({ message_ids }) => {
      setMessages((prev) =>
        prev.map((m) =>
          message_ids.includes(m.id) && m.status === 'sent' ? { ...m, status: 'delivered' } : m
        )
      );
    };

    const handleContactAdded = (contact) => {
      setContacts((prev) => {
        if (prev.some((c) => c.id === contact.id)) return prev;
        return [...prev, contact];
      });
    };

    const handleContactRemoved = ({ user_id }) => {
      setContacts((prev) => prev.filter((c) => c.id !== user_id));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('contact_added', handleContactAdded);
    socket.on('contact_removed', handleContactRemoved);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('contact_added', handleContactAdded);
      socket.off('contact_removed', handleContactRemoved);
    };
  }, [socket, user?.id]);

  const sendMessage = useCallback(
    (content, messageType = 'text', fileUrl = null, fileName = null) => {
      if (!socket || !activeChat) return;

      const data = {
        content,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
      };

      if (activeChat.type === 'group') {
        data.group_id = activeChat.id;
      } else if (activeChat.type === 'channel') {
        data.channel_id = activeChat.id;
        if (activeChat.groupId) data.group_id = activeChat.groupId;
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
    else if (activeChat.type === 'dm') data.receiver_id = activeChat.id;
    socket.emit('typing', data);
  }, [socket, activeChat]);

  const handleStopTyping = useCallback(() => {
    if (!socket || !activeChat) return;
    const data = {};
    if (activeChat.type === 'group') data.group_id = activeChat.id;
    else if (activeChat.type === 'channel') data.channel_id = activeChat.id;
    else if (activeChat.type === 'dm') data.receiver_id = activeChat.id;
    socket.emit('stop_typing', data);
  }, [socket, activeChat]);

  const refreshGroups = () => {
    api.get('/groups').then((res) => setGroups(res.data));
  };

  const refreshMembers = () => {
    const groupId = activeChat?.type === 'group' ? activeChat.id : activeChat?.groupId;
    if (groupId) {
      api.get(`/groups/${groupId}/members`).then((res) => setMembers(res.data));
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--bg-main)', overflow: 'hidden' }}>
      <Sidebar
        groups={groups}
        contacts={contacts}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        onGroupCreated={refreshGroups}
        channels={channels}
        setContacts={setContacts}
        unreadCounts={unreadCounts}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeChat ? (
          <>
            <Header activeChat={activeChat} members={members} typingUsers={typingUsers} onMembersChanged={refreshMembers} />
            <ChatView messages={messages} currentUser={user} typingUsers={typingUsers} />
            <MessageInput onSend={sendMessage} onTyping={handleTyping} onStopTyping={handleStopTyping} />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
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
