import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_POSTS, CURRENT_USER, DM_CONVERSATIONS } from '../mockData';
import type { DmConversation, DmMessage } from '../types';
import { Avatar, AuthorName, PageHeader } from '../components/shared';

// ─── 会话列表 ────────────────────────────────────────────────────
export function DmListPage() {
  const { navigate, goBack, canGoBack, t } = useApp();
  const [conversations, setConversations] = useState<DmConversation[]>(DM_CONVERSATIONS);
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="page">
      <PageHeader
        title={t(totalUnread > 0 ? `私信 (${totalUnread})` : '私信', totalUnread > 0 ? `Messages (${totalUnread})` : 'Messages')}
        onBack={canGoBack ? goBack : undefined}
      />
      <div className="scroll-area">
        {conversations.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <p>{t('暂无私信', 'No messages yet')}</p>
          </div>
        ) : (
          <div className="dm-list">
            {conversations.map(conv => (
              <button
                key={conv.id}
                type="button"
                className="dm-list-item"
                onClick={() => {
                  setConversations(prev =>
                    prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)
                  );
                  navigate({ page: 'P_DM_CHAT', peerId: conv.peer });
                }}
              >
                <div className="dm-item-avatar-wrap">
                  <Avatar index={conv.peerAvatarIdx} seed={conv.peer} />
                  {conv.unread > 0 && (
                    <span className="dm-unread-dot">{conv.unread > 9 ? '9+' : conv.unread}</span>
                  )}
                </div>
                <div className="dm-item-body">
                  <div className="dm-item-top">
                    <AuthorName name={conv.peer} className="dm-item-name" />
                    <span className="dm-item-time">{conv.lastTime}</span>
                  </div>
                  <p className={`dm-item-preview${conv.unread > 0 ? ' dm-item-preview--unread' : ''}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 提取日期前缀用于分组（去掉 "HH:MM" 部分）
function datePrefix(time: string): string {
  return time.replace(/\s\d{1,2}:\d{2}$/, '').trim();
}

// ─── 单个会话 ────────────────────────────────────────────────────
export function DmChatPage({ peerId }: { peerId: string }) {
  const { goBack, navigate, t } = useApp();
  const found = DM_CONVERSATIONS.find(c => c.peer === peerId);
  const firstPost = ALL_POSTS.find(p => p.author === peerId);
  const conv: DmConversation = found ?? {
    id: `dm-new-${peerId}`,
    peer: peerId,
    peerAvatarIdx: firstPost ? ALL_POSTS.indexOf(firstPost) % 3 : 0,
    lastMessage: '',
    lastTime: '',
    unread: 0,
    messages: [],
  };
  const [messages, setMessages] = useState<DmMessage[]>(conv.messages);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: DmMessage = {
      id: `msg-${Date.now()}`,
      from: 'me',
      text: trimmed,
      time: '刚刚',
    };
    setMessages(prev => [...prev, msg]);
    setText('');

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-r`,
        from: 'peer',
        text: t('收到，稍后回复你 😊', "Got it, I'll reply soon 😊"),
        time: '刚刚',
      }]);
    }, 1200);
  };

  return (
    <div className="page dm-chat-page">
      <div className="dm-chat-header">
        <button type="button" className="dm-chat-back" onClick={goBack} aria-label={t('返回', 'Back')}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <button type="button" className="dm-peer-profile-btn" onClick={() => navigate({ page: 'P6', authorName: conv.peer })} aria-label={t('查看主页', 'View profile')}>
          <Avatar index={conv.peerAvatarIdx} seed={conv.peer} />
        </button>
        <AuthorName name={conv.peer} className="dm-chat-peer-name" />
      </div>

      <div className="dm-chat-scroll">
        {messages.map((msg, i) => {
          const showDivider = i === 0 || datePrefix(msg.time) !== datePrefix(messages[i - 1].time);
          return (
            <div key={msg.id}>
              {showDivider && (
                <div className="dm-time-divider">{msg.time}</div>
              )}
              <div className={`dm-bubble-row${msg.from === 'me' ? ' dm-bubble-row--me' : ''}`}>
                {msg.from === 'peer' ? (
                  <button type="button" className="dm-peer-profile-btn" onClick={() => navigate({ page: 'P6', authorName: conv.peer })} aria-label={t('查看主页', 'View profile')}>
                    <Avatar index={conv.peerAvatarIdx} seed={conv.peer} />
                  </button>
                ) : (
                  <button type="button" className="dm-peer-profile-btn" onClick={() => navigate({ page: 'P6', authorName: CURRENT_USER })} aria-label={t('查看主页', 'View profile')}>
                    <Avatar index={0} seed={CURRENT_USER} />
                  </button>
                )}
                <div className={`dm-bubble${msg.from === 'me' ? ' dm-bubble--me' : ''}`}>
                  <p className="dm-bubble-text">{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="dm-chat-composer">
        <input
          className="dm-chat-input"
          placeholder={t('发送消息…', 'Send a message…')}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
        />
        <button
          type="button"
          className="dm-chat-send"
          onClick={send}
          disabled={!text.trim()}
          aria-label={t('发送', 'Send')}
        >
          <Send size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
