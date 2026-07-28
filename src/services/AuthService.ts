import { auth } from "../firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { UserRepository } from "../repositories/UserRepository";
import { UserProfile, UserRole } from "../types/firestore";

export class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  /**
   * Performs standard authentication login.
   */
  async login(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  /**
   * Logs out the current user session.
   */
  async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Retreives the Firestore-backed profile of the authenticated user.
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    return this.userRepo.get(uid);
  }

  /**
   * Synchronizes or initializes standard user profile upon Auth registration.
   */
  async syncUserProfile(user: User): Promise<UserProfile> {
    const existing = await this.userRepo.get(user.uid);
    if (existing) return existing;

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "Anonymous Creator",
      role: "user" as UserRole,
      status: "active",
      photoURL: user.photoURL || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.userRepo.createWithId(user.uid, newProfile);
    return newProfile;
  }

  /**
   * Subscribes to the live Authentication state.
   */
  subscribeToAuth(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}

export const authService = new AuthService();
export default authService;
