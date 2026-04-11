import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { USERS_REPOSITORY, UsersRepository } from "./users.repository";
import {
  AppUserRole,
  RawUserSeed,
  StoredUserRecord,
  UserProfileResponse,
  UsersDatabase,
} from "./users.types";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly repository: UsersRepository,
  ) {}

  async findByUserId(userId: string): Promise<StoredUserRecord | undefined> {
    return (await this.readUserDatabase()).users.find((user) => user.userId === userId);
  }

  async findByEmail(email: string): Promise<StoredUserRecord | undefined> {
    const normalizedEmail = this.normalizeEmail(email);
    return (await this.readUserDatabase()).users.find((user) => user.email === normalizedEmail);
  }

  verifyPassword(user: StoredUserRecord, password: string): boolean {
    const derivedHash = this.derivePasswordHash(password, user.passwordSalt);
    return timingSafeEqual(Buffer.from(user.passwordHash), Buffer.from(derivedHash));
  }

  async getMyProfile(userId: string): Promise<UserProfileResponse> {
    return this.toUserProfile(await this.getUserOrThrow(userId));
  }

  async register(input: CreateUserDto): Promise<UserProfileResponse> {
    const database = await this.readUserDatabase();
    const email = this.normalizeEmail(input.email);

    if (database.users.some((user) => user.email === email)) {
      throw new ConflictException({
        code: "EMAIL_ALREADY_IN_USE",
        message: `email=${email} 는 이미 사용 중입니다.`,
      });
    }

    const userId = this.createUserId(input.userName);
    const now = new Date().toISOString();
    const credential = this.createCredential(input.password);
    const created: StoredUserRecord = {
      userId,
      email,
      passwordHash: credential.passwordHash,
      passwordSalt: credential.passwordSalt,
      userName: input.userName.trim(),
      birthDate: input.birthDate,
      title: "수강생",
      role: "student",
      createdAt: now,
      updatedAt: now,
    };

    database.users.push(created);
    await this.repository.write(database);
    return this.toUserProfile(created);
  }

  async updateMe(userId: string, input: UpdateUserDto): Promise<UserProfileResponse> {
    const database = await this.readUserDatabase();
    const targetIndex = database.users.findIndex((user) => user.userId === userId);

    if (targetIndex < 0) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: `userId=${userId} 사용자를 찾을 수 없습니다.`,
      });
    }

    const existing = database.users[targetIndex];
    const updated: StoredUserRecord = {
      ...existing,
      userName: input.userName?.trim() || existing.userName,
      birthDate: input.birthDate ?? existing.birthDate,
      title: input.title?.trim() || existing.title,
      updatedAt: new Date().toISOString(),
    };

    if (updated.userName.length === 0) {
      throw new BadRequestException({
        code: "INVALID_USER_NAME",
        message: "userName은 비어 있을 수 없습니다.",
      });
    }

    database.users[targetIndex] = updated;
    await this.repository.write(database);
    return this.toUserProfile(updated);
  }

  createStoredUserFromSeed(seed: RawUserSeed): StoredUserRecord {
    const credential = this.createCredential(seed.password);
    return {
      userId: seed.userId,
      email: this.normalizeEmail(seed.email),
      passwordHash: credential.passwordHash,
      passwordSalt: credential.passwordSalt,
      userName: seed.userName,
      birthDate: seed.birthDate,
      title: seed.title,
      role: seed.role,
      createdAt: seed.createdAt,
      updatedAt: seed.createdAt,
    };
  }

  toUserProfile(user: StoredUserRecord): UserProfileResponse {
    return {
      userId: user.userId,
      email: user.email,
      userName: user.userName,
      birthDate: user.birthDate,
      role: user.role,
      title: user.title,
    };
  }

  private async getUserOrThrow(userId: string): Promise<StoredUserRecord> {
    const found = await this.findByUserId(userId);

    if (!found) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: `userId=${userId} 사용자를 찾을 수 없습니다.`,
      });
    }

    return found;
  }

  private readUserDatabase(): Promise<UsersDatabase> {
    return this.repository.read();
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private createCredential(password: string) {
    const normalizedPassword = password.trim();
    const passwordSalt = randomBytes(16).toString("hex");
    return {
      passwordSalt,
      passwordHash: this.derivePasswordHash(normalizedPassword, passwordSalt),
    };
  }

  private derivePasswordHash(password: string, salt: string) {
    return scryptSync(password, salt, 64).toString("hex");
  }

  private createUserId(userName: string) {
    const normalizedName = userName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fallbackName = normalizedName || "student";
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
    return `${fallbackName}-${suffix}`;
  }
}
