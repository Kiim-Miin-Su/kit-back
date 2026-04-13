import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
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
  @ApiOperation({ summary: "파일 업로드 URL 발급", description: "로컬 개발 환경에서 사용할 업로드용 mock URL을 발급합니다." })
  @ApiResponse({ status: 201, description: "fileId + uploadUrl 반환" })
  @ApiResponse({ status: 400, description: "지원하지 않는 MIME 타입(UNSUPPORTED_MIME_TYPE), 크기 초과, checksum 형식 오류" })
  presign(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: PresignFileDto,
  ) {
    return this.filesService.presignFile({ ...body, ownerId: user.userId });
  }

  @Post("complete")
  @ApiOperation({ summary: "파일 업로드 완료 처리", description: "업로드 후 checksum/size를 검증하고 상태를 COMPLETED로 변경합니다." })
  @ApiResponse({ status: 201, description: "downloadUrl 포함 완료 응답" })
  @ApiResponse({ status: 400, description: "checksum 불일치(CHECKSUM_MISMATCH) 또는 size 불일치" })
  @ApiResponse({ status: 409, description: "이미 완료된 업로드(FILE_UPLOAD_ALREADY_COMPLETED)" })
  complete(@Body() body: CompleteFileUploadDto) {
    return this.filesService.completeFileUpload(body);
  }

  @Get(":fileId")
  @ApiOperation({ summary: "파일 메타데이터 조회" })
  @ApiResponse({ status: 200, description: "파일 메타데이터 반환" })
  @ApiResponse({ status: 404, description: "파일 없음 (FILE_NOT_FOUND)" })
  getFileMetadata(@Param("fileId") fileId: string) {
    return this.filesService.getFileMetadata(fileId);
  }
}
