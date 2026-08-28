import { useState } from 'react';
import { ChevronRight, MessageCircle, PackageCheck, PackageOpen, Truck } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, MOCK_SELLER_CONTACTS } from '../mockData';
import type { ShopOrder } from '../types';
import { PageHeader } from '../components/shared';
import { DevPanel } from '../components/DevPanel';
import { isChinese } from '../i18n';
import { formatTokenAmount } from '../stakeConfig';
import { shopOrderStatusLabel, formatShopFee } from '../shopConfig';
import { CONTACT_CHANNELS } from './ShopItemPage';

export function OrdersPage({ initialRole }: { initialRole?: 'buyer' | 'seller' }) {
  const { shopOrders, goBack, canGoBack, navigate, t, language, shipShopOrder, confirmShopReceipt, simulateShopSettle, userProfile, showToast } = useApp();
  const [role, setRole] = useState<'buyer' | 'seller'>(initialRole ?? 'buyer');
  const [shipping, setShipping] = useState<ShopOrder | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  // 开发工具：模拟订单空态（不改动种子数据）
  const [demoEmpty, setDemoEmpty] = useState(false);
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());
  const zh = isChinese(language);

  const orders = demoEmpty ? [] : shopOrders.filter(o =>
    role === 'buyer' ? o.buyerName === CURRENT_USER : o.sellerName === CURRENT_USER
  );

  // 待处理数：买家侧=已发货待确认收货；卖家侧=待发货
  const buyerPending = demoEmpty ? 0 : shopOrders.filter(o => o.buyerName === CURRENT_USER && o.status === 'shipped').length;
  const sellerPending = demoEmpty ? 0 : shopOrders.filter(o => o.sellerName === CURRENT_USER && o.status === 'to_ship').length;

  const submitShip = () => {
    if (!shipping || !carrier.trim() || !trackingNo.trim()) return;
    shipShopOrder(shipping.id, carrier.trim(), trackingNo.trim());
    setShipping(null); setCarrier(''); setTrackingNo('');
  };

  const formatOrderTime = (ts: number) => {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('刚刚');
    if (min < 60) return `${min}${t('分钟前')}`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}${t('小时前')}`;
    const days = Math.floor(hours / 24);
    return `${days}${t('天前')}`;
  };

  return (
    <div className="page orders-page">
      <PageHeader title={t('我的订单')} onBack={canGoBack ? goBack : undefined} />
      <div className="create-scale-toggle orders-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={role === 'buyer'} className={`create-scale-tab${role === 'buyer' ? ' create-scale-tab--active' : ''}`} onClick={() => setRole('buyer')}>
          {t('我买的')}
          {buyerPending > 0 && <span className="orders-tab-badge" aria-label={t('{count} 笔待处理', { count: buyerPending })}>{buyerPending}</span>}
        </button>
        <button type="button" role="tab" aria-selected={role === 'seller'} className={`create-scale-tab${role === 'seller' ? ' create-scale-tab--active' : ''}`} onClick={() => setRole('seller')}>
          {t('我卖的')}
          {sellerPending > 0 && <span className="orders-tab-badge" aria-label={t('{count} 笔待处理', { count: sellerPending })}>{sellerPending}</span>}
        </button>
      </div>
      <div className="scroll-area">
        {orders.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <PackageOpen size={44} strokeWidth={1.5} className="orders-empty-icon" aria-hidden="true" />
            <p>{role === 'buyer' ? t('还没有买过东西') : t('还没有卖出订单')}</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(o => {
              const sellerContacts = role === 'buyer'
                ? (o.sellerName === CURRENT_USER ? userProfile.contacts : MOCK_SELLER_CONTACTS[o.sellerName])
                : undefined;
              const contactEntries = CONTACT_CHANNELS.filter(({ key }) => sellerContacts?.[key]?.trim());
              const contactsOpen = expandedContacts.has(o.id);
              return (
              <div key={o.id} className="order-card">
                <div className="order-card-head">
                  <button
                    type="button"
                    className="order-card-title"
                    onClick={() => navigate({ page: 'P_SHOP_ITEM', postId: o.postId })}
                  >
                    <span className="order-card-title-text">{o.productTitle}</span>
                    <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" className="order-card-title-chevron" />
                  </button>
                  <span className={`order-status order-status--${o.status}`}>
                    {shopOrderStatusLabel(o.status, zh)}
                  </span>
                </div>

                <div className="order-card-meta">
                  <span>{role === 'buyer' ? t('卖家：{name}', { name: o.sellerName }) : t('买家：{name}', { name: o.buyerName })}</span>
                  <span>
                    {formatOrderTime(o.createdAt)}
                    {o.variantLabel ? ` · ${t('规格：{label}', { label: o.variantLabel })}` : ''}
                    {' · × '}{o.quantity}
                  </span>
                </div>

                <div className="order-card-price">
                  {formatTokenAmount(o.unitPrice * o.quantity)} PB
                  <span className="order-card-sup"> + {formatShopFee(Math.round(o.unitFee * o.quantity * 10000) / 10000)} SUP</span>
                </div>

                <div className="order-card-addr">
                  {o.address.name} · {o.address.phone}
                  <span className="order-card-addr-detail">{o.address.detail}</span>
                </div>

                {o.trackingNo && (
                  <div className="order-card-tracking">
                    <Truck size={14} strokeWidth={2} />
                    {o.carrier} · {o.trackingNo}
                  </div>
                )}

                {o.status === 'submitting' && (
                  <p className="order-card-settle-note">{t('链上确认中，确认后自动更新为待发货')}</p>
                )}

                {o.status === 'failed' && (
                  <p className="order-card-settle-note">{t('链上确认未通过，商品款未扣除，可重新下单')}</p>
                )}

                {o.status === 'to_settle' && (
                  <p className="order-card-settle-note">{t('已完成，货款将于次月 15 日结算')}</p>
                )}

                {contactEntries.length > 0 && (
                  <div className={`shop-item-contacts-reveal${contactsOpen ? ' shop-item-contacts-reveal--open' : ''}`}>
                    <div className="shop-item-contacts-reveal-inner">
                      <div className="shop-item-contacts">
                        {contactEntries.map(({ key, label, icon: Icon }) => (
                          <button
                            type="button"
                            className="shop-item-contact-chip"
                            key={key}
                            onClick={() => {
                              if (key === 'phone') {
                                window.location.href = `tel:${sellerContacts![key]}`;
                                return;
                              }
                              if (key === 'whatsapp') {
                                window.open(`https://wa.me/${sellerContacts![key]!.replace(/[^\d]/g, '')}`, '_blank');
                                return;
                              }
                              navigator.clipboard.writeText(sellerContacts![key]!);
                              showToast(t('已复制'));
                            }}
                          >
                            <Icon size={13} strokeWidth={2} aria-hidden="true" />
                            {t(label)}：{sellerContacts![key]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作区 */}
                <div className="order-card-actions">
                  {role === 'buyer' && contactEntries.length > 0 && !contactsOpen && (
                    <button
                      type="button"
                      className="shop-item-contacts-toggle"
                      onClick={() => setExpandedContacts(prev => new Set(prev).add(o.id))}
                    >
                      <MessageCircle size={15} strokeWidth={2} aria-hidden="true" />
                      {t('联系商家')}
                    </button>
                  )}
                  {role === 'buyer' && o.status === 'shipped' && (
                    <button type="button" className="order-action-btn" onClick={() => confirmShopReceipt(o.id)}>
                      <PackageCheck size={15} strokeWidth={2} />{t('确认收货')}
                    </button>
                  )}
                  {role === 'seller' && o.status === 'to_ship' && (
                    <button type="button" className="order-action-btn" onClick={() => setShipping(o)}>
                      <Truck size={15} strokeWidth={2} />{t('填单号发货')}
                    </button>
                  )}
                  {role === 'seller' && o.status === 'to_settle' && (
                    <button type="button" className="order-action-btn order-action-btn--ghost" onClick={() => simulateShopSettle(o.id)}>
                      {t('模拟结算到账')}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 发货：填物流公司 + 快递单号 */}
      {shipping && (
        <div className="sheet-backdrop" onClick={() => setShipping(null)}>
          <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('发货')}</span>
            </div>
            <div className="shop-addr-form">
              <input className="compose-shop-input" placeholder={t('物流公司（如 顺丰速运）')} value={carrier} onChange={e => setCarrier(e.target.value)} />
              <input className="compose-shop-input" placeholder={t('快递单号')} value={trackingNo} onChange={e => setTrackingNo(e.target.value)} />
              <button type="button" className="planet-confirm-btn" onClick={submitShip} disabled={!carrier.trim() || !trackingNo.trim()}>
                {t('确认发货')}
              </button>
            </div>
          </div>
        </div>
      )}

      <DevPanel>
        <button
          type="button"
          className="planet-dev-menu-item"
          role="menuitemcheckbox"
          aria-checked={demoEmpty}
          onClick={() => setDemoEmpty(v => !v)}
        >
          <span>{t('订单空态')}</span>
          <span className={`planet-dev-menu-toggle${demoEmpty ? ' planet-dev-menu-toggle--on' : ''}`}>
            {demoEmpty ? t('开') : t('关')}
          </span>
        </button>
      </DevPanel>
    </div>
  );
}
