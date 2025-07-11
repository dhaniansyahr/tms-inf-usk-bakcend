import { Hono } from "hono";
import * as UploadController from "$controllers/rest/UploadFileController";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const UploadRoutes = new Hono();

UploadRoutes.post("/", AuthMiddleware.checkJwt, UploadController.create);

UploadRoutes.get("/*", UploadController.getFile);

export default UploadRoutes;
