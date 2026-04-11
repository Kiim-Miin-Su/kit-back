import { CoursesDatabase } from "./courses.types";

export const COURSES_REPOSITORY = Symbol("COURSES_REPOSITORY");

export interface CoursesRepository {
  read(): CoursesDatabase;
  write(database: CoursesDatabase): void;
}
