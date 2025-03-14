export interface ErrorStructure {
    field:string 
    message:string 
}

export function generateErrorStructure(field:string, message:string):ErrorStructure{
    return {
        field,
        message
    }
}