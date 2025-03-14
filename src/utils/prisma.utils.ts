import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";
import * as Graceful from "$pkg/graceful"

export class PrismaInstance {
  private static instance: PrismaInstance;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        {
          emit: "stdout",
          level: "query",
        },
        {
          emit: "stdout",
          level: "error",
        },
        {
          emit: "stdout",
          level: "info",
        },
        {
          emit: "stdout",
          level: "warn",
        },
      ],
    });

    Graceful.registerProcessForShutdown("prisma-sql-connection", () => {
      this.prisma.$disconnect()
    })
  }

  public static getInstance(): PrismaInstance {
    if (!PrismaInstance.instance) {
      PrismaInstance.instance = new PrismaInstance();
    }
    return PrismaInstance.instance;
  }

  public getPrismaClient(): PrismaClient {
    return this.prisma;
  }

}


export const prisma: PrismaClient = PrismaInstance.getInstance().getPrismaClient();

prisma.$use(async (params, next: any) => {
  // Check if the operation is 'create' or 'upsert'
  if (params.action === 'create' || params.action === 'upsert') {
    if (!params.args.data.id) {
      // Only generate ULID if id is not provided
      params.args.data.id = ulid(); // Generate a ULID for the 'id' field
    }
  }
  // Continue with the operation
  return next(params);
});