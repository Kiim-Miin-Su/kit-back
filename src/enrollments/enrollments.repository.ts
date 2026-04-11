import { EnrollmentsDatabase } from "./enrollments.types";

export const ENROLLMENTS_REPOSITORY = Symbol("ENROLLMENTS_REPOSITORY");

export interface EnrollmentsRepository {
  read(): EnrollmentsDatabase;
  write(database: EnrollmentsDatabase): void;
}
