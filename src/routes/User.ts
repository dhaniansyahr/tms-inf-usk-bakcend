import { Hono } from "hono";
import * as UserController from "$controllers/rest/UserController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as UserValidation from "$validations/UserValidation";

const UserRoutes = new Hono();

UserRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("USER_MANAGEMENT", "read"),
    UserController.getAll
);

UserRoutes.get("/mahasiswa", AuthMiddleware.checkJwt, UserController.getAllMahasiswa);

UserRoutes.get("/dosen", AuthMiddleware.checkJwt, UserController.getAllDosen);

UserRoutes.get("/mahasiswa/:id", AuthMiddleware.checkJwt, UserController.getByIdMahasiswa);

UserRoutes.get("/dosen/:id", AuthMiddleware.checkJwt, UserController.getByIdDosen);

UserRoutes.get("/:id", AuthMiddleware.checkJwt, UserController.getById);

UserRoutes.post("/", AuthMiddleware.checkJwt, UserValidation.validateUser, UserController.create);

UserRoutes.put("/:id", AuthMiddleware.checkJwt, UserValidation.validateUser, UserController.update);

UserRoutes.delete("/", AuthMiddleware.checkJwt, UserController.deleteByIds);

export default UserRoutes;
