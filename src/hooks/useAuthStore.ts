import { create } from 'zustand';
import { User } from '@trackmun/shared';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/query-client';

interface AuthState {
  user: User | null;
  isImpersonating: boolean;
  impersonatedUser: User | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  startImpersonation: (token: string, targetUser: User) => void;
  stopImpersonation: () => void;
  /** Clears impersonation + Zustand session state and signs out of Supabase. Use from all app logouts. */
  logout: () => Promise<void>;
}

interface StoredImpersonation {
  token: string | null;
  impersonated: User | null;
  /** The real admin who initiated impersonation — restored on page refresh. */
  adminUser: User | null;
}

function readStoredImpersonation(): StoredImpersonation {
  if (typeof localStorage === 'undefined') {
    return { token: null, impersonated: null, adminUser: null };
  }
  const token = localStorage.getItem('impersonation_token');
  if (!token) return { token: null, impersonated: null, adminUser: null };

  try {
    const impersonated = localStorage.getItem('impersonated_user');
    const adminRaw = localStorage.getItem('admin_user');
    return {
      token,
      impersonated: impersonated ? (JSON.parse(impersonated) as User) : null,
      adminUser: adminRaw ? (JSON.parse(adminRaw) as User) : null,
    };
  } catch {
    return { token, impersonated: null, adminUser: null };
  }
}

const { token: initToken, impersonated: initImpersonated, adminUser: initAdminUser } =
  readStoredImpersonation();

// We're "fully hydrated" from localStorage only when all three pieces are present.
const fullyHydrated = !!(initToken && initImpersonated && initAdminUser);

export const useAuthStore = create<AuthState>((set, get) => ({
  /**
   * `user` is ALWAYS the real logged-in admin — never the impersonated target.
   * This prevents the admin ProtectedRoute from re-rendering with the wrong role
   * when impersonation starts and racing navigate() to fire a 403 redirect.
   */
  user: fullyHydrated ? initAdminUser : null,
  isImpersonating: !!initToken,
  impersonatedUser: initImpersonated,
  // isLoading stays true when we need ProtectedRoute to fetch the admin user.
  isLoading: !fullyHydrated,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  startImpersonation: (token, targetUser) => {
    const adminUser = get().user; // capture current admin before anything changes
    localStorage.setItem('impersonation_token', token);
    localStorage.setItem('impersonated_user', JSON.stringify(targetUser));
    if (adminUser) {
      localStorage.setItem('admin_user', JSON.stringify(adminUser));
    }
    set({
      isImpersonating: true,
      impersonatedUser: targetUser,
      // Keep user as the admin — changing it to targetUser is what causes
      // the admin ProtectedRoute to see the wrong role and redirect to /403.
      isLoading: false,
    });
  },

  stopImpersonation: () => {
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('impersonated_user');
    localStorage.removeItem('admin_user');
    set({ isImpersonating: false, impersonatedUser: null, user: null, isLoading: true });
  },

  logout: async () => {
    get().stopImpersonation();
    await supabase.auth.signOut();
    queryClient.clear();
    // Beat races where ProtectedRoute resolved /auth/me while the session was winding down.
    set({ user: null, isImpersonating: false, impersonatedUser: null, isLoading: false });
  },
}));
