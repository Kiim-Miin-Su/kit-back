export const fileUploadStatusValues = ["PENDING", "COMPLETED", "FAILED"] as const;
export type FileUploadStatus = (typeof fileUploadStatusValues)[number];

export const FILE_MIME_ALLOWLIST = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "video/mp4",
] as const;

export const FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;

export interface StoredFileRecord {
  fileId: string;
  ownerId: string;
  fileName: string;
  bucketKey: string;
  contentType: string;
  size: number;
  checksum: string;
  status: FileUploadStatus;
  uploadUrl: string;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface FilePresignResponse {
  fileId: string;
  ownerId: string;
  bucketKey: string;
  contentType: string;
  size: number;
  checksum: string;
  status: FileUploadStatus;
  uploadUrl: string;
  createdAt: string;
}

export interface FileCompleteResponse {
  fileId: string;
  status: FileUploadStatus;
  completedAt: string;
  downloadUrl: string;
}

export interface FileMetadataResponse {
  fileId: string;
  ownerId: string;
  fileName: string;
  bucketKey: string;
  contentType: string;
  size: number;
  checksum: string;
  status: FileUploadStatus;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
}
