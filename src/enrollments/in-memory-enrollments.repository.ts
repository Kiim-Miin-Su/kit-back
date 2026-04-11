import { Injectable } from "@nestjs/common";
import { createFrontAlignedEnrollmentsDatabase } from "../mock-data/front-aligned.mock";
import { EnrollmentsRepository } from "./enrollments.repository";
import { EnrollmentsDatabase } from "./enrollments.types";

@Injectable()
export class InMemoryEnrollmentsRepository implements EnrollmentsRepository {
  private database: EnrollmentsDatabase;

  constructor() {
    this.database = createFrontAlignedEnrollmentsDatabase();
  }

  read(): EnrollmentsDatabase {
    return this.clone(this.database);
  }

  write(database: EnrollmentsDatabase): void {
    this.database = this.clone(database);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
