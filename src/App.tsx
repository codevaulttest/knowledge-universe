import { useCallback, useEffect, useRef, useState } from 'react';
import { AppProvider } from './AppContext';
import type { AppContextValue } from './AppContext';
import { ACTIVITY_GROUPS, ALL_POSTS, AVATAR_PRESET_SEEDS, CURRENT_USER, DEFAULT_WALLET_DISPLAY } from './mockData';
import type { Draft, InteractionAction, Language, NewPostData, PayCtx, Post, PostAction, Route, StakeModalRequest, UserProfile } from './types';
import { postHasStake } from './stakeConfig';
import { BottomNav } from './components/BottomNav';
import { ArticleReader, CheckInModal, ConfirmDeleteModal, ConfirmUnfollowModal, GeminiStakeModal, ImageLightbox, LinkSheet, PaymentSheet, VideoPlayer } from './components/Overlays';
import { commitClaim, getClaimPreview, CHECK_IN_REWARD, type ClaimPreview } from './checkInConfig';
import { Toast } from './components/shared';
import { ComposePage } from './pages/ComposePage';
import { FeedPage } from './pages/FeedPage';
import { KnowledgePlanetPage } from './pages/KnowledgePlanetPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { ActivityPage } from './pages/ActivityPage';
import { DmListPage, DmChatPage } from './pages/DmPage';
import { SearchPage } from './pages/SearchPage';


