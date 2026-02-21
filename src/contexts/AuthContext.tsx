"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { sessionManager } from "@/lib/session-manager";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<{ error: unknown } | void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchProfile = useCallback(
    async (userId: string, retry = 0): Promise<void> => {
      setProfileLoading(true);
      try {
        if (!userId) {
          console.error("fetchProfile called without userId!");
          setProfileLoading(false);
          return;
        }

        // 🔥 SECURITY: Check session validity before fetching profile
        const isSessionValid = await sessionManager.checkSession();
        if (!isSessionValid && retry === 0) {
          // Try to refresh session once
          const refreshed = await sessionManager.refreshSession();
          if (refreshed && retry < maxRetries) {
            return fetchProfile(userId, retry + 1);
          }
        }

        // Get current user info with timeout
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 10000)
        );

        const { data: { user: authUser }, error: authError } = await Promise.race([
          userPromise,
          timeoutPromise,
        ]) as any;

        if (authError) {
          console.error("Auth error:", authError);
          if (retry < maxRetries) {
            setTimeout(() => fetchProfile(userId, retry + 1), 1000 * (retry + 1));
            return;
          }
          setProfileLoading(false);
          return;
        }

        // Fetch profile with timeout and retry
        const profilePromise = supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        const profileTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timeout")), 10000)
        );

        const { data, error } = await Promise.race([
          profilePromise,
          profileTimeout,
        ]) as any;

        if (error) {
          console.error("Error fetching profile:", error);

          // Retry on network errors or 500 errors
          if (retry < maxRetries && (error.code === 'PGRST116' || error.code?.startsWith('5'))) {
            setTimeout(() => fetchProfile(userId, retry + 1), 1000 * (retry + 1));
            return;
          }

          setProfileLoading(false);
          return;
        }

        if (!data) {
          console.log("Profile not found, creating one...");
          // إنشاء profile جديد
          const { data: newProfile, error: createError } = await supabase
            .from("users")
            .insert({
              id: userId,
              name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || "مستخدم جديد",
              username: authUser?.user_metadata?.username || `user_${userId.slice(0, 8)}`,
              phone: authUser?.user_metadata?.phone || null,
              role: "customer",
              points: 0,
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating profile:", createError);
            setProfileLoading(false);
            return;
          }

          if (newProfile) {
            setProfile(newProfile);
            retryCountRef.current = 0;
            console.log("✅ Profile created successfully:", newProfile);
          }
        } else {
          setProfile(data);
          retryCountRef.current = 0;
        }
      } catch (error: any) {
        console.error("Unexpected error in fetchProfile:", error);

        // Retry on timeout or network errors
        if (retry < maxRetries && (error.message?.includes("timeout") || error.message?.includes("NetworkError"))) {
          setTimeout(() => fetchProfile(userId, retry + 1), 1000 * (retry + 1));
          return;
        }

        // Reset retry count after max retries
        if (retry >= maxRetries) {
          retryCountRef.current = 0;
        }
      } finally {
        setProfileLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Initialize session manager
    sessionManager.initialize();

    const getUser = async () => {
      try {
        // Check session first
        const isSessionValid = await sessionManager.checkSession();

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(user);

        if (user && isSessionValid) {
          await fetchProfile(user.id);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error in getUser:", error);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session: { user?: User | null } | null) => {
        console.log("Auth state changed:", event);

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          sessionManager.cleanup();
          setLoading(false);
          return;
        }

        const currentUser = (session?.user ?? null) as User | null;
        setUser(currentUser);

        if (currentUser) {
          // Check and refresh session if needed
          const isSessionValid = await sessionManager.checkSession();
          if (isSessionValid) {
            await fetchProfile(currentUser.id);
          } else {
            // Try to refresh session
            const refreshed = await sessionManager.refreshSession();
            if (refreshed) {
              await fetchProfile(currentUser.id);
            }
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Register session expiration callback
    const unregister = sessionManager.onSessionExpired(() => {
      console.log("Session expired, signing out...");
      setUser(null);
      setProfile(null);
    });

    return () => {
      subscription.unsubscribe();
      unregister();
      sessionManager.cleanup();
    };
  }, [fetchProfile, supabase]);

  // (duplicate fetchProfile removed)

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setProfile(null);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);
      }

      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();

      return { error };
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      return { error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, profileLoading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
