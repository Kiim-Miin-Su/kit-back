import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { readCorsOrigin, validateProductionRuntimeEnv } from "./common/runtime-env";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("AI Edu API")
    .setDescription("KIT Project LMS REST API")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "Token" })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, document);

  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
