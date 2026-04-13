import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AuthGuard } from "../auth/auth.guard";
import { CompleteFileUploadDto } from "./dto/complete-file-upload.dto";
import { PresignFileDto } from "./dto/presign-file.dto";
import { FilesService } from "./files.service";

@ApiTags("files")
@ApiBearerAuth("access-token")
@Controller("files")
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("presign")
  @ApiOperation({ summary: "파일 업로드 presign URL 발급" })
  presign(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: PresignFileDto,
  ) {
    return this.filesService.presignFile(body, user.userId);
  }

  @Post("complete")
  @ApiOperation({ summary: "파일 업로드 완료 처리" })
  complete(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CompleteFileUploadDto,
  ) {
    return this.filesService.completeFileUpload(body, user.userId);
  }

  @Get(":fileId")
  @ApiOperation({ summary: "파일 메타데이터 조회" })
  getFileMetadata(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("fileId") fileId: string,
  ) {
    return this.filesService.getFileMetadata(fileId, user.userId);
  }
}
