import { Hono } from "hono";
import * as RuanganLaboratoriumController from "$controllers/rest/RuanganLaboratoriumController";
import * as RuanganLaboratoriumValidation from "$validations/RuanganLaboratoriumValidation";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const RuanganLaboratoriumRoutes = new Hono();

RuanganLaboratoriumRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "read"),
    RuanganLaboratoriumController.getAll
);

RuanganLaboratoriumRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "read"),
    RuanganLaboratoriumController.getById
);

RuanganLaboratoriumRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "create"),
    RuanganLaboratoriumValidation.validateRuanganLaboratoriumDTO,
    RuanganLaboratoriumController.create
);

RuanganLaboratoriumRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "update"),
    RuanganLaboratoriumValidation.validateRuanganLaboratoriumDTO,
    RuanganLaboratoriumController.update
);

RuanganLaboratoriumRoutes.put(
    "/assign-kepala-lab/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "change_kepala_lab"),
    RuanganLaboratoriumValidation.validateAssignKepalaLabDTO,
    RuanganLaboratoriumController.assignKepalaLab
);

RuanganLaboratoriumRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("RUANGAN", "delete"),
    RuanganLaboratoriumController.deleteByIds
);

export default RuanganLaboratoriumRoutes;
