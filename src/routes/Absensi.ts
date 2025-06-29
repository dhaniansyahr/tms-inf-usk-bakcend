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

export default AbsensiRoutes;
