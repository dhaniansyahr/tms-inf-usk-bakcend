import { UserLoginDTO, UserRegisterDTO, UserJWTDAO } from '$entities/User';
import * as AuthService from '$services/AuthService';
import { handleServiceErrorWithResponse } from '$utils/response.utils';
import { response_success, response_bad_request } from '$utils/response.utils';
import { Context, TypedResponse } from 'hono';



export async function login(c:Context):Promise<TypedResponse>{
    const data:UserLoginDTO = await c.req.json();
    const serviceResponse = await AuthService.logIn(data);

    if(!serviceResponse.status){
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully Logged In!");
}

export async function register(c:Context):Promise<TypedResponse>{
    const data:UserRegisterDTO = await c.req.json();
    const serviceResponse = await AuthService.register(data);

    if(!serviceResponse.status){
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully Logged In!");
}

export async function verifyToken(c:Context):Promise<TypedResponse>{
     const {token} = await c.req.json();
    const serviceResponse = AuthService.verifyToken(token);

    if(!serviceResponse.status){
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Token Verified!");
}

export async function changePassword(c:Context):Promise<TypedResponse>{
    const {newPassword, oldPassword} = await c.req.json();
    const invalidFields:any = [];
    if(!newPassword) invalidFields.push("newPassword is required")
    if(!oldPassword) invalidFields.push("oldPassword is required")

    const user:UserJWTDAO = c.get("jwtPayload")
    if(invalidFields.length > 0) return response_bad_request(c, "Invalid Fields", invalidFields)

    const serviceResponse = await AuthService.changePassword(user.id, oldPassword, newPassword);

    if(!serviceResponse.status){
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully changed password!");
}