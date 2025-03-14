import { UserLoginDTO, UserRegisterDTO } from '$entities/User';
import { Context, Next } from "hono" 
import { response_bad_request } from '../utils/response.utils';
import { prisma } from '../utils/prisma.utils';

function validateEmailFormat (email:string):boolean{
    const expression: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return expression.test(email)
}

export async function validateRegisterDTO(c:Context, next:Next){

    const data:UserRegisterDTO = await c.req.json()

    const invalidFields = [];
    if(!data.email) invalidFields.push("email is required")
    if(!data.fullName) invalidFields.push("fullname is required")
    if(!validateEmailFormat(data.email)) invalidFields.push("email format is invalid")
    if(!data.password) invalidFields.push("password is required")
        
    const userExist = await prisma.user.findUnique({
        where:{
            email:data.email
        }
    })

    if(userExist != null){
        invalidFields.push("email already used")
    }
    if(invalidFields.length > 0){
        return response_bad_request(c, "Bad Request", invalidFields);
    }

    await next();
}

export async function validateLoginDTO(c:Context, next:Next){

    const data:UserLoginDTO = await c.req.json()

    const invalidFields = [];
    if(!data.email) invalidFields.push("email is required")
    if(!validateEmailFormat(data.email)) invalidFields.push("email format is invalid")
    if(!data.password) invalidFields.push("password is required")

    if(invalidFields.length > 0){
        return response_bad_request(c, "Bad Request", invalidFields);
    }



    await next();
}