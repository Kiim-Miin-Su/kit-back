require("reflect-metadata");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { GUARDS_METADATA } = require("@nestjs/common/constants");
const { ROLES_KEY } = require("../dist/auth/roles.decorator");
const { AdminUsersController } = require("../dist/admin/admin-users.controller");
const { AdminCoursesController } = require("../dist/admin/admin-courses.controller");
const { AdminSchedulesController } = require("../dist/admin/admin-schedules.controller");
const { AdminAttendanceScopesController } = require("../dist/admin/admin-attendance-scopes.controller");
const { InstructorAssignmentsController } = require("../dist/assignments/instructor-assignments.controller");
const { MeAssignmentsController } = require("../dist/assignments/me-assignments.controller");
const { SubmissionsController } = require("../dist/assignments/submissions.controller");
const { FilesController } = require("../dist/files/files.controller");

function readGuardNames(target) {
  return (Reflect.getMetadata(GUARDS_METADATA, target) ?? []).map((guard) => guard?.name);
}

function readRoles(target) {
  return Reflect.getMetadata(ROLES_KEY, target) ?? [];
}

test("authz contract: 관리자 컨트롤러는 AuthGuard + RolesGuard + admin 역할을 강제한다", () => {
  const adminControllers = [
    AdminUsersController,
    AdminCoursesController,
    AdminSchedulesController,
    AdminAttendanceScopesController,
  ];

  for (const controller of adminControllers) {
    const guards = readGuardNames(controller);
    assert.ok(guards.includes("AuthGuard"));
    assert.ok(guards.includes("RolesGuard"));
    assert.deepEqual(readRoles(controller), ["admin"]);
  }
});

test("authz contract: 강사 컨트롤러는 보호되고 허용 역할이 제한된다", () => {
  const guards = readGuardNames(InstructorAssignmentsController);

  assert.ok(guards.includes("AuthGuard"));
  assert.ok(guards.includes("RolesGuard"));
  assert.deepEqual(
    readRoles(InstructorAssignmentsController),
    ["admin", "instructor", "assistant"],
  );
});

test("authz contract: me/submissions/files 컨트롤러는 최소 AuthGuard로 보호된다", () => {
  const protectedControllers = [
    MeAssignmentsController,
    SubmissionsController,
    FilesController,
  ];

  for (const controller of protectedControllers) {
    const guards = readGuardNames(controller);
    assert.ok(
      guards.includes("AuthGuard"),
      `${controller.name} should include AuthGuard`,
    );
  }
});
