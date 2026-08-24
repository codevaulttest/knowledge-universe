import { useState } from 'react';
import { Bookmark, Check, ChevronRight, Circle, CircleCheck, Clock, MapPin, MessageCircle, MessageCircleMore, Minus, Package, Phone, Plus, Sparkles, Store, Trash2, Users, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, MOCK_SELLER_CONTACTS } from '../mockData';
import type { PbWalletId, ProfileContacts, ShippingAddress, ShopOrder } from '../types';
import { MediaPlaceholder, PageHeader } from '../components/shared';
import { shopCoverUsesPlaceholder, shopCoverVisibleImgCount } from './ShopPage';
import { formatTokenAmount } from '../stakeConfig';
import { computeShopFee, computeDisplayMerit, computeUnitMerit, formatMeritAmount, formatShopFee, MERIT_PER_ADN } from '../shopConfig';
import { getShopMinPrice, getShopTotalStock, getShopVariant, getShopVariants, isMultiVariantShop } from '../shopUtils';
import { Ios26Alert } from '../components/Overlays';
import { RegionPicker } from '../components/RegionPicker';
import { PbWalletPicker } from '../components/PbWalletPicker';

export const CONTACT_CHANNELS: { key: keyof ProfileContacts; label: string; icon: typeof MessageCircle }[] = [
  { key: 'wechat', label: '微信', icon: MessageCircle },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircleMore },
  { key: 'phone', label: '电话', icon: Phone },
];

