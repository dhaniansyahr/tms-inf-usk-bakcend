import { Hono } from "hono";
import * as ShiftController from "$controllers/rest/ShiftController";
import * as ShiftValidation from "$validations/ShiftValidation";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const ShiftRoutes = new Hono();

ShiftRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    ShiftController.getAll
);

ShiftRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    ShiftController.getById
);

ShiftRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "create"),
    ShiftValidation.validateShift,
    ShiftController.create
);

ShiftRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "update"),
    ShiftValidation.validateShift,
    ShiftController.update
);

ShiftRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "delete"),
    ShiftController.deleteByIds
);

export default ShiftRoutes;
