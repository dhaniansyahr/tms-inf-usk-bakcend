import { Hono } from "hono";
import * as AclController from "$controllers/rest/AclController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as AclValidation from "$validations/AclValidation";

const AclRoutes = new Hono();

AclRoutes.get("/features", AuthMiddleware.checkJwt, AclController.getAllFeatures);

AclRoutes.get("/:userLevelId", AuthMiddleware.checkJwt, AclController.getByUserLevelId);

AclRoutes.post("/", AuthMiddleware.checkJwt, AclValidation.validateAclCreate, AclController.create);

AclRoutes.put("/", AuthMiddleware.checkJwt, AclValidation.validateAclCreate, AclController.update);

AclRoutes.post("/:userLevelId/add-permissions", AuthMiddleware.checkJwt, AclController.addPermissions);

AclRoutes.delete("/:userLevelId/remove-permissions", AuthMiddleware.checkJwt, AclController.removePermissions);

export default AclRoutes;
