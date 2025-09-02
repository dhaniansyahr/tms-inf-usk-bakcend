import * as AbsensiController from "$controllers/rest/AbsensiController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as AbsensiValidation from "$validations/AbsensiValidation";
import { Hono } from "hono";

const AbsensiRoutes = new Hono();

AbsensiRoutes.get(
    "/today",
    AuthMiddleware.checkJwt,
    AbsensiController.getTodaySchedule
);

AbsensiRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AbsensiValidation.validateAbsent,
    AbsensiController.absent
);

export default AbsensiRoutes;
