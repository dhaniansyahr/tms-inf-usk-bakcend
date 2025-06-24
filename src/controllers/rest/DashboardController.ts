import { Context, TypedResponse } from "hono";
import { handleServiceErrorWithResponse, response_success } from "$utils/response.utils";
import * as DashboardService from "$services/DashboardService";

export async function getDashboardData(c: Context): Promise<TypedResponse> {
        const serviceResponse = await DashboardService.getDashboardData();

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Dashboard Data!");
}
