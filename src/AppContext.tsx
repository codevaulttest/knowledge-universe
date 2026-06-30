import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { ActivityGroup, Draft, InteractionAction, Language, NewPostData, PayCtx, Post, PostAction, Route, StakeModalRequest, UserProfile } from './types';

export type AppContextValue = {
  navigate: (route: Route) => void;
  navigateRoot: (route: Route) => void;
  goBack: () => void;
  canGoBack: boolean;
  openCompose: () => void;
  openComposeWithDraft: (draft: Draft) => void;
  showToast: (message: string, type?: 'demo') => void;
  openLink: (postId: string, mode?: 'link' | 'unlock') => void;
  openPay: (context: PayCtx) => void;
  linkedPostIds: Set<string>;
  followedAuthors: Set<string>;
  toggleFollow: (author: string) => void;
  language: Language;
  setLanguage: Dispatch<SetStateAction<Language>>;
  t: (zh: string, en: string) => string;
  posts: Post[];
  repostedPostIds: Set<string>;
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  togglePostAction: (postId: string, action: PostAction) => void;
  requestPostInteraction: (
    postId: string,
    action: InteractionAction,
    handlers: { onSkip: () => void; onPaid: () => void },
  ) => void;
  beginPaidInteraction: (postId: string, action: InteractionAction, onAfterPay: () => void) => void;
  deletePost: (postId: string) => void;
  requestDeletePost: (postId: string, onAfterDelete?: () => void) => void;
  openEditPost: (postId: string) => void;
  updatePost: (postId: string, newTitle: string) => void;
  incrementReplies: (postId: string) => void;
  stagePendingPost: (data: NewPostData) => void;
  publishPost: (data: NewPostData) => void;
  openImageLightbox: (post: Post, imgIdx: number, imgCount: number) => void;
  openArticleReader: (post: Post) => void;
  openVideoPlayer: (post: Post) => void;
  activityGroups: ActivityGroup[];
  unreadActivityCount: number;
  markAllRead: () => void;
  openCheckIn: () => void;
  checkInClaimable: boolean;
  recentSearches: string[];
  saveRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  drafts: Draft[];
  saveDraft: (draft: Omit<Draft, 'id' | 'savedAt'>) => void;
  updateDraft: (draftId: string, draft: Omit<Draft, 'id' | 'savedAt'>) => void;
  deleteDraft: (draftId: string) => void;
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => void;
};


const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
