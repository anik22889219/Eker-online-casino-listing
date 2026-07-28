import { db } from "../firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  QueryConstraint 
} from "firebase/firestore";
import { handleAppError } from "../utils/error";
import { OperationType } from "../firebase/firestore";

/**
 * Highly modular, fully typed Base Repository class for Firestore collection operations.
 */
export class BaseRepository<T extends { id?: string }> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Retrieves a document by its document ID.
   */
  async get(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as T;
      }
      return null;
    } catch (error) {
      throw handleAppError(error, OperationType.GET, `${this.collectionName}/${id}`);
    }
  }

  /**
   * Creates a document at a specific, designated document ID.
   */
  async createWithId(id: string, data: Omit<T, "id">): Promise<T> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await setDoc(docRef, data);
      return { id, ...data } as unknown as T;
    } catch (error) {
      throw handleAppError(error, OperationType.CREATE, `${this.collectionName}/${id}`);
    }
  }

  /**
   * Creates a document with an auto-generated document ID.
   */
  async create(data: Omit<T, "id">): Promise<T> {
    try {
      const colRef = collection(db, this.collectionName);
      const docRef = await addDoc(colRef, data);
      return { id: docRef.id, ...data } as unknown as T;
    } catch (error) {
      throw handleAppError(error, OperationType.CREATE, this.collectionName);
    }
  }

  /**
   * Performs partial updates on a document's attributes.
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data as any);
    } catch (error) {
      throw handleAppError(error, OperationType.UPDATE, `${this.collectionName}/${id}`);
    }
  }

  /**
   * Deletes a document.
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      throw handleAppError(error, OperationType.DELETE, `${this.collectionName}/${id}`);
    }
  }

  /**
   * Executes a query against the collection with specific query constraints.
   */
  async query(constraints: QueryConstraint[]): Promise<T[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);
      const results: T[] = [];
      snap.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      return results;
    } catch (error) {
      throw handleAppError(error, OperationType.LIST, this.collectionName);
    }
  }
}
export default BaseRepository;
