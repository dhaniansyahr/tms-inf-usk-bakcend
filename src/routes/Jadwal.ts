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

JadwalRoutes.delete("/", AuthMiddleware.checkJwt, JadwalController.deleteAll);

// Absent Now
JadwalRoutes.get(
    "/absent/now",
    AuthMiddleware.checkJwt,
    JadwalController.getAbsentNow
);

JadwalRoutes.get(
    "/today",
    AuthMiddleware.checkJwt,
    JadwalController.getAllScheduleToday
);

JadwalRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "read"),
    JadwalController.getById
);

// Get All Participants and Meetings By Jadwal ID
JadwalRoutes.get(
    "/:id/meetings-and-participants",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "read"),
    JadwalController.getAllParticipantsAndMeetingsByJadwalId
);

// Create Jadwal
JadwalRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "create"),
    JadwalValidation.validateJadwal,
    JadwalController.create
);

JadwalRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "create"),
    JadwalController.updateJadwal
);

// Absent
JadwalRoutes.post(
    "/absent",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "absensi"),
    JadwalController.absent
);

// Generate Jadwal
JadwalRoutes.post(
    "/generate-all",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "generate"),
    JadwalController.generateAllAvailableSchedules
);

// Process Excel for Teori Jadwal
JadwalRoutes.post(
    "/bulk-upload",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "create"),
    JadwalController.processExcelForTeoriJadwal
);

// Update Meeting
JadwalRoutes.put(
    "/meeting/:meetingId",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "update"),
    JadwalValidation.validateUpdateMeeting,
    JadwalController.updateMeeting
);

JadwalRoutes.post(
    "/check",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "create"),
    JadwalController.checkFreeSchedule
);

export default JadwalRoutes;
