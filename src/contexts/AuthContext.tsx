import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  birth_date: string | null;
  weight: number | null;
  height: number | null;
  gender: string | null;
  is_default_password: boolean;
  avatar_url: string | null;
  created_at: string;
  weight_goal: number | null;
  body_fat_goal: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  isProfileComplete: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string): Promise<void> => {
    setProfileLoading(true);
    try {
      const [{ data: profileData, error: profileError }, { data: roleData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      ]);

      if (!profileError && profileData) {
        setProfile({
          ...profileData,
          role: (roleData?.role as "admin" | "user") || "user",
        });
      } else {
        console.warn("Profile fetch error:", profileError);
        setProfile(null);
      }
    } catch (err) {
      console.error("fetchProfile exception:", err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes — does NOT control loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Deferred to avoid deadlock inside onAuthStateChange callback
          setTimeout(() => {
            if (isMounted) fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
      }
    );

    // Initial load — awaits profile before releasing loading state
    const initializeAuth = async () => {
      try {
        // If sessionStorage flag is missing, browser was closed — clear persisted session
        const isSessionActive = sessionStorage.getItem("hc_session_active");
        if (!isSessionActive) {
          await supabase.auth.signOut();
          sessionStorage.setItem("hc_session_active", "true");
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) console.error("getSession error:", error);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error("initializeAuth error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    window.location.href = "/landing";
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // Profile is considered complete when name and birth_date are filled
  const isProfileComplete = !!(profile?.name && profile?.birth_date);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, profileLoading, isProfileComplete, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
