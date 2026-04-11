import { AttendanceDatabase } from "./attendance.types";

export const ATTENDANCE_REPOSITORY = Symbol("ATTENDANCE_REPOSITORY");

export interface AttendanceRepository {
  read(): Promise<AttendanceDatabase>;
  write(database: AttendanceDatabase): Promise<void>;
}
