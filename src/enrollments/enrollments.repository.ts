import { EnrollmentsDatabase } from "./enrollments.types";

export const ENROLLMENTS_REPOSITORY = Symbol("ENROLLMENTS_REPOSITORY");

export interface EnrollmentsRepository {
  read(): Promise<EnrollmentsDatabase>;
  write(database: EnrollmentsDatabase): Promise<void>;
}
