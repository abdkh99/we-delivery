"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
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
          try {
            console.error(
              "Error fetching profile from Supabase:",
              JSON.stringify(error, null, 2)
            );
          } catch {
            console.error("Error fetching profile from Supabase:", error);
          }
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

          if (newProfile) {
            setProfile(newProfile);
            console.log("✅ Profile created successfully:", newProfile);
          }
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error("Unexpected error in fetchProfile:", error);
      }
    },
    [supabase]
  );

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await fetchProfile(user.id);
      }

      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: unknown, session: { user?: User | null } | null) => {
        setUser((session?.user ?? null) as User | null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
