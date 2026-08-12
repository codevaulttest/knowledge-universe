import { useState } from 'react';
import { PackageCheck, Truck } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER } from '../mockData';
import type { ShopOrder } from '../types';
import { PageHeader } from '../components/shared';
import { isChinese } from '../i18n';
import { formatTokenAmount } from '../stakeConfig';
import { shopOrderStatusLabel, formatShopFee } from '../shopConfig';

export function OrdersPage({ initialRole }: { initialRole?: 'buyer' | 'seller' }) {
  const { shopOrders, goBack, canGoBack, navigate, t, language, shipShopOrder, confirmShopReceipt, simulateShopSettle } = useApp();
  const [role, setRole] = useState<'buyer' | 'seller'>(initialRole ?? 'buyer');
  const [shipping, setShipping] = useState<ShopOrder | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const zh = isChinese(language);

  const orders = shopOrders.filter(o =>
    role === 'buyer' ? o.buyerName === CURRENT_USER : o.sellerName === CURRENT_USER
  );

  // 待处理数：买家侧=已发货待确认收货；卖家侧=待发货
  const buyerPending = shopOrders.filter(o => o.buyerName === CURRENT_USER && o.status === 'shipped').length;
  const sellerPending = shopOrders.filter(o => o.sellerName === CURRENT_USER && o.status === 'to_ship').length;

  const submitShip = () => {
    if (!shipping || !carrier.trim() || !trackingNo.trim()) return;
    shipShopOrder(shipping.id, carrier.trim(), trackingNo.trim());
    setShipping(null); setCarrier(''); setTrackingNo('');
  };

  return (
    <div className="page">
      <PageHeader title={t('我的订单')} onBack={canGoBack ? goBack : undefined} />
      <div className="orders-role-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={role === 'buyer'} className={`orders-role-tab${role === 'buyer' ? ' orders-role-tab--active' : ''}`} onClick={() => setRole('buyer')}>
          {t('我买的')}
          {buyerPending > 0 && <span className="orders-role-badge" aria-label={t('{count} 笔待处理', { count: buyerPending })}>{buyerPending}</span>}
        </button>
        <button type="button" role="tab" aria-selected={role === 'seller'} className={`orders-role-tab${role === 'seller' ? ' orders-role-tab--active' : ''}`} onClick={() => setRole('seller')}>
          {t('我卖的')}
          {sellerPending > 0 && <span className="orders-role-badge" aria-label={t('{count} 笔待处理', { count: sellerPending })}>{sellerPending}</span>}
        </button>
      </div>
      <div className="scroll-area">
        {orders.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <p>{role === 'buyer' ? t('还没有买过东西') : t('还没有卖出订单')}</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(o => (
              <div key={o.id} className="order-card">
                <div className="order-card-head">
                  <button
                    type="button"
                    className="order-card-title"
                    onClick={() => navigate({ page: 'P_SHOP_ITEM', postId: o.postId })}
                  >
                    {o.productTitle}
                  </button>
                  <span className={`order-status order-status--${o.status}`}>
                    {shopOrderStatusLabel(o.status, zh)}
                  </span>
                </div>

                <div className="order-card-meta">
                  <span>{role === 'buyer' ? t('卖家：{name}', { name: o.sellerName }) : t('买家：{name}', { name: o.buyerName })}</span>
                  <span>× {o.quantity}</span>
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

                {o.status === 'to_settle' && (
                  <p className="order-card-settle-note">{t('已完成，货款将于次月 15 日结算')}</p>
                )}

                {/* 操作区 */}
                <div className="order-card-actions">
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
            ))}
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
    </div>
  );
}
