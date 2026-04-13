import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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

  const config = new DocumentBuilder()
    .setTitle("AI Edu LMS API")
    .setDescription("KIT Project LMS REST API — 인증, 강좌, 수강, 출석, 과제, 관리자")
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "Token", in: "header" },
      "access-token",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
