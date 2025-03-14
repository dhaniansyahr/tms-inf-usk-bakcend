import readLineSync from "readline-sync"
import fs from "fs"

export function generateValidator() {
    // Create readline interface
    const rl = readLineSync

    let importBlocks = `import { Context, Next } from 'hono';
    import { response_bad_request } from '$utils/response.utils';
    import {generateErrorStructure} from './helper'
    `

    let existingFile = false
    let validationBlock = ""
    let result = ""

    // Prompt the user for input
    const interfaceName = rl.question('Enter Interface Name or Entity Name (example : UserDTO) :')
    const entityFileName = rl.question('Enter Entity File Name (example : User or Folder/EntityB if inside a nested folder) :')

    const existingFileAnswer = rl.question('Is this an initial validation? or the file already present? (Y/y for yes, other answer for no) :')
    if (existingFileAnswer.toLowerCase() === "y") existingFile = true

    let stillInput = true
    while (stillInput) {
        // Prompt the user for input
        const answer = rl.question('Enter field name (example : fullName) , leave empty and press enter when you are done :')
        if (answer === "" || answer === "\n") {
            stillInput = false
        }
        if (validationBlock !== "") {
            validationBlock += "\t"
        }
        validationBlock += `if(!data.${answer}) invalidFields.push(generateErrorStructure("${answer}", "${answer} cannot be empty"))\n`

    }

    const fileName = rl.question('Enter output file name (without extension) \n Note : if you entered y in existing validation, it will merge new validation into the file you entered here, if not, it will create a new file \n Your Answer:')

    const additionalImport = `\nimport {${interfaceName}} from '$entities/${entityFileName}'`
    importBlocks += additionalImport


    result += `
    export async function validate${interfaceName}(c:Context, next:Next){
        const data:${interfaceName} = await c.req.json()
        const invalidFields:ErrorStructure[] = []; 
        ${validationBlock}
        if(invalidFields.length !== 0) return response_bad_request(c, "Validation Error" , invalidFields)
        next()
    }
    `

    const filePath = `${__dirname}/../../src/validations/${fileName}.ts`

    if (existingFile) {
        // Read the existing content of the file
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('An error occurred while reading the file:', err);
                return;
            }


            console.log(data)
            // Prepend new content to the existing content
            const combinedContent = `${additionalImport}\n${data}\n${result}`

            // Write the combined content back to the file
            fs.writeFile(filePath, combinedContent, 'utf8', (err) => {
                if (err) {
                    console.error('An error occurred while writing to the file:', err);
                    return;
                }
                console.log('Content was prepended successfully.');
            });
        });
    } else {
        result = `${importBlocks}\n${result}`
        // Use writeFile to write the content to the file
        fs.writeFile(filePath, result, (err) => {
            if (err) {
                console.error('An error occurred:', err);
                return;
            }
            console.log(`/src/validations/${fileName}.ts has been updated!`);

            console.log(`File has been written successfully to : /src/validations/${fileName}.ts`);

        });
    }
}