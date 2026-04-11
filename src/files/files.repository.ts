import { StoredFileRecord } from "./files.types";

export const FILES_REPOSITORY = Symbol("FILES_REPOSITORY");

export interface FilesRepository {
  save(record: StoredFileRecord): void;
  findById(fileId: string): StoredFileRecord | undefined;
  update(record: StoredFileRecord): void;
}
