export function isPrismaDataSource() {
  return process.env.DATA_SOURCE === "prisma";
}
