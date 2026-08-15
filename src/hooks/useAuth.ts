import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { authService } from "../services/AuthService";
import { UserProfile } from "../types/firestore";

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkInactivity = async (currentUser: User) => {
      const lastActivity = localStorage.getItem("lastActivityTime");
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT_MS) {
          console.log("Session expired due to 3 hours of inactivity.");
          await authService.logout();
          localStorage.removeItem("lastActivityTime");
          return false;
        }
      }
      return true;
    };

    const unsubscribe = authService.subscribeToAuth(async (currentUser) => {
      if (currentUser) {
        const isActive = await checkInactivity(currentUser);
        if (!isActive) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);
        localStorage.setItem("lastActivityTime", Date.now().toString());

        try {
          const syncedProfile = await authService.syncUserProfile(currentUser);
          setProfile(syncedProfile);
        } catch (error) {
          console.error("Error synchronizing profile during auth transition:", error);
        }
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem("lastActivityTime");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let timeoutId: number;

    const resetTimeout = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (user) {
        localStorage.setItem("lastActivityTime", Date.now().toString());
        timeoutId = window.setTimeout(async () => {
          console.log("Logging out due to 3 hours of inactivity.");
          await authService.logout();
          localStorage.removeItem("lastActivityTime");
        }, INACTIVITY_TIMEOUT_MS);
      }
    };

    const events = ['keydown', 'click', 'touchstart', 'scroll'];

    let throttleTimer: number | null = null;

    const handleActivity = () => {
      if (!throttleTimer) {
        resetTimeout();
        throttleTimer = window.setTimeout(() => {
          throttleTimer = null;
        }, 1000); // Throttle to max once per second
      }
    };

    if (user) {
      resetTimeout();
      events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (throttleTimer) {
        window.clearTimeout(throttleTimer);
      }
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user]);

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
