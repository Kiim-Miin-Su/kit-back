import { AttendanceDatabase } from "./attendance.types";

export const ATTENDANCE_REPOSITORY = Symbol("ATTENDANCE_REPOSITORY");

export interface AttendanceRepository {
  read(): AttendanceDatabase;
  write(database: AttendanceDatabase): void;
}
