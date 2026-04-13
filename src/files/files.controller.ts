import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AuthGuard } from "../auth/auth.guard";
import { CompleteFileUploadDto } from "./dto/complete-file-upload.dto";
import { PresignFileDto } from "./dto/presign-file.dto";
import { FilesService } from "./files.service";

@Controller("files")
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("presign")
  presign(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: PresignFileDto,
  ) {
    return this.filesService.presignFile(body, user.userId);
  }

  @Post("complete")
  complete(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CompleteFileUploadDto,
  ) {
    return this.filesService.completeFileUpload(body, user.userId);
  }

  @Get(":fileId")
  getFileMetadata(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("fileId") fileId: string,
  ) {
    return this.filesService.getFileMetadata(fileId, user.userId);
  }
}
