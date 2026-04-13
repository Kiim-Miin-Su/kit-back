import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { readCorsOrigin, validateProductionRuntimeEnv } from "./common/runtime-env";
import { AppModule } from "./app.module";

async function bootstrap() {
  validateProductionRuntimeEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: readCorsOrigin(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
