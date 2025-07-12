import { Hono } from "hono";
import * as UserController from "$controllers/rest/UserController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as UserValidation from "$validations/UserValidation";

const UserRoutes = new Hono();

UserRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    UserController.getAll
);

UserRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "read"),
    UserController.getById
);

UserRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "create"),
    UserValidation.validateUser,
    UserController.create
);

UserRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "update"),
    UserValidation.validateUser,
    UserController.update
);

UserRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("MASTER_DATA", "delete"),
    UserController.deleteByIds
);

export default UserRoutes;
