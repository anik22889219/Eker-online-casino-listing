import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { authService } from "../services/AuthService";
import { UserProfile } from "../types/firestore";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const syncedProfile = await authService.syncUserProfile(currentUser);
          setProfile(syncedProfile);
        } catch (error) {
          console.error("Error synchronizing profile during auth transition:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === "admin" || profile?.role === "super_admin",
    isModerator: profile?.role === "moderator" || profile?.role === "admin" || profile?.role === "super_admin"
  };
}

export default useAuth;
