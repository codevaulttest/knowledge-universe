import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Headset, Package, Send } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_POSTS, CURRENT_USER, DM_CONVERSATIONS } from '../mockData';
import type { DmConversation, DmMessage } from '../types';
import { Avatar, AuthorName, PageHeader } from '../components/shared';
import { formatTokenAmount } from '../stakeConfig';
import { getShopMinPrice } from '../shopUtils';

/** 客服工单的会话对象标识，与买卖双方的用户名区分开 */
export const SUPPORT_PEER = '客服';

/** 客服工单用平台图标，与买卖双方的头像区分开 */
function ConversationAvatar({ conv }: { conv: DmConversation }) {
  if (conv.kind === 'support') {
    return (
      <span className="dm-support-avatar" aria-hidden="true">
        <Headset size={20} strokeWidth={2} />
      </span>
    );
  }
  return <Avatar index={conv.peerAvatarIdx} seed={conv.peer} />;
}

// ─── 会话列表 ────────────────────────────────────────────────────
export function DmListPage() {
  const { navigate, goBack, canGoBack, t } = useApp();
  const [conversations, setConversations] = useState<DmConversation[]>(DM_CONVERSATIONS);
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="page">
      <PageHeader
        title={totalUnread > 0 ? t('消息 ({count})', { count: totalUnread }) : t('消息')}
        onBack={canGoBack ? goBack : undefined}
      />
      <div className="scroll-area">
        {conversations.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <p>{t('暂无消息')}</p>
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
                  navigate({ page: 'P_DM_CHAT', peerId: conv.peer, orderId: conv.orderId, productId: conv.productId });
                }}
              >
                <div className="dm-item-avatar-wrap">
                  <ConversationAvatar conv={conv} />
                  {conv.unread > 0 && (
                    <span className="dm-unread-dot">{conv.unread > 9 ? '9+' : conv.unread}</span>
                  )}
                </div>
                <div className="dm-item-body">
                  <div className="dm-item-top">
                    {conv.kind === 'support' ? (
                      <span className="dm-item-name">{t('客服')}</span>
                    ) : (
                      <AuthorName name={conv.peer} className="dm-item-name" />
                    )}
                    <span className="dm-item-time">{conv.lastTime}</span>
                  </div>
                  {conv.productTitle && (
                    <p className="dm-item-context">
                      {conv.kind === 'support' && (
                        <span className="dm-item-support-tag">{t('客服介入')}</span>
                      )}
                      {conv.productTitle}
                    </p>
                  )}
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
export function DmChatPage({ peerId, orderId, productId }: { peerId: string; orderId?: string; productId?: string }) {
  const { goBack, navigate, t, requireWallet, shopOrders } = useApp();
  const found = orderId
    ? DM_CONVERSATIONS.find(c => c.peer === peerId && c.orderId === orderId)
    : DM_CONVERSATIONS.find(c => c.peer === peerId);
  const firstPost = ALL_POSTS.find(p => p.author === peerId);
  const linkedOrder = orderId ? shopOrders.find(o => o.id === orderId) : undefined;
  const linkedProduct = productId ? ALL_POSTS.find(p => p.id === productId) : undefined;
  const conv: DmConversation = found ?? {
    id: `dm-new-${peerId}${orderId ? `-${orderId}` : ''}`,
    peer: peerId,
    peerAvatarIdx: firstPost ? ALL_POSTS.indexOf(firstPost) % 3 : 0,
    lastMessage: '',
    lastTime: '',
    unread: 0,
    messages: [],
    kind: peerId === SUPPORT_PEER ? 'support' : 'trade',
    orderId,
    productTitle: linkedOrder?.productTitle,
  };
  const isSupport = conv.kind === 'support';
  const [messages, setMessages] = useState<DmMessage[]>(() => [
    ...conv.messages,
    ...(linkedProduct ? [{
      id: `product-${linkedProduct.id}-${Date.now()}`,
      from: 'me' as const,
      text: '',
      time: '刚刚',
      productId: linkedProduct.id,
    }] : []),
  ]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSharedProductId = useRef(productId);

  // 同一买卖双方的会话可连续从多件商品进入；每次入口都留下对应商品卡，而非替换旧上下文。
  useEffect(() => {
    if (!linkedProduct || productId === lastSharedProductId.current) return;
    setMessages(prev => [...prev, {
      id: `product-${linkedProduct.id}-${Date.now()}`,
      from: 'me',
      text: '',
      time: '刚刚',
      productId: linkedProduct.id,
    }]);
    lastSharedProductId.current = productId;
  }, [linkedProduct, productId]);

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
        text: isSupport ? t('已记录，处理专员会在 48 小时内答复你。') : t('收到，稍后回复你 😊'),
        time: '刚刚',
      }]);
    }, 1200);
  };

  return (
    <div className="page dm-chat-page">
      <div className="dm-chat-header">
        <button type="button" className="dm-chat-back" onClick={goBack} aria-label={t('返回')}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        {isSupport ? (
          <>
            <ConversationAvatar conv={conv} />
            <span className="dm-chat-peer-name">{t('客服')}</span>
          </>
        ) : (
          <>
            <button type="button" className="dm-peer-profile-btn" onClick={() => navigate({ page: 'P6', authorName: conv.peer })} aria-label={t('查看主页')}>
              <Avatar index={conv.peerAvatarIdx} seed={conv.peer} />
            </button>
            <AuthorName name={conv.peer} className="dm-chat-peer-name" />
          </>
        )}
      </div>

      {orderId && conv.productTitle && (
        <button
          type="button"
          className="dm-order-context"
          onClick={() => navigate({ page: 'P_ORDERS' })}
        >
          <span className="dm-order-context-title">{conv.productTitle}</span>
          <span className="dm-order-context-link">{t('查看订单')}</span>
        </button>
      )}
      {isSupport && (
        <p className="dm-support-note">{t('客服将分别与买卖双方沟通，并可查看本单的沟通记录与凭证作为处理依据。')}</p>
      )}

      <div className="dm-chat-scroll">
        {messages.map((msg, i) => {
          const showDivider = i === 0 || datePrefix(msg.time) !== datePrefix(messages[i - 1].time);
          const sharedProduct = msg.productId ? ALL_POSTS.find(post => post.id === msg.productId) : undefined;
          return (
            <div key={msg.id}>
              {showDivider && (
                <div className="dm-time-divider">{msg.time}</div>
              )}
              <div className={`dm-bubble-row${msg.from === 'me' ? ' dm-bubble-row--me' : ''}`}>
                {msg.from === 'peer' ? (
                  isSupport ? (
                    <ConversationAvatar conv={conv} />
                  ) : (
                    <button type="button" className="dm-peer-profile-btn" onClick={() => navigate({ page: 'P6', authorName: conv.peer })} aria-label={t('查看主页')}>
                      <Avatar index={conv.peerAvatarIdx} seed={conv.peer} />
                    </button>
                  )
                ) : (
                  <button type="button" className="dm-peer-profile-btn" onClick={() => navigate({ page: 'P6', authorName: CURRENT_USER })} aria-label={t('查看主页')}>
                    <Avatar index={0} seed={CURRENT_USER} />
                  </button>
                )}
                {sharedProduct?.shop ? (
                  <button
                    type="button"
                    className={`dm-product-message${msg.from === 'me' ? ' dm-product-message--me' : ''}`}
                    onClick={() => navigate({ page: 'P_SHOP_ITEM', postId: sharedProduct.id })}
                  >
                    <span className="dm-product-message-cover" aria-hidden="true"><Package size={20} strokeWidth={1.8} /></span>
                    <span className="dm-product-message-body">
                      <span className="dm-product-message-label">{t('商品')}</span>
                      <span className="dm-product-message-title">{sharedProduct.title.split('\n')[0]}</span>
                      <span className="dm-product-message-price">{formatTokenAmount(getShopMinPrice(sharedProduct.shop))} PB</span>
                    </span>
                  </button>
                ) : (
                  <div className={`dm-bubble${msg.from === 'me' ? ' dm-bubble--me' : ''}`}>
                    <p className="dm-bubble-text">{msg.text}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="dm-chat-composer">
        <input
          className="dm-chat-input"
          placeholder={t('发送消息…')}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') requireWallet(send); }}
        />
        <button
          type="button"
          className="dm-chat-send"
          onClick={() => requireWallet(send)}
          disabled={!text.trim()}
          aria-label={t('发送')}
        >
          <Send size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
