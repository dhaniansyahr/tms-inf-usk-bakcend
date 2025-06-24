import { Hono } from "hono";
import * as AbsensiController from "$controllers/rest/AbsensiController";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const AbsensiRoutes = new Hono();

// Basic CRUD operations
AbsensiRoutes.get("/", AuthMiddleware.checkJwt, AbsensiController.getAll);

AbsensiRoutes.get("/:id", AuthMiddleware.checkJwt, AbsensiController.getById);

AbsensiRoutes.post("/", AuthMiddleware.checkJwt, AbsensiController.create);

AbsensiRoutes.put("/:id", AuthMiddleware.checkJwt, AbsensiController.update);

AbsensiRoutes.delete("/", AuthMiddleware.checkJwt, AbsensiController.deleteByIds);

// Meeting-specific endpoints
AbsensiRoutes.get("/meeting/:meetingId", AuthMiddleware.checkJwt, AbsensiController.getByMeetingId);

AbsensiRoutes.post("/meeting/bulk", AuthMiddleware.checkJwt, AbsensiController.createBulkAbsensiForMeeting);

// Jadwal-specific endpoints
AbsensiRoutes.get("/jadwal/:jadwalId", AuthMiddleware.checkJwt, AbsensiController.getByJadwalId);

// Summary and reports
AbsensiRoutes.get("/summary/:jadwalId", AuthMiddleware.checkJwt, AbsensiController.getAbsensiSummary);

export default AbsensiRoutes;
