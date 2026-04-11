import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FILES_REPOSITORY } from "./files.repository";
import { FilesService } from "./files.service";
import { InMemoryFilesRepository } from "./in-memory-files.repository";

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: FILES_REPOSITORY,
      useClass: InMemoryFilesRepository,
    },
  ],
  exports: [FILES_REPOSITORY],
})
export class FilesModule {}
