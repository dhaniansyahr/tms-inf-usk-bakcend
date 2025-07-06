import { Hono } from "hono";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as MeetingController from "$controllers/rest/MeetingController";

const MeetingRoutes = new Hono();

MeetingRoutes.get("/:id", AuthMiddleware.checkJwt, MeetingController.getById);

MeetingRoutes.put("/:id", AuthMiddleware.checkJwt, MeetingController.update);

MeetingRoutes.get(
    "/jadwal/:jadwalId",
    AuthMiddleware.checkJwt,
    MeetingController.getAll
);

MeetingRoutes.get(
    "/jadwal/:jadwalId/participants",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("JADWAL", "create"),
    MeetingController.getParticipants
);

export default MeetingRoutes;
