import { Hono } from "hono";
import * as RuanganLaboratoriumController from "$controllers/rest/RuanganLaboratoriumController";
import * as RuanganLaboratoriumValidation from "$validations/RuanganLaboratoriumValidation";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const RuanganLaboratoriumRoutes = new Hono();

RuanganLaboratoriumRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    RuanganLaboratoriumController.getAll
);

RuanganLaboratoriumRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    RuanganLaboratoriumController.getById
);

RuanganLaboratoriumRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "create"),
    RuanganLaboratoriumValidation.validateRuanganLaboratoriumDTO,
    RuanganLaboratoriumController.create
);

RuanganLaboratoriumRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "update"),
    RuanganLaboratoriumValidation.validateRuanganLaboratoriumDTO,
    RuanganLaboratoriumController.update
);

RuanganLaboratoriumRoutes.put(
    "/assign-kepala-lab/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("HISTORY_KEPALA_LAB", "update"),
    RuanganLaboratoriumValidation.validateAssignKepalaLabDTO,
    RuanganLaboratoriumController.assignKepalaLab
);

RuanganLaboratoriumRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "delete"),
    RuanganLaboratoriumController.deleteByIds
);

export default RuanganLaboratoriumRoutes;
