import { AssignmentDatabase } from "./assignment.types";

export const ASSIGNMENTS_REPOSITORY = Symbol("ASSIGNMENTS_REPOSITORY");

export interface AssignmentsRepository {
  read(): AssignmentDatabase;
  write(database: AssignmentDatabase): void;
}
