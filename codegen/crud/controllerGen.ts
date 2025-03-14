import fs from "fs"

export function generateController(entityName: string) {
    const result = `import {Context, TypedResponse} from "hono"
import * as ${entityName}Service from "$services/${entityName}Service"
import { handleServiceErrorWithResponse, response_created, response_success } from "$utils/response.utils"
import { ${entityName}DTO } from "$entities/${entityName}"
import { FilteringQueryV2 } from "$entities/Query"
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery"

export async function create(c:Context): Promise<TypedResponse> {
    const data: ${entityName}DTO = await c.req.json();

    const serviceResponse = await ${entityName}Service.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_created(c, serviceResponse.data, "Successfully created new ${entityName}!");
}

export async function getAll(c:Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c)

    const serviceResponse = await ${entityName}Service.getAll(filters)

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully fetched all ${entityName}!")
}

export async function getById(c:Context): Promise<TypedResponse> {
    const id = c.req.param('id')

    const serviceResponse = await ${entityName}Service.getById(id)

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully fetched ${entityName} by id!")
}

export async function update(c:Context): Promise<TypedResponse> {
    const data: ${entityName}DTO = await c.req.json()
    const id = c.req.param('id')

    const serviceResponse = await ${entityName}Service.update(id, data)

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully updated ${entityName}!")
}

export async function deleteByIds(c:Context): Promise<TypedResponse> {
    const ids = c.req.query('ids') as string

    const serviceResponse = await ${entityName}Service.deleteByIds(ids)

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully deleted ${entityName}!")
}
    `

    const destination = `src/controllers/rest/${entityName}Controller.ts`
    const filePath = `${__dirname}/../../${destination}`
    // Use writeFile to write the content to the file
    fs.writeFile(filePath, result, (err) => {
        if (err) {
            console.error('An error occurred:', err);
            return;
        }
        console.log(`Controllers has been written successfully to : ${destination}.ts`);
    });

    return destination
}