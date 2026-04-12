import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createFrontAlignedAttendanceDatabase } from "../mock-data/front-aligned.mock";
import { AttendanceRepository } from "./attendance.repository";
import { AttendanceDatabase, AttendanceStatus } from "./attendance.types";

type AttendanceRecordWithSchedule = {
  userId: string;
  attendanceStatus: string;
  checkedAt: Date | null;
  schedule: {
    scheduleId: string;
    checkInCode: string | null;
  };
};

@Injectable()
export class PrismaAttendanceRepository implements AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(): Promise<AttendanceDatabase> {
    const base = createFrontAlignedAttendanceDatabase();
    const records = await this.prisma.attendanceRecord.findMany({
      include: {
        schedule: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const checkInCodeByScheduleKey = { ...base.checkInCodeByScheduleKey };
    for (const record of records) {
      const scheduleKey = this.normalizeScheduleKey(record.schedule.scheduleId);
      if (record.schedule.checkInCode) {
        checkInCodeByScheduleKey[scheduleKey] = record.schedule.checkInCode;
      }
    }

    return {
      ...base,
      checkInCodeByScheduleKey,
      records: records.map((record: AttendanceRecordWithSchedule) => ({
        userId: record.userId,
        scheduleKey: this.normalizeScheduleKey(record.schedule.scheduleId),
        attendanceStatus: this.toAttendanceStatus(record.attendanceStatus),
        checkedAt: record.checkedAt?.toISOString(),
      })),
    };
  }

  async write(database: AttendanceDatabase): Promise<void> {
    const scheduleIdByKey = new Map<string, string>(
      Object.keys(database.checkInCodeByScheduleKey).map((scheduleKey) => [
        scheduleKey,
        this.resolveScheduleIdFromKey(scheduleKey),
      ]),
    );
    const uniqueKeys = database.records.map(
      (record) => `${record.userId}::${scheduleIdByKey.get(record.scheduleKey) ?? record.scheduleKey}`,
    );

    await this.prisma.$transaction([
      this.prisma.attendanceRecord.deleteMany(),
      ...database.records.map((record) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            userId_scheduleId: {
              userId: record.userId,
              scheduleId: scheduleIdByKey.get(record.scheduleKey) ?? record.scheduleKey,
            },
          },
          create: {
            userId: record.userId,
            scheduleId: scheduleIdByKey.get(record.scheduleKey) ?? record.scheduleKey,
            attendanceStatus: record.attendanceStatus,
            checkedAt: record.checkedAt ? new Date(record.checkedAt) : undefined,
          },
          update: {
            attendanceStatus: record.attendanceStatus,
            checkedAt: record.checkedAt ? new Date(record.checkedAt) : null,
          },
        }),
      ),
    ]);
  }

  private normalizeScheduleKey(scheduleId: string) {
    if (scheduleId.startsWith("attendance-morning")) return "daily-check-in";
    if (scheduleId.startsWith("attendance-afternoon")) return "missed-check-in";
    return scheduleId;
  }

  private resolveScheduleIdFromKey(scheduleKey: string) {
    if (scheduleKey === "daily-check-in") {
      return "attendance-morning-1";
    }

    if (scheduleKey === "missed-check-in") {
      return "attendance-afternoon-missed";
    }

    return scheduleKey;
  }

  private toAttendanceStatus(status: string): AttendanceStatus {
    if (status === "CHECKED_IN" || status === "LATE" || status === "ABSENT") {
      return status;
    }

    return "NOT_CHECKED_IN";
  }
}
