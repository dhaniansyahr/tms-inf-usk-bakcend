import { Hono } from "hono";
import * as JadwalController from "$controllers/rest/JadwalController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as JadwalValidation from "$validations/JdwalValidation";

const JadwalRoutes = new Hono();

JadwalRoutes.get("/", AuthMiddleware.checkJwt, JadwalController.getAll);

JadwalRoutes.get("/diagnose", AuthMiddleware.checkJwt, JadwalController.diagnoseScheduling);

JadwalRoutes.get("/mata-kuliah", AuthMiddleware.checkJwt, JadwalController.getAllMatakuliah);

JadwalRoutes.get("/:id", AuthMiddleware.checkJwt, JadwalController.getById);

JadwalRoutes.post("/", AuthMiddleware.checkJwt, JadwalValidation.validateJadwal, JadwalController.create);

JadwalRoutes.post("/generate-all", AuthMiddleware.checkJwt, JadwalController.generateAllAvailableSchedules);

JadwalRoutes.put("/:id", AuthMiddleware.checkJwt, JadwalController.update);

JadwalRoutes.delete("/", AuthMiddleware.checkJwt, JadwalController.deleteByIds);

JadwalRoutes.post("/check", AuthMiddleware.checkJwt, JadwalController.checkFreeSchedule);

export default JadwalRoutes;
