import { generateCRUD } from "./crud";
import { generateEntity } from "./entity/generate";
import { crudAsciiArt, displayAsciiArt, entityAsciiArt, validatorAsciiArt } from "./helper";
import { generateValidator } from "./validation/generate";

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

if (parsedArgs["generate"] == "validation") {
  displayAsciiArt(validatorAsciiArt)
  generateValidator()
}

if(parsedArgs["generate"] === "crud"){
  displayAsciiArt(crudAsciiArt)
  generateCRUD()
}


if(parsedArgs["generate"] === "entity"){
  displayAsciiArt(entityAsciiArt)
  generateEntity()
}