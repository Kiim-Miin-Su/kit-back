import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CompleteFileUploadDto } from "./dto/complete-file-upload.dto";
import { PresignFileDto } from "./dto/presign-file.dto";
import { FilesService } from "./files.service";

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("presign")
  presign(@Body() body: PresignFileDto) {
    return this.filesService.presignFile(body);
  }

  @Post("complete")
  complete(@Body() body: CompleteFileUploadDto) {
    return this.filesService.completeFileUpload(body);
  }

  @Get(":fileId")
  getFileMetadata(@Param("fileId") fileId: string) {
    return this.filesService.getFileMetadata(fileId);
  }
}
