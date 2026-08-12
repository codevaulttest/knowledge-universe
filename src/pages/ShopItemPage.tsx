import { useState } from 'react';
import { Check, ChevronRight, MapPin, Minus, Plus, ShoppingCart, Sparkles, Zap } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER } from '../mockData';
import type { ShippingAddress, ShopOrder } from '../types';
import { PageHeader } from '../components/shared';
import { formatTokenAmount } from '../stakeConfig';
import { computeShopFee, computeUnitMerit, formatShopFee, MERIT_PER_ADN } from '../shopConfig';

export function ShopItemPage({ postId }: { postId: string }) {
  const {
    posts, goBack, canGoBack, navigate, t, requireWallet,
    shippingAddresses, defaultAddress, addShippingAddress,
    placeShopOrder, showToast,
  } = useApp();

  const post = posts.find(p => p.id === postId);
  const [qty, setQty] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [placed, setPlaced] = useState<ShopOrder | null>(null);
  // 新增地址表单
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDetail, setFormDetail] = useState('');

  if (!post || !post.shop) {
    return (
      <div className="page">
        <PageHeader title={t('商品')} onBack={canGoBack ? goBack : undefined} />
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>{t('该商品已下架')}</p>
        </div>
      </div>
    );
  }

  const { price, rebatePercent, stock } = post.shop;
  const isOwn = post.author === CURRENT_USER;
  const unitFee = computeShopFee(price);
  const totalPb = price * qty;
  const totalSup = Math.round(unitFee * qty * 10000) / 10000;
  const estMerit = computeUnitMerit(price, rebatePercent) * qty;
  const selectedAddress = shippingAddresses.find(a => a.id === selectedAddressId) ?? defaultAddress ?? null;
  const soldOut = stock <= 0;

  const changeQty = (delta: number) => {
    setQty(q => Math.min(Math.max(1, q + delta), Math.max(1, stock)));
  };

  const submitAddress = () => {
    if (!formName.trim() || !formPhone.trim() || !formDetail.trim()) return;
    const addr = addShippingAddress({
      name: formName.trim(),
      phone: formPhone.trim(),
      detail: formDetail.trim(),
      isDefault: shippingAddresses.length === 0,
    });
    setSelectedAddressId(addr.id);
    setFormName(''); setFormPhone(''); setFormDetail('');
    setAddOpen(false);
    setPickerOpen(false);
  };

  const buy = () => {
    if (soldOut || isOwn) return;
    if (!selectedAddress) { setPickerOpen(true); return; }
    requireWallet(() => {
      const order = placeShopOrder(post.id, qty, selectedAddress);
      if (order) setPlaced(order);
      else showToast(t('下单失败，请稍后重试'));
    });
  };

  return (
    <div className="page">
      <PageHeader title={t('商品详情')} onBack={canGoBack ? goBack : undefined} />
      <div className="scroll-area shop-item-scroll">
        {/* 商品封面（占位插画） */}
        <div className="shop-item-cover" aria-hidden="true">
          <ShoppingCart size={54} strokeWidth={1.5} />
        </div>

        <div className="shop-item-body">
          <div className="shop-item-pricebar">
            <span className="shop-item-price">{formatTokenAmount(price)} <span className="shop-item-price-unit">PB</span></span>
          </div>
          <div className="shop-item-gas">
            <Zap size={13} strokeWidth={2} aria-hidden="true" />
            {t('Gas 费')} · {formatShopFee(unitFee)} SUP/{t('件')}
          </div>
          <h2 className="shop-item-title">{post.title}</h2>
          <button
            type="button"
            className="shop-item-seller"
            onClick={() => navigate({ page: 'P6', authorName: post.author })}
          >
            {t('卖家')}：{post.author}
            <ChevronRight size={15} strokeWidth={2} />
          </button>

          {/* 数量 */}
          <div className="shop-item-row">
            <span className="shop-item-row-label">{t('购买数量')}</span>
            <div className="shop-qty">
              <button type="button" className="shop-qty-btn" onClick={() => changeQty(-1)} disabled={qty <= 1} aria-label={t('减少')}>
                <Minus size={16} strokeWidth={2.4} />
              </button>
              <span className="shop-qty-value">{qty}</span>
              <button type="button" className="shop-qty-btn" onClick={() => changeQty(1)} disabled={qty >= stock} aria-label={t('增加')}>
                <Plus size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>
          <p className="shop-item-stock">{t('可订购 {stock} 件', { stock })}</p>

          {/* 收货地址 */}
          <button type="button" className="shop-item-addr" onClick={() => setPickerOpen(true)}>
            <MapPin size={17} strokeWidth={2} className="shop-item-addr-icon" />
            {selectedAddress ? (
              <span className="shop-item-addr-text">
                <span className="shop-item-addr-line1">{selectedAddress.name} · {selectedAddress.phone}</span>
                <span className="shop-item-addr-line2">{selectedAddress.detail}</span>
              </span>
            ) : (
              <span className="shop-item-addr-text shop-item-addr-empty">{t('请选择收货地址')}</span>
            )}
            <ChevronRight size={16} strokeWidth={2} />
          </button>

          {/* 优点返还占位 */}
          <div className="shop-item-merit">
            <Sparkles size={15} strokeWidth={2} />
            {t('本单预计返 {merit} 优点（满 {per} 优点兑 1 张 adn 抽奖券）', { merit: estMerit, per: MERIT_PER_ADN })}
          </div>
        </div>
      </div>

      {/* 底部下单栏 */}
      <div className="shop-item-buybar">
        <div className="shop-item-total">
          <span className="shop-item-total-label">{t('合计')}</span>
          <span className="shop-item-total-value">{formatTokenAmount(totalPb)} PB</span>
          <span className="shop-item-total-gas">{t('Gas 费')} {formatShopFee(totalSup)} SUP</span>
        </div>
        <button
          type="button"
          className="shop-buy-btn"
          onClick={buy}
          disabled={soldOut || isOwn}
        >
          {isOwn ? t('这是你的商品') : soldOut ? t('已售罄') : t('立即购买')}
        </button>
      </div>

      {/* 地址选择 / 新增 */}
      {pickerOpen && (
        <div className="sheet-backdrop" onClick={() => { setPickerOpen(false); setAddOpen(false); }}>
          <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{addOpen ? t('新增收货地址') : t('选择收货地址')}</span>
            </div>
            {addOpen ? (
              <div className="shop-addr-form">
                <input className="compose-shop-input" placeholder={t('收货人姓名')} value={formName} onChange={e => setFormName(e.target.value)} />
                <input className="compose-shop-input" placeholder={t('手机号')} value={formPhone} onChange={e => setFormPhone(e.target.value)} />
                <textarea className="compose-shop-input shop-addr-detail" placeholder={t('详细地址')} value={formDetail} onChange={e => setFormDetail(e.target.value)} />
                <button type="button" className="planet-confirm-btn" onClick={submitAddress} disabled={!formName.trim() || !formPhone.trim() || !formDetail.trim()}>
                  {t('保存并使用')}
                </button>
              </div>
            ) : (
              <>
                <div className="shop-addr-list">
                  {shippingAddresses.map(addr => (
                    <button
                      key={addr.id}
                      type="button"
                      className={`shop-addr-item${selectedAddressId === addr.id ? ' shop-addr-item--active' : ''}`}
                      onClick={() => { setSelectedAddressId(addr.id); setPickerOpen(false); }}
                    >
                      <span className="shop-item-addr-text">
                        <span className="shop-item-addr-line1">
                          {addr.name} · {addr.phone}
                          {addr.isDefault && <span className="shop-addr-default-tag">{t('默认')}</span>}
                        </span>
                        <span className="shop-item-addr-line2">{addr.detail}</span>
                      </span>
                      {selectedAddressId === addr.id && <Check size={16} strokeWidth={2.4} className="shop-addr-check" />}
                    </button>
                  ))}
                </div>
                <button type="button" className="shop-addr-add-btn" onClick={() => setAddOpen(true)}>
                  <Plus size={16} strokeWidth={2.2} />{t('新增收货地址')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 下单成功 */}
      {placed && (
        <div className="sheet-backdrop">
          <div className="payment-sheet shop-success" role="dialog" aria-modal="true">
            <div className="shop-success-check"><Check size={30} strokeWidth={2.6} /></div>
            <p className="shop-success-title">{t('下单成功')}</p>
            <p className="shop-success-sub">
              {t('已扣商品款 {pb} PB、Gas 费 {sup} SUP，货款将于收货后次月 15 日结算给卖家', {
                pb: formatTokenAmount(placed.unitPrice * placed.quantity),
                sup: formatShopFee(Math.round(placed.unitFee * placed.quantity * 10000) / 10000),
              })}
            </p>
            <div className="shop-success-merit">
              <Sparkles size={14} strokeWidth={2} />
              {t('预计返 {merit} 优点', { merit: placed.estMerit })}
            </div>
            <div className="shop-success-actions">
              <button type="button" className="shop-success-btn shop-success-btn--ghost" onClick={() => { setPlaced(null); goBack(); }}>
                {t('继续逛')}
              </button>
              <button type="button" className="shop-success-btn" onClick={() => { setPlaced(null); navigate({ page: 'P_ORDERS', role: 'buyer' }); }}>
                {t('查看订单')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
