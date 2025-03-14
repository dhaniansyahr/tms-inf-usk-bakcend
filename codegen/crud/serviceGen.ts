import fs from "fs"

export function generateService(entityName:string, schemaName: string){
    const result = `import { FilteringQueryV2, PagedList } from '$entities/Query';
import { INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse } from '$entities/Service';
import Logger from '$pkg/logger';
import { prisma } from '$utils/prisma.utils';
import { ${entityName} } from '@prisma/client';
import { ${entityName}DTO } from '$entities/${entityName}';
import { buildFilterQueryLimitOffsetV2 } from './helpers/FilterQueryV2';

export type CreateResponse = ${entityName} | {}
export async function create(data: ${entityName}DTO): Promise<ServiceResponse<CreateResponse>> {
    try {
        const ${schemaName} = await prisma.${schemaName}.create({
            data
        })

        return {
            status: true,
            data: ${schemaName}
        }
    } catch (err) {
        Logger.error(\`${entityName}Service.create : \${err}\`)
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE
    }
}

export type GetAllResponse = PagedList<${entityName}[]> | {}
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters)

        const [${schemaName}, totalData] = await Promise.all([
            prisma.${schemaName}.findMany(usedFilters),
            prisma.${schemaName}.count({
                where: usedFilters.where
            })
        ])

        let totalPage = 1
        if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take)

        return {
            status: true,
            data: {
                entries: ${schemaName},
                totalData,
                totalPage
            }
        }
    } catch (err) {
        Logger.error(\`${entityName}Service.getAll : \${err} \`)
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE
    }
}



export type GetByIdResponse = ${entityName} | {}
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let ${schemaName} = await prisma.${schemaName}.findUnique({
            where: {
                id
            }
        });

        if (!${schemaName}) return INVALID_ID_SERVICE_RESPONSE

        return {
            status: true,
            data: ${schemaName}
        }
    } catch (err) {
        Logger.error(\`${entityName}Service.getById : \${err}\`)
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE
    }
}

export type UpdateResponse = ${entityName} | {}
export async function update(id: string, data: ${entityName}DTO): Promise<ServiceResponse<UpdateResponse>> {
    try {
        let ${schemaName} = await prisma.${schemaName}.findUnique({
            where: {
                id
            }
        });

        if (!${schemaName}) return INVALID_ID_SERVICE_RESPONSE

        ${schemaName} = await prisma.${schemaName}.update({
            where: {
                id
            },
            data
        })

        return {
            status: true,
            data: ${schemaName}
        }
    } catch (err) {
        Logger.error(\`${entityName}Service.update : \${err}\`)
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE
    }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
    try {
        const idArray: string[] = JSON.parse(ids)

        idArray.forEach(async (id) => {
            await prisma.${schemaName}.delete({
                where: {
                    id
                }
            })
        })

        return {
            status: true,
            data: {}
        }
    } catch (err) {
        Logger.error(\`${entityName}Service.deleteByIds : \${err}\`)
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE
    }
}

    `

    const destination = `src/services/${entityName}Service.ts`
    const filePath = `${__dirname}/../../${destination}`
    // Use writeFile to write the content to the file
    fs.writeFile(filePath, result, (err) => {
        if (err) {
            console.error('An error occurred:', err);
            return;
        } 
        console.log(`Service has been written successfully to : ${destination}.ts`);
        
    });


    return destination
}