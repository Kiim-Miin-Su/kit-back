import { IsOptional, IsString } from "class-validator";

export class SearchAdminUsersQueryDto {
  @IsOptional()
  @IsString()
  query?: string;
}
