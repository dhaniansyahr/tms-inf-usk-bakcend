import { Hono } from "hono";
import * as JadwalController from "$controllers/rest/JadwalController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as JadwalValidation from "$validations/JdwalValidation";

const JadwalRoutes = new Hono();

JadwalRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "read"),
    JadwalController.getAll
);

JadwalRoutes.get(
    "/diagnose",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "read"),
    JadwalController.diagnoseScheduling
);

JadwalRoutes.get(
    "/mata-kuliah",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    JadwalController.getAllMatakuliah
);

JadwalRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "read"),
    JadwalController.getById
);

JadwalRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "create"),
    JadwalValidation.validateJadwal,
    JadwalController.create
);

JadwalRoutes.post(
    "/generate-all",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "generate"),
    JadwalController.generateAllAvailableSchedules
);

JadwalRoutes.put("/:id", AuthMiddleware.checkJwt, JadwalController.update);

JadwalRoutes.post(
    "/check",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "create"),
    JadwalController.checkFreeSchedule
);

export default JadwalRoutes;
