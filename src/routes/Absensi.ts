import { Hono } from "hono";
import * as AbsensiController from "$controllers/rest/AbsensiController";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const AbsensiRoutes = new Hono();

AbsensiRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ABSENSI", "create"),
    AbsensiController.create
);

export default AbsensiRoutes;
