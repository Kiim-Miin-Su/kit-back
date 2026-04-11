import { UsersDatabase } from "./users.types";

export const USERS_REPOSITORY = Symbol("USERS_REPOSITORY");

export interface UsersRepository {
  read(): Promise<UsersDatabase>;
  write(database: UsersDatabase): Promise<void>;
}
