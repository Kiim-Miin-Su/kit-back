require("reflect-metadata");
const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module");
const { AuthController } = require("../dist/auth/auth.controller");
const { AuthService } = require("../dist/auth/auth.service");
const { UsersController } = require("../dist/users/users.controller");
const { EnrollmentsController } = require("../dist/enrollments/enrollments.controller");
const { AttendanceController } = require("../dist/attendance/attendance.controller");

let moduleRef;
let authController;
let authService;
let usersController;
let enrollmentsController;
let attendanceController;

beforeEach(async () => {
  moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  authController = moduleRef.get(AuthController);
  authService = moduleRef.get(AuthService);
  usersController = moduleRef.get(UsersController);
  enrollmentsController = moduleRef.get(EnrollmentsController);
  attendanceController = moduleRef.get(AttendanceController);
});

afterEach(async () => {
  await moduleRef.close();
});

function createCookieResponseRecorder() {
  const cookies = [];

  return {
    response: {
      cookie(name, value, options) {
        cookies.push({ name, value, options });
      },
    },
    readCookie(name) {
      return cookies.find((cookie) => cookie.name === name);
    },
  };
}

test("local runtime: 로그인 -> 내 정보 -> refresh 흐름", async () => {
  const signInRecorder = createCookieResponseRecorder();
  const signInResponse = authController.signIn(
    {
      email: "student-demo-01@koreait.academy",
      password: "password123",
    },
    signInRecorder.response,
  );

  assert.equal(typeof signInResponse.accessToken, "string");
  assert.equal(signInResponse.user.id, "student-demo-01");
  assert.equal(signInResponse.user.role, "student");

  const refreshCookie = signInRecorder.readCookie("ai_edu_refresh_token");
  assert.ok(refreshCookie);

  const authenticatedUser = authService.authenticateAccessToken(signInResponse.accessToken);
  const meResponse = authController.getMe(authenticatedUser);
  assert.equal(meResponse.userId, "student-demo-01");
  assert.equal(meResponse.email, "student-demo-01@koreait.academy");

  const refreshRecorder = createCookieResponseRecorder();
  const refreshResponse = authController.refresh(
    {
      headers: {
        cookie: `ai_edu_refresh_token=${encodeURIComponent(refreshCookie.value)}`,
      },
    },
    refreshRecorder.response,
  );

  assert.equal(typeof refreshResponse.accessToken, "string");
  assert.equal(typeof refreshRecorder.readCookie("ai_edu_refresh_token")?.value, "string");
});

test("local runtime: 회원가입 -> 수강신청 -> 내 강의 -> 출석 체크 흐름", async () => {
  const email = `local-student-${Date.now()}@koreait.academy`;
  const registered = usersController.register({
    email,
    password: "password123",
    userName: "로컬 수강생",
    birthDate: "2000-01-01",
  });

  assert.equal(registered.email, email);
  assert.equal(registered.role, "student");

  const signInRecorder = createCookieResponseRecorder();
  const signInResponse = authController.signIn(
    {
      email,
      password: "password123",
    },
    signInRecorder.response,
  );
  const currentUser = authService.authenticateAccessToken(signInResponse.accessToken);

  const enrollmentResponse = enrollmentsController.createEnrollment(currentUser, {
    courseId: "course-react-state",
  });
  assert.equal(enrollmentResponse.courseId, "course-react-state");
  assert.equal(enrollmentResponse.status, "PENDING");

  const myCoursesResponse = enrollmentsController.getMyCourses(currentUser);
  assert.ok(
    myCoursesResponse.some(
      (course) => course.id === "course-react-state" && course.enrollmentStatus === "PENDING",
    ),
  );

  const attendanceWorkspace = attendanceController.getWorkspace(currentUser);
  assert.equal(attendanceWorkspace.classScope, "react-상태-설계-패턴");

  const targetSchedule = attendanceWorkspace.schedules.find(
    (schedule) => schedule.id === "daily-check-in::react-상태-설계-패턴",
  );
  assert.ok(targetSchedule);

  const checkInResponse = attendanceController.checkIn(currentUser, {
    scheduleId: targetSchedule.id,
    code: "381924",
  });
  assert.equal(checkInResponse.scheduleId, targetSchedule.id);
  assert.equal(checkInResponse.attendanceStatus, "CHECKED_IN");
});
