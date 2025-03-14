
import {Hono} from "hono"
import * as UserController from "$controllers/rest/UserController"

const UserRoutes = new Hono();


UserRoutes.get("/",
    UserController.getAll
)


UserRoutes.get("/:id",
    UserController.getById
)


UserRoutes.post("/",
    UserController.create
)

UserRoutes.put("/:id",
    UserController.update
)

UserRoutes.delete("/",
    UserController.deleteByIds
)

export default UserRoutes
