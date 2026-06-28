import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { app } from "./config";

export const auth = getAuth(app);

export { signInWithEmailAndPassword, signOut, onAuthStateChanged };
export type { User };
