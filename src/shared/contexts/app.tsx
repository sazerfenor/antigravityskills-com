'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { getAuthClient, useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { User } from '@/shared/models/user';
import { parseApiResponse } from '@/shared/types/api';
import { DebugProvider } from '@/shared/contexts/debug';
import { DebugPanel } from '@/shared/components/dev/debug-panel';

export interface ContextValue {
  user: User | null;
  isCheckSign: boolean;
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  isShowPaymentModal: boolean;
  setIsShowPaymentModal: (show: boolean) => void;
  configs: Record<string, string>;
  fetchUserCredits: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
  // 通知相关
  unreadCount: number;
  fetchUnreadCount: () => Promise<void>;
  // 登出优化
  handleSignOut: () => Promise<void>;
}

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [configs, setConfigs] = useState<Record<string, string>>({});

  // sign user
  const [user, setUser] = useState<User | null>(null);

  // session
  const { data: session, isPending } = useSession();

  // is check sign (true during SSR and initial render to avoid hydration mismatch when auth is enabled)
  const [isCheckSign, setIsCheckSign] = useState(!!envConfigs.auth_secret);

  // show sign modal
  const [isShowSignModal, setIsShowSignModal] = useState(false);

  // show payment modal
  const [isShowPaymentModal, setIsShowPaymentModal] = useState(false);

  // 通知未读数
  const [unreadCount, setUnreadCount] = useState(0);

  // 防止重复请求的标志
  const [isFetchingUserInfo, setIsFetchingUserInfo] = useState(false);

  const fetchConfigs = async function () {
    try {
      const resp = await fetch('/api/config/get-configs', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = parseApiResponse(await resp.json());
      if (code !== 0) {
        throw new Error(message);
      }

      setConfigs(data);
    } catch (e) {
      console.log('fetch configs failed:', e);
    }
  };

  const fetchUserCredits = async function () {
    try {
      if (!user) {
        return;
      }

      const resp = await fetch('/api/user/get-user-credits', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = parseApiResponse(await resp.json());
      if (code !== 0) {
        throw new Error(message);
      }

      setUser({ ...user, credits: data });
    } catch (e) {
      console.log('fetch user credits failed:', e);
    }
  };

  const fetchUserInfo = async function () {
    // 防止重复请求
    if (isFetchingUserInfo) return;
    setIsFetchingUserInfo(true);
    
    try {
      const resp = await fetch('/api/user/get-user-info', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = parseApiResponse(await resp.json());
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
    } catch (e) {
      console.log('fetch user info failed:', e);
    } finally {
      setIsFetchingUserInfo(false);
    }
  };

  // 获取未读通知数
  const fetchUnreadCount = async function () {
    try {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      const resp = await fetch('/api/notifications/unread-count');
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, data } = parseApiResponse(await resp.json());
      if (code === 0) {
        setUnreadCount(data.count || 0);
      }
    } catch (e) {
      console.log('fetch unread count failed:', e);
    }
  };

  // 优化的登出函数：立即清除本地状态，避免竞态条件
  const handleSignOut = async function () {
    // 1. 立即清除本地状态，避免其他组件尝试请求
    setUser(null);
    setUnreadCount(0);
    
    // 2. 再调用 signOut API
    try {
      const { signOut } = await import('@/core/auth/client');
      await signOut();
    } catch (e) {
      console.log('sign out failed:', e);
    }
  };

  const showOneTap = async function (configs: Record<string, string>) {
    try {
      // Get current path to redirect back after login
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      
      const authClient = getAuthClient(configs);
      await authClient.oneTap({
        callbackURL: '/', // OAuth callback URL must be /
        onPromptNotification: (notification: any) => {
          // Handle prompt dismissal silently
          console.log('One Tap prompt notification:', notification);
        },
        fetchOptions: {
          onSuccess: () => {
            // After successful login, redirect to current page
            if (currentPath !== '/') {
              router.push(currentPath);
            }
          },
        },
      });
    } catch (error) {
      // Silently handle One Tap cancellation errors
      // These errors are expected during FedCM migration and can be ignored
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    // 只在 user.id 变化时触发，避免 session 对象引用变化导致重复请求
    if (session?.user?.id) {
      setUser(session.user as User);
      fetchUserInfo();
    } else if (!session) {
      setUser(null);
      setUnreadCount(0);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (
      configs &&
      configs.google_client_id &&
      configs.google_one_tap_enabled === 'true' &&
      !session &&
      !isPending
    ) {
      showOneTap(configs);
    }
  }, [configs, session, isPending]);

  useEffect(() => {
    if (user && !user.credits) {
      // fetchUserCredits();
    }
  }, [user]);

  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending]);

  // 用户登录后获取未读数，并设置定时刷新
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // 每分钟刷新
      return () => clearInterval(interval);
    }
  }, [user?.id]); // 只在 user.id 变化时触发，避免重复请求

  return (
    <AppContext.Provider
      value={{
        user,
        isCheckSign,
        isShowSignModal,
        setIsShowSignModal,
        isShowPaymentModal,
        setIsShowPaymentModal,
        configs,
        fetchUserCredits,
        fetchUserInfo,
        unreadCount,
        fetchUnreadCount,
        handleSignOut,
      }}
    >
      <DebugProvider>
        {children}
        <DebugPanel />
      </DebugProvider>
    </AppContext.Provider>
  );
};
