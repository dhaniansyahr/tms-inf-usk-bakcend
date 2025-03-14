const baseAsciiArt = `
      * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

        /$$$$$$                  /$$                    /$$$$$$                     
      /$$__  $$                | $$                   /$$__  $$                    
      | $$  \\__/  /$$$$$$   /$$$$$$$  /$$$$$$         | $$  \\__/  /$$$$$$  /$$$$$$$ 
      | $$       /$$__  $$ /$$__  $$ /$$__  $$ /$$$$$$| $$ /$$$$ /$$__  $$| $$__  $$
      | $$      | $$  \\ $$| $$  | $$| $$$$$$$$|______/| $$|_  $$| $$$$$$$$| $$  \\ $$
      | $$    $$| $$  | $$| $$  | $$| $$_____/        | $$  \\ $$| $$_____/| $$  | $$
      |  $$$$$$/|  $$$$$$/|  $$$$$$$|  $$$$$$$        |  $$$$$$/|  $$$$$$$| $$  | $$
      \\______/  \\______/  \\_______/ \\_______/         \\______/  \\_______/|__/  |__/
 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
`

export const validatorAsciiArt =`${baseAsciiArt}\n
*  Validations Generator v 1.0.0  *
*  by Nodewave Engineering        *

`


export const crudAsciiArt =`${baseAsciiArt}\n
*  CRUD Generator v 1.0.0   *
*  by Nodewave Engineering  *

`

export const entityAsciiArt =`${baseAsciiArt}\n
*  Prisma Model to Entity Generator beta   *
*  by Nodewave Engineering                    *

`

export function displayAsciiArt(ascii_art: string) {
    console.log('\x1b[32m%s\x1b[0m', ascii_art);
}