import { Injectable } from "@nestjs/common";
import { createFrontAlignedAttendanceDatabase } from "../mock-data/front-aligned.mock";
import { AttendanceRepository } from "./attendance.repository";
import { AttendanceDatabase } from "./attendance.types";

@Injectable()
export class InMemoryAttendanceRepository implements AttendanceRepository {
  private database: AttendanceDatabase;

  constructor() {
    this.database = createFrontAlignedAttendanceDatabase();
  }

  read(): AttendanceDatabase {
    return this.clone(this.database);
  }

  write(database: AttendanceDatabase): void {
    this.database = this.clone(database);
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
