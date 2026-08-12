import { ClipboardList, Package } from 'lucide-react';
import { useApp } from '../AppContext';
import { MediaPlaceholder, PageHeader } from '../components/shared';
import { formatTokenAmount } from '../stakeConfig';
import type { Post } from '../types';

/** 商城封面：无图或图片全部锁定时显示默认占位 */
function shopCoverUsesPlaceholder(post: Post): boolean {
  if (post.kind === 'text') return true;
  if (post.kind === 'article' && post.articleHasCover === false) return true;
  if (post.kind === 'image') {
    const total = post.imageCount ?? 1;
    return Math.floor(post.visiblePercent / 100 * total) <= 0;
  }
  if (post.kind === 'video' && post.visiblePercent === 0) return true;
  return false;
}

function shopCoverVisibleImgCount(post: Post): number {
  if (post.kind !== 'image') return 1;
  const total = post.imageCount ?? 1;
  return Math.max(1, Math.floor(post.visiblePercent / 100 * total));
}

/** 商城内容（商品网格 + 我的订单入口）——供「商城」tab 与独立商城页复用 */
export function ShopFeed() {
  const { posts, navigate, t } = useApp();
  const products = posts.filter(p => p.shop);

  return (
    <>
      <div className="shop-mall-bar">
        <p className="shop-mall-hint">{t('这里是全部上架商品，点商品即可下单购买')}</p>
        <button
          type="button"
          className="shop-orders-link"
          onClick={() => navigate({ page: 'P_ORDERS' })}
        >
          <ClipboardList size={16} strokeWidth={2} />
          {t('我的订单')}
        </button>
      </div>
      {products.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>{t('暂无上架商品')}</p>
        </div>
      ) : (
        <div className="shop-grid">
          {products.map(p => (
            <button
              key={p.id}
              type="button"
              className="shop-card"
              onClick={() => navigate({ page: 'P_SHOP_ITEM', postId: p.id })}
            >
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
                  <span className="shop-card-price">{formatTokenAmount(p.shop!.price)} <span className="shop-card-price-unit">PB</span></span>
                  <span className="shop-card-seller">{p.author}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
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
