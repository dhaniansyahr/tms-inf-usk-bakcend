import { Roles } from '@prisma/client';

export function transformRoleToEnumRole(role:string){
    switch(role){
        case "ADMIN":
            return Roles.ADMIN
        default:
            return Roles.USER
    }
}