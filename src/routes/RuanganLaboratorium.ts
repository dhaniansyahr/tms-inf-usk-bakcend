import { Hono } from "hono";
import * as RuanganLaboratoriumController from "$controllers/rest/RuanganLaboratoriumController";
import * as RuanganLaboratoriumValidation from "$validations/RuanganLaboratoriumValidation";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const RuanganLaboratoriumRoutes = new Hono();

RuanganLaboratoriumRoutes.get("/", AuthMiddleware.checkJwt, RuanganLaboratoriumController.getAll);

RuanganLaboratoriumRoutes.get("/:id", AuthMiddleware.checkJwt, RuanganLaboratoriumController.getById);

RuanganLaboratoriumRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    RuanganLaboratoriumValidation.validateRuanganLaboratoriumDTO,
    RuanganLaboratoriumController.create
);

RuanganLaboratoriumRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    RuanganLaboratoriumValidation.validateRuanganLaboratoriumDTO,
    RuanganLaboratoriumController.update
);

RuanganLaboratoriumRoutes.put(
    "/assign-kepala-lab/:id",
    AuthMiddleware.checkJwt,
    RuanganLaboratoriumValidation.validateAssignKepalaLabDTO,
    RuanganLaboratoriumController.assignKepalaLab
);

RuanganLaboratoriumRoutes.delete("/", AuthMiddleware.checkJwt, RuanganLaboratoriumController.deleteByIds);

export default RuanganLaboratoriumRoutes;
