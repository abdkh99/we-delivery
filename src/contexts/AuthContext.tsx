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
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

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
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Prevents duplicate parallel fetches and refetching a profile we already have.
  const inFlightRef = useRef<string | null>(null);
  const loadedForRef = useRef<string | null>(null);

  const fetchProfile = useCallback(
    async (authUser: User, force = false): Promise<void> => {
      if (inFlightRef.current === authUser.id) return;
      if (!force && loadedForRef.current === authUser.id) {
        setProfileLoading(false);
        return;
      }

      inFlightRef.current = authUser.id;
      setProfileLoading(true);

      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error(
            "[auth] profile fetch failed:",
            error.code,
            error.message,
          );
          return;
        }

        if (data) {
          setProfile(data);
          loadedForRef.current = authUser.id;
          return;
        }

        // No row yet (e.g. account created before the DB trigger existed) -> create it.
        // NOTE: `phone` is NOT NULL in the DB, so it must be "" and never null.
        const meta = authUser.user_metadata ?? {};
        const username: string =
          meta.username ||
          authUser.email
            ?.split("@")[0]
            ?.toLowerCase()
            .replace(/[^a-z0-9_]/g, "_") ||
          `user_${authUser.id.slice(0, 8)}`;

        const { data: created, error: createError } = await supabase
          .from("users")
          .insert({
            id: authUser.id,
            name: meta.full_name || meta.name || username,
            username,
            phone: meta.phone || "",
            email: authUser.email ?? null,
            role: "customer",
            points: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error(
            "[auth] profile create failed:",
            createError.code,
            createError.message,
          );
          return;
        }

        setProfile(created);
        loadedForRef.current = authUser.id;
      } catch (err) {
        console.error("[auth] unexpected profile error:", err);
      } finally {
        inFlightRef.current = null;
        setProfileLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    // supabase-js already auto-refreshes the token, and INITIAL_SESSION fires
    // right after subscribing, so no manual getUser()/session polling is needed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        setProfile(null);
        setProfileLoading(false);
        loadedForRef.current = null;
        return;
      }

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        setProfileLoading(true);
        // IMPORTANT: never `await` supabase calls directly inside this callback.
        // It runs while the auth lock is held, which deadlocks the profile query.
        // Deferring with setTimeout releases the lock first.
        setTimeout(() => {
          void fetchProfile(currentUser, event === "USER_UPDATED");
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signOut = async () => {
    try {
      setUser(null);
      setProfile(null);
      loadedForRef.current = null;

      const { error } = await supabase.auth.signOut();
      if (error) console.error("Error signing out:", error);

      localStorage.clear();
      sessionStorage.clear();

      return { error };
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      return { error };
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user, true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        signOut,
        refreshProfile,
      }}
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
