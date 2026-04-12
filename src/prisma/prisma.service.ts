import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { isPrismaDataSource } from "../common/data-source";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    if (isPrismaDataSource()) {
      await this.$connect();
    }
  }

  async onModuleDestroy() {
    if (isPrismaDataSource()) {
      await this.$disconnect();
    }
  }
}
