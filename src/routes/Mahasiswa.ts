import { Hono } from "hono";
import * as MahasiswaController from "$controllers/rest/MahasiswaController";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const MahasiswaRoutes = new Hono();

MahasiswaRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    MahasiswaController.getAll
);

MahasiswaRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    MahasiswaController.getById
);

export default MahasiswaRoutes;
