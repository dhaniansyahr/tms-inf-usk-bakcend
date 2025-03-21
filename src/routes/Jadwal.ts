import { Hono } from "hono";
import * as JadwalController from "$controllers/rest/JadwalController";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const JadwalRoutes = new Hono();

JadwalRoutes.get("/", AuthMiddleware.checkJwt, JadwalController.getAll);

JadwalRoutes.get("/:id", AuthMiddleware.checkJwt, JadwalController.getById);

JadwalRoutes.post("/", AuthMiddleware.checkJwt, JadwalController.create);

JadwalRoutes.put("/:id", AuthMiddleware.checkJwt, JadwalController.update);

JadwalRoutes.delete("/", AuthMiddleware.checkJwt, JadwalController.deleteByIds);

JadwalRoutes.post("/generate", AuthMiddleware.checkJwt, JadwalController.generateSchedule);

export default JadwalRoutes;
