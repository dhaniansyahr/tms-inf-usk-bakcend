import { Hono } from "hono";
import * as ShiftController from "$controllers/rest/ShiftController";
import * as ShiftValidation from "$validations/ShiftValidation";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const ShiftRoutes = new Hono();

ShiftRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "read"),
    ShiftController.getAll
);

ShiftRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "read"),
    ShiftController.getById
);

ShiftRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "create"),
    ShiftValidation.validateShift,
    ShiftController.create
);

ShiftRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "update"),
    ShiftValidation.validateShift,
    ShiftController.update
);

ShiftRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("SHIFT", "delete"),
    ShiftController.deleteByIds
);

export default ShiftRoutes;
