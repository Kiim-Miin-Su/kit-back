import { Injectable } from "@nestjs/common";
import { createFrontAlignedAssignmentDatabase } from "../mock-data/front-aligned.mock";
import { AssignmentsRepository } from "./assignment.repository";
import { AssignmentDatabase } from "./assignment.types";

@Injectable()
export class InMemoryAssignmentsRepository implements AssignmentsRepository {
  private database: AssignmentDatabase;

  constructor() {
    this.database = createFrontAlignedAssignmentDatabase();
  }

  read(): AssignmentDatabase {
    return this.clone(this.database);
  }

  write(database: AssignmentDatabase): void {
    this.database = this.clone(database);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
