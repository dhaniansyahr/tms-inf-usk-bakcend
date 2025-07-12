import { Hono } from "hono";
import * as DashboardController from "$controllers/rest/DashboardController";
import * as AuthMiddleware from "$middlewares/authMiddleware";

const DashboardRoutes = new Hono();

DashboardRoutes.get(
    "/",
    AuthMiddleware.checkJwt,
    DashboardController.getDashboardData
);

export default DashboardRoutes;
