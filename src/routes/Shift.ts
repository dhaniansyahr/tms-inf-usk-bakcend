import { Hono } from "hono";
import * as ShiftController from "$controllers/rest/ShiftController";
import * as ShiftValidation from "$validations/ShiftValidation";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const ShiftRoutes = new Hono();

ShiftRoutes.get("/", AuthMiddleware.checkJwt, ShiftController.getAll);

ShiftRoutes.get("/:id", AuthMiddleware.checkJwt, ShiftController.getById);

ShiftRoutes.post("/", AuthMiddleware.checkJwt, ShiftValidation.validateShift, ShiftController.create);

ShiftRoutes.put("/:id", AuthMiddleware.checkJwt, ShiftValidation.validateShift, ShiftController.update);

ShiftRoutes.delete("/", AuthMiddleware.checkJwt, ShiftController.deleteByIds);

export default ShiftRoutes;
