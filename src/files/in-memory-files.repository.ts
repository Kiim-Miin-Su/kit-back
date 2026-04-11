import { Injectable } from "@nestjs/common";
import { createFrontAlignedFileRecords } from "../mock-data/front-aligned.mock";
import { FilesRepository } from "./files.repository";
import { StoredFileRecord } from "./files.types";

@Injectable()
export class InMemoryFilesRepository implements FilesRepository {
  private readonly byId = new Map<string, StoredFileRecord>();

  constructor() {
    const seeds = createFrontAlignedFileRecords();
    for (const seed of seeds) {
      this.byId.set(seed.fileId, this.clone(seed));
    }
  }

  save(record: StoredFileRecord): void {
    this.byId.set(record.fileId, this.clone(record));
  }

  findById(fileId: string): StoredFileRecord | undefined {
    const found = this.byId.get(fileId);
    return found ? this.clone(found) : undefined;
  }

  update(record: StoredFileRecord): void {
    this.byId.set(record.fileId, this.clone(record));
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
