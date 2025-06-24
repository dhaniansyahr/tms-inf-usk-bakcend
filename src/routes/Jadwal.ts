import { Hono } from "hono";
import * as JadwalController from "$controllers/rest/JadwalController";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const JadwalRoutes = new Hono();

JadwalRoutes.get("/", AuthMiddleware.checkJwt, JadwalController.getAll);

JadwalRoutes.get("/summary", AuthMiddleware.checkJwt, JadwalController.getSummary);

JadwalRoutes.get("/diagnose", AuthMiddleware.checkJwt, JadwalController.diagnoseScheduling);

JadwalRoutes.get("/:id", AuthMiddleware.checkJwt, JadwalController.getById);

JadwalRoutes.post("/", AuthMiddleware.checkJwt, JadwalController.create);

JadwalRoutes.post("/generate", AuthMiddleware.checkJwt, JadwalController.generateSchedule);

JadwalRoutes.post("/generate-all", AuthMiddleware.checkJwt, JadwalController.generateAllAvailableSchedules);

JadwalRoutes.put("/:id", AuthMiddleware.checkJwt, JadwalController.update);

JadwalRoutes.delete("/", AuthMiddleware.checkJwt, JadwalController.deleteByIds);

JadwalRoutes.post("/check", AuthMiddleware.checkJwt, JadwalController.checkFreeSchedule);

export default JadwalRoutes;
