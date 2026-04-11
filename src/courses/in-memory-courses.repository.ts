import { Injectable } from "@nestjs/common";
import { createFrontAlignedCoursesDatabase } from "../mock-data/front-aligned.mock";
import { CoursesRepository } from "./courses.repository";
import { CoursesDatabase } from "./courses.types";

@Injectable()
export class InMemoryCoursesRepository implements CoursesRepository {
  private database: CoursesDatabase;

  constructor() {
    this.database = createFrontAlignedCoursesDatabase();
  }

  read(): CoursesDatabase {
    return this.clone(this.database);
  }

  write(database: CoursesDatabase): void {
    this.database = this.clone(database);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
