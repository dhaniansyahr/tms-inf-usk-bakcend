import { Hono } from "hono";
import * as MahasiswaController from "$controllers/rest/MahasiswaController";

const MahasiswaRoutes = new Hono();

MahasiswaRoutes.get("/", MahasiswaController.getAll);

MahasiswaRoutes.get("/:id", MahasiswaController.getById);

export default MahasiswaRoutes;
