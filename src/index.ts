import "dotenv/config";
import "./paths";
import * as Graceful from "$pkg/graceful"

import { displayAsciiArt } from "$utils/ascii_art.utils";
import { REST_ASCII_ART } from './utils/ascii_art.utils';
import Logger from "$pkg/logger";
// import server from "$server/instance";
import app from "$app/instance";


function parseArguments(args: string[]): Record<string, string> {
  const parsedArgs: Record<string, string> = {};

  for (let i = 2; i < args.length; i += 2) {
    const argClean = args[i].replace(/^--/, ''); // Remove leading --
    const argName = argClean.split("=")[0] || '';
    const argValue = argClean.split("=")[1] || '';
    parsedArgs[argName] = argValue;
  }

  return parsedArgs;
}

const parsedArgs = parseArguments(process.argv);

if (parsedArgs["service"] == "rest") {
  displayAsciiArt(REST_ASCII_ART)
  Logger.info(`Started Rest Server on Port ${process.env.NODE_LOCAL_PORT}`)
  app.restApp()
}



async function gracefulShutdown() {
  Logger.info("Stopping server...")
  await Graceful.shutdownProcesses()
  process.exit(0)
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
