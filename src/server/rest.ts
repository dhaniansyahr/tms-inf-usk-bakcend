import { Hono } from "hono";
import { cors } from "hono/cors"
import { prettyJSON } from 'hono/pretty-json'
import routes from "$routes/index";
import { logger } from 'hono/logger'
import { PrismaInstance } from "$utils/prisma.utils"

export default function createRestServer() {
  let allowedOrigins: string[] = ["*"]
  let corsOptions: any = {}
  if (process.env.ENVIRONMENT != "dev") {
    allowedOrigins = process.env.ALLOWED_ORIGINS!.split(",")
    corsOptions.origin = allowedOrigins
  }
  const app = new Hono();
  app.use(cors(corsOptions));
  app.use(logger())
  app.use(prettyJSON({ space: 4 }));
  app.route("/", routes);

  PrismaInstance.getInstance()

  return app;
}
