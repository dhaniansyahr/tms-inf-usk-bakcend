import { Hono } from "hono";
import * as UserLevelsController from "$controllers/rest/UserLevelsController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as UserLevelsValidation from "$validations/UserLevelsValidation";

const UserLevelsRoutes = new Hono();

UserLevelsRoutes.get("/", AuthMiddleware.checkJwt, UserLevelsController.getAll);

UserLevelsRoutes.get("/:id", AuthMiddleware.checkJwt, UserLevelsController.getById);

UserLevelsRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    UserLevelsValidation.validateUserLevels,
    UserLevelsController.create
);

UserLevelsRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    UserLevelsValidation.validateUserLevels,
    UserLevelsController.update
);

UserLevelsRoutes.delete("/", AuthMiddleware.checkJwt, UserLevelsController.deleteByIds);

export default UserLevelsRoutes;
