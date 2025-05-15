import { Hono } from "hono";
import * as PendaftaranAsistenLabController from "$controllers/rest/PendaftaranAsistenLabController";
import * as AuthMiddleware from "$middlewares/authMiddleware";
import * as PendaftaranAsistenLabValidation from "$validations/PendaftaranAsistenLabValidation";

const PendaftaranAsistenLabRoutes = new Hono();

PendaftaranAsistenLabRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "read"),
    PendaftaranAsistenLabController.getAll
);

PendaftaranAsistenLabRoutes.get(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "read"),
    PendaftaranAsistenLabController.getById
);

PendaftaranAsistenLabRoutes.post(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "create"),
    PendaftaranAsistenLabValidation.validatePendaftaranAsistenLab,
    PendaftaranAsistenLabController.create
);

PendaftaranAsistenLabRoutes.put(
    "/:id",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "update"),
    PendaftaranAsistenLabValidation.validatePendaftaranAsistenLab,
    PendaftaranAsistenLabController.update
);

PendaftaranAsistenLabRoutes.delete(
    "/",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "delete"),
    PendaftaranAsistenLabController.deleteByIds
);

PendaftaranAsistenLabRoutes.put(
    "/:id/penerimaan",
    AuthMiddleware.checkJwt,
    AuthMiddleware.checkAccess("PENDAFTARAN_ASISTEN_LAB", "update"),
    PendaftaranAsistenLabValidation.validatePenerimaanAsistenLab,
    PendaftaranAsistenLabController.penerimaanAsistenLab
);

export default PendaftaranAsistenLabRoutes;
