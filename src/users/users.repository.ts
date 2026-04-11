import { UsersDatabase } from "./users.types";

export const USERS_REPOSITORY = Symbol("USERS_REPOSITORY");

export interface UsersRepository {
  read(): UsersDatabase;
  write(database: UsersDatabase): void;
}
