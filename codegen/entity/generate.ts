import readLineSync from 'readline-sync';
import fs from "fs"

// Function to convert Prisma types to TypeScript types
const convertType = (prismaType:any) => {
    const typeMappings:any = {
        String: 'string',
        Int: 'number',
        Float: 'number',
        Boolean: 'boolean',
        // Add more mappings as needed
    };

    return typeMappings[prismaType] || null; // Return null for unsupported types
};

// Function to generate TypeScript interface
const generateInterface = (modelName:string, modelContent:string) => {
    const lines = modelContent.split('\n');
    let interfaceContent = `export interface ${modelName}DTO {\n`;

    for (const line of lines) {
        const match = line.trim().match(/^(\w+)\s+(String|Int|Float|Boolean)/);
        if (match) {
            const [, fieldName, fieldType] = match;
            const tsType = convertType(fieldType);
            if (tsType) { // Only add if the type is supported
                interfaceContent += `    ${fieldName}: ${tsType};\n`;
            }
        }
    }

    interfaceContent += '}\n';

    return interfaceContent;
};


export function generateEntity(){
    // Read the schema file and generate the interface
    const rl = readLineSync

    const modelName = rl.question('Enter Model Name (example: User): ')
    const existingFileAnswer = rl.question('Is the file for this already exist? (y/Y for yes, other key for no) :')
    let existingFile = false
    let altFileName = ""
    if(existingFileAnswer.toLowerCase() === "y"){
        existingFile = true
        altFileName = rl.question("What is the file name? (without extension and should be inside src/entities) :")
    }


    fs.readFile(`${__dirname}/../../prisma/schema.prisma`, 'utf8', (err, data) => {
        if (err) {
            console.error('An error occurred while reading the schema file:', err);
            return;
        }

        const modelRegex = new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\}`, 'gm');
        const match = modelRegex.exec(data);

        if (match) {
            const modelContent = match[1];
            const interfaceContent = generateInterface(modelName, modelContent);
            console.log(interfaceContent);
            let result = ""
            if(existingFile){
                const filePath = `${__dirname}/../../src/entities/${altFileName}.ts`
                // Read the existing content of the file
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        console.error('An error occurred while reading the file:', err);
                        return;
                    }
                    // Prepend new content to the existing content
                   result = `${data}\n${interfaceContent}`

                    // Write the combined content back to the file
                    fs.writeFile(filePath, result, 'utf8', (err) => {
                        if (err) {
                            console.error('An error occurred while writing to the file:', err);
                            return;
                        }
                    console.log(`Interface ${modelName}DTO written to  src/entities/${altFileName}.ts`);
                    });
                });
            }else{
                const filePath = `${__dirname}/../../src/entities/${modelName}.ts`
                result = interfaceContent
                // Use writeFile to write the content to the file
                fs.writeFile(filePath, result, (err) => {
                    if (err) {
                        console.error('An error occurred:', err);
                        return;
                    }
                    
                    console.log(`Interface ${modelName}DTO written to  src/entities/${modelName}.ts`);
                });
            }

        } else {
            console.log(`Model ${modelName} not found.`);
        }
    });
}