export default function App() {
  const [stack, setStack] = useState<Route[]>([{ page: 'P0', tab: 0 }]);
  const [composeOpen, setComposeOpen] = useState(false);
  const composeCloseHandler = useRef<() => void>(() => {});
  const editComposeCloseHandler = useRef<() => void>(() => {});
  const [linkedPostIds, setLinkedPostIds] = useState<Set<string>>(new Set());
  const [followedAuthors, setFollowedAuthors] = useState<Set<string>>(new Set(['阿May的研究笔记']));
  const [repostedPostIds, setRepostedPostIds] = useState<Set<string>>(new Set(['p1', 'p4', 'p6']));
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set(['p2', 'p5', 'im3']));
  const [toastMsg, setToastMsg] = useState<{ msg: string; type?: 'demo' } | null>(null);
  const [paySheet, setPaySheet] = useState<PayCtx | null>(null);
  const [stakeModal, setStakeModal] = useState<StakeModalRequest | null>(null);
  const [linkSheet, setLinkSheet] = useState<{ postId: string; mode: 'link' | 'unlock' } | null>(null);
  const pendingPaySuccessRef = useRef<(() => void) | null>(null);

  const [language, setLanguage] = useState<Language>('zh-CN');
  const [confirmDelete, setConfirmDelete] = useState<{ postId: string; onAfterDelete?: () => void } | null>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [confirmUnfollow, setConfirmUnfollow] = useState<string | null>(null);
  const [imageLightbox, setImageLightbox] = useState<{ post: Post; imgIdx: number; visibleImgCount: number } | null>(null);
  const [articleReaderPost, setArticleReaderPost] = useState<Post | null>(null);
  const [videoPlayerPost, setVideoPlayerPost] = useState<Post | null>(null);
  const [activityGroups, setActivityGroups] = useState(ACTIVITY_GROUPS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [checkInPreview, setCheckInPreview] = useState<ClaimPreview | null>(null);
  const [checkInClaimable, setCheckInClaimable] = useState(false);

  const MOCK_DRAFTS: Draft[] = [
    {
      id: 'draft-mock-video',
      kind: 'video',
      title: 'AI Agent 从入门到部署：完整视频教程（未完成）',
      hasVideo: true,
      thumbnailUrl: '/img/p7.svg',
      joinGemini: true,
      visibility: 50,
      savedAt: Date.now() - 1000 * 60 * 35, // 35 min ago
    },
    {
      id: 'draft-mock-image',
      kind: 'image',
      title: 'Figma 组件库截图整理——设计系统第一版',
      imgCount: 5,
      thumbnailUrl: '/img/p1.svg',
      joinGemini: false,
      savedAt: Date.now() - 1000 * 60 * 60 * 2, // 2h ago
    },
    {
      id: 'draft-mock-article',
      kind: 'article',
      title: '独立开发者出海指南',
      articleTitle: '如何用 AI 工具独立完成一套 SaaS 产品？',
      articleHasCover: true,
      thumbnailUrl: '/img/art.svg',
      joinGemini: true,
      visibility: 30,
      savedAt: Date.now() - 1000 * 60 * 60 * 24, // 1d ago
    },
    {
      id: 'draft-mock-text',
      kind: 'text',
      title: '今天在咖啡馆想到的一个产品思路：',
      joinGemini: false,
      savedAt: Date.now() - 1000 * 60 * 60 * 48, // 2d ago
    },
  ];

  const [drafts, setDrafts] = useState<Draft[]>(() => {
    try {
      const saved = localStorage.getItem('ku-drafts');
      return saved ? JSON.parse(saved) : MOCK_DRAFTS;
    } catch { return MOCK_DRAFTS; }
  });

  useEffect(() => {
    localStorage.setItem('ku-drafts', JSON.stringify(drafts));
  }, [drafts]);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('ku-profile');
      return saved ? JSON.parse(saved) : { nickname: DEFAULT_WALLET_DISPLAY, avatarSeed: AVATAR_PRESET_SEEDS[0] };
    } catch { return { nickname: DEFAULT_WALLET_DISPLAY, avatarSeed: AVATAR_PRESET_SEEDS[0] }; }
  });

  const updateUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('ku-profile', JSON.stringify(profile));
  };

  const t = (zh: string, en: string) => language === 'zh-CN' ? zh : en;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // 每天首次进入知识宇宙：弹出签到领取空投
  useEffect(() => {
    const preview = getClaimPreview();
    setCheckInClaimable(preview.shouldShow);
    if (preview.shouldShow) setCheckInPreview(preview);
  }, []);

  // 常驻入口：随时打开签到（已领取则展示连签进度）
  const openCheckIn = () => setCheckInPreview(getClaimPreview());

  const handleClaimCheckIn = () => {
    if (!checkInPreview) return;
    commitClaim(checkInPreview);
    setCheckInClaimable(false);
    const symbol = language === 'zh-CN' ? CHECK_IN_REWARD.symbol.zh : CHECK_IN_REWARD.symbol.en;
    showToast(t(
      `领取成功！+${checkInPreview.reward} ${symbol}`,
      `Claimed! +${checkInPreview.reward} ${symbol}`,
    ));
  };


  const route = stack[stack.length - 1];
  const tab = route.page === 'P0' ? route.tab : 0;
  const navigate = (r: Route) => setStack(s => [...s, r]);
  const navigateRoot = (r: Route) => setStack([r]);
  const goBack = () => setStack(s => s.length > 1 ? s.slice(0, -1) : s);
  const setTab = (t: 0 | 1) => setStack(s => [...s.slice(0, -1), { page: 'P0', tab: t }]);

  const [posts, setPosts] = useState<Post[]>(ALL_POSTS.filter(p => p.kind !== 'article'));

  const showToast = (msg: string, type?: 'demo') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 2500);
  };

  const openLink = (postId: string, mode: 'link' | 'unlock' = 'link') => {
    if (linkedPostIds.has(postId)) {
      showToast(t('已链接，无需重复操作', 'Already linked'));
      return;
    }
    const post = posts.find(p => p.id === postId);
    if (!post?.isNode) return;
    setLinkSheet({ postId, mode });
  };

  const openPay = (p: PayCtx) => setPaySheet(p);

  const performLink = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    const hadPaywall = post ? post.visiblePercent < 100 : false;
    setLinkedPostIds(s => new Set(s).add(postId));
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, links: p.links + 1, visiblePercent: 100 } : p
    ));
    showToast(hadPaywall
      ? t('链接成功！子节点已创建，全文已解锁', 'Linked! Child node created, full content unlocked')
      : t('链接成功！子节点已创建', 'Linked! Child node created')
    );
  };

  const beginPaidInteraction = (postId: string, action: InteractionAction, onAfterPay: () => void) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !postHasStake(post)) {
      onAfterPay();
      return;
    }
    pendingPaySuccessRef.current = onAfterPay;
    setPaySheet({
      ctx: action === 'unlock' ? 'chain' : 'interaction',
      postId,
      action,
      stakeTier: post.stakeTier,
    });
  };

  const requestPostInteraction = (
    postId: string,
    action: InteractionAction,
    handlers: { onSkip: () => void; onPaid: () => void },
  ) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !postHasStake(post)) {
      handlers.onSkip();
      return;
    }
    setStakeModal({
      postId,
      action,
      onSkip: handlers.onSkip,
      onAfterPay: handlers.onPaid,
    });
  };

  const toggleFollow = (author: string) => {
    if (followedAuthors.has(author)) {
      setConfirmUnfollow(author);
    } else {
      setFollowedAuthors(s => new Set(s).add(author));
    }
  };

  const handleConfirmUnfollow = () => {
    if (!confirmUnfollow) return;
    setFollowedAuthors(s => {
      const next = new Set(s);
      next.delete(confirmUnfollow);
      return next;
    });
    setConfirmUnfollow(null);
    showToast(t('已取消关注', 'Unfollowed'));
  };

  const togglePostAction = (postId: string, action: PostAction) => {
    const actionState = action === 'share' ? repostedPostIds : action === 'like' ? likedPostIds : savedPostIds;
    const setActionState = action === 'share' ? setRepostedPostIds : action === 'like' ? setLikedPostIds : setSavedPostIds;
    const countKey: 'shares' | 'likes' | 'saves' = action === 'share' ? 'shares' : action === 'like' ? 'likes' : 'saves';
    const active = actionState.has(postId);
    const labels = action === 'share'
      ? [t('已取消转发', 'Repost removed'), t('转发成功', 'Reposted')]
      : action === 'like'
        ? [t('已取消点赞', 'Like removed'), t('已点赞', 'Liked')]
        : [t('已取消收藏', 'Removed from saved'), t('已收藏', 'Saved')];

    setActionState(previous => {
      const next = new Set(previous);
      active ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts(previous => previous.map(post => post.id === postId
      ? { ...post, [countKey]: Math.max(0, post[countKey] + (active ? -1 : 1)) }
      : post));
    if (action !== 'like') showToast(active ? labels[0] : labels[1]);
  };

  const deletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    showToast(t('帖子已删除', 'Post deleted'));
  };

  const requestDeletePost = (postId: string, onAfterDelete?: () => void) => {
    setConfirmDelete({ postId, onAfterDelete });
  };

  const openEditPost = (postId: string) => setEditPostId(postId);

  const updatePost = (postId: string, newTitle: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, title: newTitle } : p));
    setEditPostId(null);
    showToast(t('已保存', 'Saved'));
  };

  const incrementReplies = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: p.replies + 1 } : p));
  }, []);

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    deletePost(confirmDelete.postId);
    if (confirmDelete.onAfterDelete) confirmDelete.onAfterDelete();
    setConfirmDelete(null);
  };

  const handlePaySuccess = () => {
    if (!paySheet) return;
    const { ctx, postId } = paySheet;
    setPaySheet(null);
    if (ctx === 'chain' && postId) {
      performLink(postId);
    } else if (ctx === 'post') {
      if (pendingNewPost) {
        const newPost: Post = {
          id: `p-${Date.now()}`,
          author: CURRENT_USER,
          time: t('刚刚', 'Just now'),
          title: pendingNewPost.title,
          kind: pendingNewPost.kind,
          articleHasCover: pendingNewPost.articleHasCover,
          imageCount: pendingNewPost.imageCount,
          visiblePercent: pendingNewPost.visiblePercent,
          isNode: true,
          stakeTier: pendingNewPost.stakeTier,
          nodeId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          rating: 0,
          replies: 0,
          links: 0,
          shares: 0,
          saves: 0,
          likes: 0,
        };
        setPosts(prev => [newPost, ...prev]);
        setPendingNewPost(null);
      }
      setComposeOpen(false);
      setComposeDraftId(null);
      showToast(t('发布成功！知识星球节点已生成', 'Published! Knowledge Planet node created'));
    } else if (ctx === 'repost') {
      showToast(t('转发成功！子节点已创建', 'Reposted! Child node created'));
    } else if (ctx === 'interaction') {
      showToast(t('子节点已创建', 'Child node created'));
    }
    pendingPaySuccessRef.current?.();
    pendingPaySuccessRef.current = null;
  };

  const unreadActivityCount = activityGroups.filter(g => !g.isRead).length;
  const markAllRead = useCallback(() => setActivityGroups(gs => gs.map(g => ({ ...g, isRead: true }))), []);
  const saveRecentSearch = (query: string) => {
    const normalized = query.trim();
    if (!normalized) return;
    setRecentSearches(previous => {
      const deduped = previous.filter(item => item !== normalized);
      return [normalized, ...deduped].slice(0, 8);
    });
  };
  const removeRecentSearch = (query: string) => {
    setRecentSearches(previous => previous.filter(item => item !== query));
  };
  const clearRecentSearches = () => setRecentSearches([]);

  const isOwnProfile = route.page === 'P6' && route.authorName === CURRENT_USER;
  const showBottomNav = route.page === 'P0' || route.page === 'P_PLANET' || route.page === 'P_SEARCH' || route.page === 'P7' || route.page === 'P_DM' || isOwnProfile;

  const [composeDraftId, setComposeDraftId] = useState<string | null>(null);
  const [pendingNewPost, setPendingNewPost] = useState<NewPostData | null>(null);

  const openCompose = () => { setComposeDraftId(null); setComposeOpen(true); };
  const openComposeWithDraft = (draft: Draft) => {
    setComposeDraftId(draft.id);
    setComposeOpen(true);
  };

  const openImageLightbox = (post: Post, imgIdx: number, visibleImgCount: number) => setImageLightbox({ post, imgIdx, visibleImgCount });
  const openArticleReader = (post: Post) => setArticleReaderPost(post);
  const openVideoPlayer = (post: Post) => setVideoPlayerPost(post);

  const saveDraft = useCallback((data: Omit<Draft, 'id' | 'savedAt'>) => {
    const draft: Draft = {
      ...data,
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      savedAt: Date.now(),
    };
    setDrafts(prev => [draft, ...prev]);
  }, []);

  const updateDraft = useCallback((draftId: string, data: Omit<Draft, 'id' | 'savedAt'>) => {
    setDrafts(prev => prev.map(d => d.id === draftId ? { ...data, id: draftId, savedAt: Date.now() } : d));
  }, []);

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  }, []);

  const stagePendingPost = (data: NewPostData) => {
    setPendingNewPost(data);
  };

  const publishPost = (data: NewPostData) => {
    const newPost: Post = {
      id: `p-${Date.now()}`,
      author: CURRENT_USER,
      time: t('刚刚', 'Just now'),
      title: data.title,
      kind: data.kind,
      articleHasCover: data.articleHasCover,
      imageCount: data.imageCount,
      visiblePercent: data.isNode ? data.visiblePercent : 100,
      isNode: data.isNode,
      stakeTier: data.stakeTier,
      nodeId: data.isNode ? Math.random().toString(36).slice(2, 8).toUpperCase() : undefined,
      rating: 0,
      replies: 0,
      links: 0,
      shares: 0,
      saves: 0,
      likes: 0,
    };
    setPosts(prev => [newPost, ...prev]);
    setComposeOpen(false);
    setComposeDraftId(null);
    showToast(data.isNode
      ? t('发布成功！知识星球节点已生成', 'Published! Knowledge Planet node created')
      : t('发布成功！帖子已公开', 'Published! Your post is now public')
    );
  };

  const ctx: AppContextValue = {
    navigate, navigateRoot, goBack, canGoBack: stack.length > 1, openCompose, openComposeWithDraft, showToast, openLink, openPay, openImageLightbox,
    linkedPostIds, followedAuthors, toggleFollow,
    language, setLanguage, t,
    posts, repostedPostIds, likedPostIds, savedPostIds, togglePostAction,
    requestPostInteraction, beginPaidInteraction,
    deletePost, requestDeletePost,
    openEditPost, updatePost, incrementReplies,
    stagePendingPost, publishPost,
    openArticleReader, openVideoPlayer,
    activityGroups, unreadActivityCount, markAllRead,
    openCheckIn, checkInClaimable,
    recentSearches, saveRecentSearch, removeRecentSearch, clearRecentSearches,
    drafts, saveDraft, updateDraft, deleteDraft,
    userProfile, updateUserProfile,
  };


  return (
    <AppProvider value={ctx}>
      <div className="phone-shell" data-layer="knowledge-feed-page">
        {/* 页面主体 */}
        {route.page === 'P0' && <FeedPage tab={tab} setTab={setTab} />}
        {route.page === 'P2' && <PostDetailPage postId={route.postId} scrollToComments={route.scrollToComments} />}
        {route.page === 'P6' && <ProfilePage authorName={route.authorName} />}
        {route.page === 'P7' && <ActivityPage />}
        {route.page === 'P_SEARCH' && <SearchPage />}
        {route.page === 'P_PLANET' && <KnowledgePlanetPage />}
        {route.page === 'P_DM' && <DmListPage />}
        {route.page === 'P_DM_CHAT' && <DmChatPage peerId={route.peerId} />}

        {/* 码库全局底部导航（知识宇宙内始终保持同一套宿主导航）*/}
        {showBottomNav && <BottomNav route={route} setTab={setTab} />}

        {/* 覆盖层：发帖居中弹窗 */}
        {composeOpen && (
          <div className="sheet-backdrop" onClick={() => composeCloseHandler.current()}>
            <div className="compose-modal" role="dialog" aria-modal="true" aria-label={t('发帖', 'Create post')} onClick={e => e.stopPropagation()}>
              <ComposePage
                onClose={() => { setComposeOpen(false); setComposeDraftId(null); }}
                onRegisterCloseHandler={handler => { composeCloseHandler.current = handler; }}
                draft={composeDraftId ? drafts.find(d => d.id === composeDraftId) ?? null : null}
              />
            </div>
          </div>
        )}

        {/* 覆盖层：编辑帖子弹窗 */}
        {editPostId && (() => {
          const editPost = posts.find(p => p.id === editPostId);
          return editPost ? (
            <div className="sheet-backdrop" onClick={() => editComposeCloseHandler.current()}>
              <div className="compose-modal" role="dialog" aria-modal="true" aria-label={t('编辑帖子', 'Edit post')} onClick={e => e.stopPropagation()}>
                <ComposePage
                  onClose={() => setEditPostId(null)}
                  onRegisterCloseHandler={handler => { editComposeCloseHandler.current = handler; }}
                  editPost={editPost}
                />
              </div>
            </div>
          ) : null;
        })()}

        {/* 覆盖层：P1.x 支付浮层 */}
        {paySheet && (
          <PaymentSheet
            payCtx={paySheet}
            onSuccess={handlePaySuccess}
            onClose={() => {
              setPaySheet(null);
              pendingPaySuccessRef.current = null;
            }}
          />
        )}

        {stakeModal && (() => {
          const stakePost = posts.find(p => p.id === stakeModal.postId);
          if (!stakePost) return null;
          return (
            <GeminiStakeModal
              post={stakePost}
              onClose={() => setStakeModal(null)}
              onSkip={() => { stakeModal.onSkip(); setStakeModal(null); }}
              onParticipate={(tier) => {
                const { postId, action, onAfterPay } = stakeModal;
                setStakeModal(null);
                pendingPaySuccessRef.current = onAfterPay;
                setPaySheet({ ctx: 'interaction', postId, action, stakeTier: tier });
              }}
            />
          );
        })()}

        {/* 覆盖层：删除确认弹窗 */}
        {confirmDelete && (
          <ConfirmDeleteModal
            postId={confirmDelete.postId}
            onConfirm={handleConfirmDelete}
            onCancel={() => setConfirmDelete(null)}
          />
        )}

        {/* 覆盖层：取消关注确认弹窗 */}
        {confirmUnfollow && (
          <ConfirmUnfollowModal
            author={confirmUnfollow}
            onConfirm={handleConfirmUnfollow}
            onCancel={() => setConfirmUnfollow(null)}
          />
        )}

        {/* 覆盖层：图片查看器 */}
        {imageLightbox && (
          <ImageLightbox
            post={imageLightbox.post}
            initialIndex={imageLightbox.imgIdx}
            visibleImgCount={imageLightbox.visibleImgCount}
            onClose={() => setImageLightbox(null)}
          />
        )}

        {/* 覆盖层：文章阅读器 */}
        {articleReaderPost && (
          <ArticleReader
            post={articleReaderPost}
            onClose={() => setArticleReaderPost(null)}
          />
        )}

        {/* 覆盖层：视频播放器 */}
        {videoPlayerPost && (
          <VideoPlayer
            post={videoPlayerPost}
            onClose={() => setVideoPlayerPost(null)}
          />
        )}

        {/* 覆盖层：链接面额选择 */}
        {linkSheet && (() => {
          const linkPost = posts.find(p => p.id === linkSheet.postId);
          if (!linkPost) return null;
          return (
            <LinkSheet
              post={linkPost}
              mode={linkSheet.mode}
              onSuccess={() => {
                const id = linkSheet.postId;
                setLinkSheet(null);
                performLink(id);
              }}
              onClose={() => setLinkSheet(null)}
            />
          );
        })()}

        {/* 覆盖层：每日签到领取空投 */}
        {checkInPreview && (
          <CheckInModal
            preview={checkInPreview}
            onClaim={handleClaimCheckIn}
            onClose={() => setCheckInPreview(null)}
          />
        )}

        {/* Toast */}
        {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} />}

      </div>
    </AppProvider>
  );
}