export function ShopItemPage({ postId, onClose }: { postId: string; onClose: () => void }) {
  const {
    posts, navigate, t, requireWallet,
    shippingAddresses, defaultAddress, addShippingAddress, removeShippingAddress, setDefaultAddress,
    placeShopOrder, showToast, openImageLightbox,
    savedPostIds, togglePostAction, userProfile, requestPostInteraction,
  } = useApp();

  const post = posts.find(p => p.id === postId);
  const multiVariant = post?.shop ? isMultiVariantShop(post.shop) : false;
  const variants = post?.shop ? getShopVariants(post.shop) : [];
  const defaultVariantId = variants.find(v => v.stock > 0)?.id ?? variants[0]?.id ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(defaultVariantId);
  const [qty, setQty] = useState(1);
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  // 下单后的「已提交」确认弹窗（可关闭；链上确认在后台异步进行）
  const [submittedOrder, setSubmittedOrder] = useState<ShopOrder | null>(null);
  // 新增地址表单
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRegion, setFormRegion] = useState('');
  const [formDetail, setFormDetail] = useState('');
  const [formSetDefault, setFormSetDefault] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [pendingDeleteAddrId, setPendingDeleteAddrId] = useState<string | null>(null);
  const [payWallet, setPayWallet] = useState<PbWalletId | null>(null);

  if (!post || !post.shop) {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet shop-item-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('商品详情')}</span>
            <button type="button" className="sheet-close" onClick={onClose} aria-label={t('关闭')}><X size={18} strokeWidth={2} /></button>
          </div>
          <p style={{ color: 'var(--ku-color-text-meta)', textAlign: 'center', padding: '32px 0' }}>{t('该商品已下架')}</p>
        </div>
      </div>
    );
  }

  const { rebatePercent, partnerRebatePercent = 0 } = post.shop;
  const activeVariant = getShopVariant(post.shop, multiVariant ? selectedVariantId ?? undefined : undefined);
  const price = activeVariant?.price ?? getShopMinPrice(post.shop);
  const stock = activeVariant?.stock ?? 0;
  const isOwn = post.author === CURRENT_USER;
  const saved = savedPostIds.has(post.id);
  const sellerContacts = isOwn ? userProfile.contacts : MOCK_SELLER_CONTACTS[post.author];
  const contactEntries = CONTACT_CHANNELS.filter(({ key }) => sellerContacts?.[key]?.trim());
  const unitFee = computeShopFee(price);
  const totalPb = price * qty;
  const totalSup = Math.round(unitFee * qty * 10000) / 10000;
  const estMerit = computeUnitMerit(price, rebatePercent) * qty;
  const displayMerit = computeDisplayMerit(totalPb, rebatePercent);
  const displayPartnerMerit = partnerRebatePercent > 0
    ? computeDisplayMerit(totalPb, partnerRebatePercent)
    : 0;
  const selectedAddress = shippingAddresses.find(a => a.id === selectedAddressId) ?? defaultAddress ?? null;
  const soldOut = getShopTotalStock(post.shop) <= 0;
  const variantSoldOut = multiVariant && activeVariant && activeVariant.stock <= 0;
  const canBuy = !soldOut && !variantSoldOut && activeVariant && activeVariant.stock > 0;

  const changeQty = (delta: number) => {
    setQty(q => Math.min(Math.max(1, q + delta), Math.max(1, stock)));
  };

  const selectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setQty(1);
  };

  const formValid = !!(formName.trim() && formPhone.trim() && formRegion && formDetail.trim());

  const submitAddress = () => {
    if (!formValid) return;
    const addr = addShippingAddress({
      name: formName.trim(),
      phone: formPhone.trim(),
      region: formRegion,
      detail: formDetail.trim(),
      isDefault: formSetDefault || shippingAddresses.length === 0,
    });
    setSelectedAddressId(addr.id);
    setFormName(''); setFormPhone(''); setFormRegion(''); setFormDetail(''); setFormSetDefault(false);
    setAddOpen(false);
    setPickerOpen(false);
  };

  const buy = () => {
    if (!canBuy) return;
    if (!selectedAddress) { setPickerOpen(true); return; }
    requireWallet(() => {
      if (!payWallet) return;
      const order = placeShopOrder(post.id, qty, selectedAddress, multiVariant ? selectedVariantId ?? undefined : undefined, payWallet);
      if (!order) { showToast(t('下单失败，请稍后重试')); return; }
      // 弹出「已提交」确认弹窗；链上确认在后台异步完成（成功/失败均由 App toast 通知）。
      setSubmittedOrder(order);
    });
  };

  const joinPartner = () => {
    requireWallet(() => {
      requestPostInteraction(post.id, 'partner', { onSkip: () => {}, onPaid: () => {} });
    });
  };

  const fullAddr = (a: ShippingAddress) => [a.region, a.detail].filter(Boolean).join(' ');

  const deleteAddress = (addrId: string) => {
    const remaining = shippingAddresses.filter(a => a.id !== addrId);
    removeShippingAddress(addrId);
    if (selectedAddressId === addrId) {
      const fallback = remaining.find(a => a.isDefault) ?? remaining[0];
      setSelectedAddressId(fallback?.id ?? null);
    }
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet shop-item-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        {/* 弹窗头：标题 + 关闭 */}
        <div className="sheet-header">
          <span className="sheet-title">{t('商品详情')}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('关闭')}><X size={18} strokeWidth={2} /></button>
        </div>

        {/* 商品图片：只显示首图，无图 / 全锁时回退为占位图 */}
        <div className="shop-item-cover" aria-hidden={shopCoverUsesPlaceholder(post) ? true : undefined}>
          {shopCoverUsesPlaceholder(post) ? (
            <Package size={54} strokeWidth={1.5} />
          ) : (
            <MediaPlaceholder
              kind={post.kind}
              articleHasCover={post.articleHasCover}
              imageCount={post.imageCount}
              imageAspect={post.imageAspect}
              visibleImgCount={shopCoverVisibleImgCount(post)}
              onImageClick={post.kind === 'image' ? (idx) => openImageLightbox(post, idx, shopCoverVisibleImgCount(post)) : undefined}
            />
          )}
        </div>

        {/* 正文 */}
        <div className="shop-item-body">
          <div className="shop-item-intro">
            <h2 className="shop-item-title">{post.title}</h2>
            <div className="shop-item-seller-block">
              <button
                type="button"
                className="shop-item-seller"
                onClick={() => navigate({ page: 'P6', authorName: post.author })}
                aria-label={t('卖家：{name}', { name: post.author })}
              >
                <Store size={14} strokeWidth={2} aria-hidden="true" />
                <span className="shop-item-seller-name">{post.author}</span>
                <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
              </button>
              <div className="shop-item-seller-actions">
                {!isOwn && partnerRebatePercent > 0 && (
                  <button
                    type="button"
                    className="shop-item-join-partner"
                    onClick={joinPartner}
                  >
                    <Users size={16} strokeWidth={2} aria-hidden="true" />
                    {t('加入合伙人')}
                  </button>
                )}
                {contactEntries.length > 0 && !contactsExpanded && (
                  <button
                    type="button"
                    className="shop-item-contacts-toggle"
                    onClick={() => setContactsExpanded(true)}
                  >
                    <MessageCircle size={19} strokeWidth={2} aria-hidden="true" />
                    {t('联系商家')}
                  </button>
                )}
                <button
                  type="button"
                  className={`shop-item-save${saved ? ' shop-item-save--active' : ''}`}
                  onClick={() => togglePostAction(post.id, 'save')}
                  aria-pressed={saved}
                  aria-label={saved ? t('取消收藏') : t('收藏')}
                >
                  <Bookmark size={19} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
                  {saved ? t('已收藏') : t('收藏')}
                </button>
              </div>
            </div>
            {contactEntries.length > 0 && (
              <div className={`shop-item-contacts-reveal${contactsExpanded ? ' shop-item-contacts-reveal--open' : ''}`}>
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
          </div>
          <div className="shop-item-pricebar">
            <span className="shop-item-price">{formatTokenAmount(price)} <span className="shop-item-price-unit">PB</span></span>
          </div>

          {multiVariant && (
            <div className="shop-item-variants">
              <span className="shop-item-row-label">{t('选择规格')}</span>
              <div className="shop-item-variant-chips">
                {variants.map(v => {
                  const out = v.stock <= 0;
                  const selected = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`shop-item-variant-chip${selected ? ' shop-item-variant-chip--active' : ''}${out ? ' shop-item-variant-chip--disabled' : ''}`}
                      disabled={out}
                      onClick={() => !out && selectVariant(v.id)}
                      aria-pressed={selected}
                      aria-label={out ? t('该规格已售罄') : v.label}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 数量 */}
          <div className="shop-item-qty-group">
            <div className="shop-item-row">
              <span className="shop-item-row-label">{t('购买数量')}</span>
              <div className="shop-qty">
                <button type="button" className="shop-qty-btn" onClick={() => changeQty(-1)} disabled={qty <= 1} aria-label={t('减少')}>
                  <Minus size={16} strokeWidth={2.4} />
                </button>
                <input
                  className="shop-qty-value"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={stock}
                  value={qty}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setQty(Math.min(Math.max(1, v), Math.max(1, stock)));
                  }}
                  onBlur={e => {
                    const v = parseInt(e.target.value, 10);
                    setQty(isNaN(v) ? 1 : Math.min(Math.max(1, v), Math.max(1, stock)));
                  }}
                  aria-label={t('购买数量')}
                />
                <button type="button" className="shop-qty-btn" onClick={() => changeQty(1)} disabled={qty >= stock} aria-label={t('增加')}>
                  <Plus size={16} strokeWidth={2.4} />
                </button>
              </div>
            </div>
            <p className="shop-item-stock">{t('库存：{stock} 件', { stock })}</p>
          </div>

          {/* 收货地址 */}
          <button type="button" className="shop-item-addr" onClick={() => setPickerOpen(true)}>
            <MapPin size={17} strokeWidth={2} className="shop-item-addr-icon" />
            {selectedAddress ? (
              <span className="shop-item-addr-text">
                <span className="shop-item-addr-line1">{selectedAddress.name} · {selectedAddress.phone}</span>
                <span className="shop-item-addr-line2">{fullAddr(selectedAddress)}</span>
              </span>
            ) : (
              <span className="shop-item-addr-text shop-item-addr-empty">{t('请选择收货地址')}</span>
            )}
            <ChevronRight size={16} strokeWidth={2} />
          </button>

          <PbWalletPicker use="purchase" amount={totalPb} value={payWallet} onChange={setPayWallet} />

          <div className="shop-item-info-cards">
            <div className="shop-item-merit-card">
              <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
              <div className="shop-item-merit-card-text">
                <p>{t('本单预计赠送 {merit} 优点 (根据 PB 价值实时计算，可能略有误差)', { merit: formatMeritAmount(displayMerit) })}</p>
                <p>{t('满 {per} 优点兑 1 张 ADN 抽奖券', { per: MERIT_PER_ADN })}</p>
              </div>
            </div>

            {partnerRebatePercent > 0 && (
              <button type="button" className="shop-item-partner-card" onClick={joinPartner}>
                <div className="shop-item-partner-card-main">
                  <Users size={16} strokeWidth={2} aria-hidden="true" />
                  <p className="shop-item-partner-card-info">
                    {t('合伙人共享 {merit} 优点(链接该贴自动成为合伙人)', { merit: formatMeritAmount(displayPartnerMerit) })}
                  </p>
                </div>
                <span className="shop-item-partner-card-action">
                  {t('立即链接')}
                  <ChevronRight size={15} strokeWidth={2.4} aria-hidden="true" />
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="shop-item-buybar shop-item-buybar--sheet">
          <div className="shop-item-total">
            <span className="shop-item-total-label">{t('合计')}</span>
            <span className="shop-item-total-value">{formatTokenAmount(totalPb)} PB</span>
            <span className="shop-item-total-gas">{t('Gas 费')} {formatShopFee(totalSup)} SUP</span>
          </div>
          <button
            type="button"
            className="shop-buy-btn"
            onClick={buy}
            disabled={!canBuy || !payWallet}
          >
            {soldOut ? t('已售罄') : variantSoldOut ? t('该规格已售罄') : t('立即购买')}
          </button>
        </div>
      </div>
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
                <button
                  type="button"
                  className={`shop-addr-region-btn${formRegion ? ' shop-addr-region-btn--filled' : ''}`}
                  onClick={() => setRegionPickerOpen(true)}
                >
                  <MapPin size={15} strokeWidth={2} aria-hidden="true" />
                  <span className="shop-addr-region-text">{formRegion || t('选择省 / 市 / 区')}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>
                <textarea className="compose-shop-input shop-addr-detail" placeholder={t('详细地址（街道、门牌号）')} value={formDetail} onChange={e => setFormDetail(e.target.value)} />
                {shippingAddresses.length > 0 && (
                  <button
                    type="button"
                    className={`shop-addr-default-toggle${formSetDefault ? ' shop-addr-default-toggle--on' : ''}`}
                    onClick={() => setFormSetDefault(v => !v)}
                    aria-pressed={formSetDefault}
                  >
                    {formSetDefault
                      ? <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />
                      : <Circle size={16} strokeWidth={2} aria-hidden="true" />}
                    {t('设为默认地址')}
                  </button>
                )}
                <button type="button" className="shop-addr-save-btn" onClick={submitAddress} disabled={!formValid}>
                  {t('保存并使用')}
                </button>
              </div>
            ) : (
              <>
                <div className="shop-addr-list">
                  {shippingAddresses.map(addr => (
                    <div
                      key={addr.id}
                      className={`shop-addr-item${selectedAddressId === addr.id ? ' shop-addr-item--active' : ''}`}
                    >
                      <div className="shop-addr-item-row">
                        <button
                          type="button"
                          className="shop-addr-item-main"
                          onClick={() => { setSelectedAddressId(addr.id); setPickerOpen(false); }}
                        >
                          <span className="shop-item-addr-text">
                            <span className="shop-item-addr-line1">{addr.name} · {addr.phone}</span>
                            <span className="shop-item-addr-line2">{fullAddr(addr)}</span>
                          </span>
                          {selectedAddressId === addr.id && <Check size={16} strokeWidth={2.4} className="shop-addr-check" />}
                        </button>
                        <button
                          type="button"
                          className="shop-addr-delete"
                          onClick={() => setPendingDeleteAddrId(addr.id)}
                          aria-label={t('删除')}
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                      {addr.isDefault ? (
                        <span className="shop-addr-default-flag">
                          <CircleCheck size={15} strokeWidth={2} />{t('默认地址')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="shop-addr-setdefault"
                          onClick={() => setDefaultAddress(addr.id)}
                        >
                          <Circle size={15} strokeWidth={2} />{t('设为默认')}
                        </button>
                      )}
                    </div>
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

      {/* 省 / 市 / 区级联选择 */}
      {regionPickerOpen && (
        <RegionPicker
          onSelect={(region) => { setFormRegion(region); setRegionPickerOpen(false); }}
          onClose={() => setRegionPickerOpen(false)}
        />
      )}

      {/* 删除地址二次确认 */}
      {pendingDeleteAddrId && (
        <Ios26Alert
          title={t('删除收货地址')}
          message={t('确定要删除该收货地址吗？')}
          cancelLabel={t('取消')}
          confirmLabel={t('删除')}
          onCancel={() => setPendingDeleteAddrId(null)}
          onConfirm={() => {
            deleteAddress(pendingDeleteAddrId);
            setPendingDeleteAddrId(null);
          }}
        />
      )}

      {/* 订单已提交：链上确认在后台进行，弹窗可关闭 */}
      {submittedOrder && (
        <div className="sheet-backdrop">
          <div className="payment-sheet shop-success" role="dialog" aria-modal="true">
            <div className="shop-success-check shop-success-check--pending"><Clock size={28} strokeWidth={2.4} /></div>
            <p className="shop-success-title">{t('订单已提交')}</p>
            <p className="shop-success-sub">
              {t('链上确认中，确认后自动扣款并转为待发货，结果会通知你，可在「我的订单」查看进度')}
            </p>
            <div className="shop-success-merit">
              <Sparkles size={14} strokeWidth={2} />
              {t('预计赠 {merit} 优点', { merit: submittedOrder.estMerit })}
            </div>
            <div className="shop-success-actions">
              <button type="button" className="shop-success-btn shop-success-btn--ghost" onClick={() => { setSubmittedOrder(null); onClose(); }}>
                {t('继续逛')}
              </button>
              <button type="button" className="shop-success-btn" onClick={() => { setSubmittedOrder(null); navigate({ page: 'P_ORDERS', role: 'buyer' }); }}>
                {t('查看订单')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
