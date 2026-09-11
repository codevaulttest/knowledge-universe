import { useState } from 'react';
import { ClipboardList, Ellipsis, MessageCircle, Package, PackageX, Pencil, RotateCcw, ScanLine, Search } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, DM_CONVERSATIONS } from '../mockData';
import { MediaPlaceholder, PageHeader } from '../components/shared';
import { Ios26Alert } from '../components/Overlays';
import { formatTokenAmount } from '../stakeConfig';
import { getShopMinPrice } from '../shopUtils';
import type { Post } from '../types';

/** 商城封面：无图或图片全部锁定时显示默认占位 */
export function shopCoverUsesPlaceholder(post: Post): boolean {
  if (post.kind === 'text') return true;
  if (post.kind === 'article' && post.articleHasCover === false) return true;
  if (post.kind === 'image') {
    const total = post.imageCount ?? 1;
    return Math.floor(post.visiblePercent / 100 * total) <= 0;
  }
  if (post.kind === 'video' && post.visiblePercent === 0) return true;
  return false;
}

export function shopCoverVisibleImgCount(post: Post): number {
  if (post.kind !== 'image') return 1;
  const total = post.imageCount ?? 1;
  return Math.max(1, Math.floor(post.visiblePercent / 100 * total));
}

/** 商品两列网格——供商城首页与「小黄车」搜索结果复用 */
export function ShopProductGrid({ products }: { products: Post[] }) {
  const { navigate, t, openEditPost, delistShopPost, relistShopPost } = useApp();
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null);
  const [confirmDelistId, setConfirmDelistId] = useState<string | null>(null);
  if (products.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <p>{t('暂无上架商品')}</p>
      </div>
    );
  }
  return (
    <>
      <div className="shop-grid" onClick={() => moreOpenId && setMoreOpenId(null)}>
        {products.map(p => {
          const isOwn = p.author === CURRENT_USER;
          return (
            // 注：外层不能用 <button> 包 <button>（管理按钮）——嵌套交互元素是无效 HTML，
            // 部分浏览器（尤其 WebKit）会导致内层点击拿不到事件。改用 div+role="button" 承载整卡点击，
            // 右侧操作保留原生 <button>，两者是兄弟节点而非嵌套。
            <div
              key={p.id}
              className="shop-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate({ page: 'P_SHOP_ITEM', postId: p.id })}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate({ page: 'P_SHOP_ITEM', postId: p.id });
                }
              }}
            >
              {p.shop?.delisted && (
                <span className="shop-delisted-badge shop-delisted-badge--cover">
                  <PackageX size={14} strokeWidth={2.2} aria-hidden="true" />
                  {t('已下架')}
                </span>
              )}
              {isOwn && (
                <div className="shop-card-more-wrap" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="shop-card-more-trigger"
                    aria-label={t('商品管理')}
                    aria-haspopup="true"
                    aria-expanded={moreOpenId === p.id}
                    onClick={() => setMoreOpenId(v => (v === p.id ? null : p.id))}
                  >
                    <Ellipsis size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  {moreOpenId === p.id && (
                    <div className="more-dropdown more-dropdown--shop-card">
                      <button type="button" onClick={() => { setMoreOpenId(null); openEditPost(p.id); }}>
                        <Pencil size={14} strokeWidth={2.2} /> {t('编辑')}
                      </button>
                      {p.shop?.delisted ? (
                        <button type="button" onClick={() => { setMoreOpenId(null); relistShopPost(p.id); }}>
                          <RotateCcw size={14} strokeWidth={2.2} /> {t('重新上架')}
                        </button>
                      ) : (
                        <button type="button" className="more-dropdown__danger" onClick={() => { setMoreOpenId(null); setConfirmDelistId(p.id); }}>
                          <PackageX size={14} strokeWidth={2.2} /> {t('下架')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="shop-card-cover" aria-hidden="true">
                {shopCoverUsesPlaceholder(p) ? (
                  <Package size={30} strokeWidth={1.5} />
                ) : (
                  <MediaPlaceholder
                    kind={p.kind}
                    articleHasCover={p.articleHasCover}
                    imageCount={p.kind === 'image' ? 1 : p.imageCount}
                    imageAspect={p.imageAspect}
                    visibleImgCount={shopCoverVisibleImgCount(p)}
                  />
                )}
              </div>
              <div className="shop-card-body">
                <p className="shop-card-title">{p.title.split('\n')[0]}</p>
                <div className="shop-card-foot">
                  <span className="shop-card-price">
                    {formatTokenAmount(getShopMinPrice(p.shop!))} <span className="shop-card-price-unit">PB</span>
                  </span>
                  <span className="shop-card-seller">{p.author}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {confirmDelistId && (
        <Ios26Alert
          title={t('下架商品')}
          message={t('下架后，商品会从小黄车中隐藏。')}
          cancelLabel={t('取消')}
          confirmLabel={t('下架')}
          onCancel={() => setConfirmDelistId(null)}
          onConfirm={() => { delistShopPost(confirmDelistId); setConfirmDelistId(null); }}
        />
      )}
    </>
  );
}

/** 商城内容（商品网格 + 我的订单入口）——供「商城」tab 与独立商城页复用 */
export function ShopFeed() {
  const { posts, shopOrders, navigate, openSearch, openScan, t } = useApp();
  // 商城首页只展示在架商品，已下架商品仅在卖家自己的主页「小黄车」里可见
  const products = posts.filter(p => p.shop && !p.shop.delisted);
  // 待处理：作为买家已发货待收货 + 作为卖家待发货
  const pendingOrderCount = shopOrders.filter(o =>
    (o.buyerName === CURRENT_USER && o.status === 'shipped')
    || (o.sellerName === CURRENT_USER && o.status === 'to_ship')
  ).length;
  const unreadDmCount = DM_CONVERSATIONS.reduce((s, c) => s + c.unread, 0);

  return (
    <>
      <div className="shop-mall-bar">
        <div className="shop-mall-search">
          <button
            type="button"
            className="shop-mall-search-field"
            onClick={() => openSearch({ shopOnly: true })}
          >
            <Search size={16} strokeWidth={2} className="shop-mall-search-icon" />
            <span className="shop-mall-search-placeholder">{t('搜索商品')}</span>
          </button>
          <button
            type="button"
            className="shop-mall-scan-btn"
            onClick={() => openScan()}
            aria-label={t('扫一扫')}
          >
            <ScanLine size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="shop-quick-entries">
        <button
          type="button"
          className="shop-quick-entry"
          onClick={() => navigate({ page: 'P_ORDERS' })}
        >
          <span className="shop-quick-entry-icon">
            <ClipboardList size={22} strokeWidth={2} />
          </span>
          <span className="shop-quick-entry-label">
            {t('订单')}
            {pendingOrderCount > 0 && (
              <span className="shop-quick-entry-badge" aria-label={t('{count} 笔待处理', { count: pendingOrderCount })}>
                {pendingOrderCount}
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          className="shop-quick-entry"
          onClick={() => navigate({ page: 'P_DM' })}
        >
          <span className="shop-quick-entry-icon">
            <MessageCircle size={22} strokeWidth={2} />
          </span>
          <span className="shop-quick-entry-label">
            {t('消息')}
            {unreadDmCount > 0 && (
              <span className="shop-quick-entry-badge">
                {unreadDmCount > 9 ? '9+' : unreadDmCount}
              </span>
            )}
          </span>
        </button>
      </div>
      <ShopProductGrid products={products} />
    </>
  );
}

/** 独立商城页（保留：供直接跳转 P_SHOP 时使用）*/
export function ShopPage() {
  const { goBack, canGoBack, t } = useApp();
  return (
    <div className="page">
      <PageHeader title={t('小黄车商城')} onBack={canGoBack ? goBack : undefined} />
      <div className="scroll-area">
        <ShopFeed />
      </div>
    </div>
  );
}
