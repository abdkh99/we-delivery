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

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<{ error: unknown } | void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        if (!userId) {
          console.error("fetchProfile called without userId!");
          return;
        }

        // Get current user info
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        if (!data) {
          console.log("Profile not found, creating one...");
          // إنشاء profile جديد
          const { data: newProfile, error: createError } = await supabase
            .from("users")
            .insert({
              id: userId,
              name: user?.user_metadata?.full_name || user?.user_metadata?.name || "مستخدم جديد",
              username: user?.user_metadata?.username || `user_${userId.slice(0, 8)}`,
              phone: user?.user_metadata?.phone || null,
              role: "customer",
              points: 0,
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating profile:", createError);
            return;
          }

          if (newProfile && isMountedRef.current) {
            setProfile(newProfile);
            console.log("✅ Profile created successfully");
          }
        } else {
          if (isMountedRef.current) {
            setProfile(data);
          }
        }
      } catch (error) {
        console.error("Unexpected error in fetchProfile:", error);
      }
    },
    [supabase]
  );

  // ✅ دالة للحصول على المستخدم مع retry logic
  const getUserWithRetry = useCallback(async (): Promise<User | null> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${maxRetries + 1} to get user...`);
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);
          
          // إذا الخطأ network-related وعندنا محاولات باقية
          if (attempt < maxRetries && (
            error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('timeout')
          )) {
            // انتظر قبل المحاولة التالية (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw error;
        }
        
        if (user) {
          console.log(`✅ User fetched successfully on attempt ${attempt + 1}`);
          retryCountRef.current = 0;
          return user;
        }
        
        // لا يوجد user ولا يوجد error - المستخدم غير مسجل دخول
        console.log("ℹ️ No user session found");
        return null;
        
      } catch (error) {
        console.error(`❌ Error in attempt ${attempt + 1}:`, error);
        
        // آخر محاولة - نفشل
        if (attempt === maxRetries) {
          console.error("❌ All retry attempts failed");
          return null;
        }
      }
    }
    
    return null;
  }, [supabase]);

  useEffect(() => {
    isMountedRef.current = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        console.log("🔐 Initializing auth...");
        
        // ✅ محاولة الحصول على المستخدم مع retry
        const currentUser = await getUserWithRetry();
        
        if (isMountedRef.current) {
          setUser(currentUser);
          
          if (currentUser) {
            console.log("✅ User found:", currentUser.id);
            await fetchProfile(currentUser.id);
          } else {
            console.log("ℹ️ No user session");
            setProfile(null);
          }
          
          setLoading(false);
        }

        // ✅ الاشتراك في تغييرات الـ auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            console.log("🔄 Auth state changed:", _event);
            
            const newUser = session?.user ?? null;
            
            if (isMountedRef.current) {
              setUser(newUser);
              
              if (newUser) {
                console.log("✅ New user session:", newUser.id);
                await fetchProfile(newUser.id);
              } else {
                console.log("ℹ️ User session ended");
                setProfile(null);
              }
              
              setLoading(false);
            }
          }
        );
        
        authSubscription = subscription;
        
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMountedRef.current = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [fetchProfile, supabase, getUserWithRetry]);

  const signOut = async () => {
    try {
      console.log("🔴 Starting sign out process...");
      
      // ✅ 1. Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out from Supabase:", error);
      } else {
        console.log("✅ Signed out from Supabase successfully");
      }

      // ✅ 2. Clear local state
      setUser(null);
      setProfile(null);
      console.log("✅ Local state cleared");

      // ✅ 3. Clear cart from localStorage only (keep auth data for Supabase)
      try {
        localStorage.removeItem('cart');
        console.log("✅ Cart cleared from localStorage");
      } catch (storageError) {
        console.error("Error clearing cart:", storageError);
      }

      // ✅ 4. Redirect to home
      setTimeout(() => {
        window.location.href = "/";
      }, 100);

      return { error };
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      // Force reload anyway
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
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
      value={{ user, profile, loading, signOut, refreshProfile }}
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
