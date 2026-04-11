import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CompleteFileUploadDto } from "./dto/complete-file-upload.dto";
import { PresignFileDto } from "./dto/presign-file.dto";
import { FILES_REPOSITORY, FilesRepository } from "./files.repository";
import {
  FILE_MAX_SIZE_BYTES,
  FILE_MIME_ALLOWLIST,
  FileCompleteResponse,
  FileMetadataResponse,
  FilePresignResponse,
  StoredFileRecord,
} from "./files.types";

@Injectable()
export class FilesService {
  constructor(
    @Inject(FILES_REPOSITORY)
    private readonly repository: FilesRepository,
  ) {}

  presignFile(input: PresignFileDto): FilePresignResponse {
    this.assertContentType(input.contentType);
    this.assertFileSize(input.size);
    this.assertChecksum(input.checksum);

    const now = new Date().toISOString();
    const fileId = this.createId("file");
    const bucketKey = `${input.ownerId}/${fileId}/${this.normalizeFileName(input.fileName)}`;

    const record: StoredFileRecord = {
      fileId,
      ownerId: input.ownerId,
      fileName: input.fileName,
      bucketKey,
      contentType: input.contentType,
      size: input.size,
      checksum: input.checksum,
      status: "PENDING",
      uploadUrl: this.buildUploadUrl(bucketKey),
      createdAt: now,
    };

    this.repository.save(record);

    return {
      fileId: record.fileId,
      ownerId: record.ownerId,
      bucketKey: record.bucketKey,
      contentType: record.contentType,
      size: record.size,
      checksum: record.checksum,
      status: record.status,
      uploadUrl: record.uploadUrl,
      createdAt: record.createdAt,
    };
  }

  completeFileUpload(input: CompleteFileUploadDto): FileCompleteResponse {
    this.assertChecksum(input.checksum);
    this.assertFileSize(input.size);

    const found = this.repository.findById(input.fileId);

    if (!found) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: `fileId=${input.fileId} 파일을 찾을 수 없습니다.`,
      });
    }

    if (found.status !== "PENDING") {
      throw new ConflictException({
        code: "FILE_UPLOAD_ALREADY_COMPLETED",
        message: `fileId=${input.fileId} 업로드는 이미 처리되었습니다.`,
      });
    }

    if (found.checksum !== input.checksum) {
      throw new BadRequestException({
        code: "CHECKSUM_MISMATCH",
        message: "업로드 완료 checksum이 presign checksum과 일치하지 않습니다.",
      });
    }

    if (found.size !== input.size) {
      throw new BadRequestException({
        code: "FILE_SIZE_MISMATCH",
        message: "업로드 완료 size가 presign size와 일치하지 않습니다.",
      });
    }

    const completedAt = new Date().toISOString();
    const updated: StoredFileRecord = {
      ...found,
      status: "COMPLETED",
      completedAt,
      downloadUrl: this.buildDownloadUrl(found.bucketKey),
    };

    this.repository.update(updated);

    return {
      fileId: updated.fileId,
      status: updated.status,
      completedAt,
      downloadUrl: updated.downloadUrl!,
    };
  }

  getFileMetadata(fileId: string): FileMetadataResponse {
    const found = this.repository.findById(fileId);

    if (!found) {
      throw new NotFoundException({
        code: "FILE_NOT_FOUND",
        message: `fileId=${fileId} 파일을 찾을 수 없습니다.`,
      });
    }

    return {
      fileId: found.fileId,
      ownerId: found.ownerId,
      fileName: found.fileName,
      bucketKey: found.bucketKey,
      contentType: found.contentType,
      size: found.size,
      checksum: found.checksum,
      status: found.status,
      createdAt: found.createdAt,
      completedAt: found.completedAt,
      downloadUrl: found.downloadUrl,
    };
  }

  private assertContentType(contentType: string) {
    if (!FILE_MIME_ALLOWLIST.includes(contentType as (typeof FILE_MIME_ALLOWLIST)[number])) {
      throw new BadRequestException({
        code: "UNSUPPORTED_MIME_TYPE",
        message: `${contentType} MIME 타입은 허용되지 않습니다.`,
      });
    }
  }

  private assertFileSize(size: number) {
    if (!Number.isInteger(size) || size <= 0 || size > FILE_MAX_SIZE_BYTES) {
      throw new BadRequestException({
        code: "FILE_SIZE_LIMIT_EXCEEDED",
        message: `파일 크기는 1 byte 이상 ${FILE_MAX_SIZE_BYTES} byte 이하여야 합니다.`,
      });
    }
  }

  private assertChecksum(checksum: string) {
    const normalized = checksum.trim();

    if (!/^[a-fA-F0-9]{64}$/.test(normalized)) {
      throw new BadRequestException({
        code: "INVALID_CHECKSUM_FORMAT",
        message: "checksum은 sha256 hex(64자) 형식이어야 합니다.",
      });
    }
  }

  private buildUploadUrl(bucketKey: string) {
    const encoded = encodeURIComponent(bucketKey);
    return `https://storage.mock.local/upload/${encoded}?signature=dev-signature`;
  }

  private buildDownloadUrl(bucketKey: string) {
    const encoded = encodeURIComponent(bucketKey);
    return `https://storage.mock.local/download/${encoded}`;
  }

  private normalizeFileName(fileName: string) {
    return fileName.trim().replace(/\s+/g, "-");
  }

  private createId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
  }
}
