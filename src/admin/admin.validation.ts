import { BadRequestException } from "@nestjs/common";

export const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_REGEX.test(value)) {
    return false;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

export function assertValidDateKey(value: string, errorCode = "INVALID_DATE_KEY") {
  if (!isValidDateKey(value)) {
    throw new BadRequestException({
      code: errorCode,
      message: `${value} 는 유효한 YYYY-MM-DD 날짜가 아닙니다.`,
    });
  }
}

export function toClassScope(courseId: string, courseTitle: string): string {
  const titleScope = toSlug(courseTitle);

  if (titleScope.length > 0) {
    return titleScope;
  }

  const idScope = toSlug(courseId);
  return idScope.length > 0 ? idScope : "academy-default-class";
}

export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseIsoDateTime(value: string, errorCode = "INVALID_DATETIME") {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: errorCode,
      message: `${value} 는 유효한 ISO datetime 문자열이 아닙니다.`,
    });
  }

  return parsed;
}
