import { BaseRepository } from "./BaseRepository";
import { UserProfile } from "../types/firestore";

/**
 * Repository to manage user profiles and permission records in Firestore.
 */
export class UserRepository extends BaseRepository<UserProfile> {
  constructor() {
    super("users");
  }
}
export default UserRepository;
