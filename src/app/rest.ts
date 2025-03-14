
import server from "$server/instance";
import { serve } from "@hono/node-server";
import * as Graceful from "$pkg/graceful"

export function startRestApp() {
  const app = server.restServer()
  const restServer = serve({
    fetch: app.fetch,
    port: Number(process.env.NODE_LOCAL_PORT) || 3150,
  })

  Graceful.registerProcessForShutdown("rest-server", () => {
    restServer.close()
  })
}

