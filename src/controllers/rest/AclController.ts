import { Context, TypedResponse } from "hono";
import * as AclService from "$services/AclService";
import { handleServiceErrorWithResponse, response_created, response_success } from "$utils/response.utils";
import { AclDTO } from "$entities/Acl";

export async function create(c: Context): Promise<TypedResponse> {
        const data: AclDTO = await c.req.json();

        const serviceResponse = await AclService.create(data);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_created(c, serviceResponse.data, "Successfully created new Acl!");
}

export async function getByUserLevelId(c: Context): Promise<TypedResponse> {
        const userLevelId = c.req.param("userLevelId");

        const serviceResponse = await AclService.getAclByUserLevelId(userLevelId);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Acl by user level id!");
}

export async function update(c: Context): Promise<TypedResponse> {
        const data: AclDTO = await c.req.json();

        const serviceResponse = await AclService.update(data);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully updated ACL permissions!");
}

export async function addPermissions(c: Context): Promise<TypedResponse> {
        const userLevelId = c.req.param("userLevelId");
        const { permissions } = await c.req.json();

        const serviceResponse = await AclService.addPermissions(userLevelId, permissions);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully added permissions!");
}

export async function removePermissions(c: Context): Promise<TypedResponse> {
        const userLevelId = c.req.param("userLevelId");
        const { permissions } = await c.req.json();

        const serviceResponse = await AclService.removePermissions(userLevelId, permissions);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully removed permissions!");
}

export async function getAllFeatures(c: Context): Promise<TypedResponse> {
        const serviceResponse = await AclService.getAllFeatures();

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched all features!");
}
