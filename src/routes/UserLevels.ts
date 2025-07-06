import { Hono } from "hono";
import * as UserLevelsController from "$controllers/rest/UserLevelsController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as UserLevelsValidation from "$validations/UserLevelsValidation";

const UserLevelsRoutes = new Hono();

UserLevelsRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "read"),
    UserLevelsController.getAll
);

UserLevelsRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "read"),
    UserLevelsController.getById
);

UserLevelsRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "create"),
    UserLevelsValidation.validateUserLevels,
    UserLevelsController.create
);

UserLevelsRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "update"),
    UserLevelsValidation.validateUserLevels,
    UserLevelsController.update
);

UserLevelsRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("ROLE_MANAGEMENT", "delete"),
    UserLevelsController.deleteByIds
);

export default UserLevelsRoutes;
