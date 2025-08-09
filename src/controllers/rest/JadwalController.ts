import { Context, TypedResponse } from "hono";
import * as JadwalService from "$services/JadwalService";
import {
    handleServiceErrorWithResponse,
    response_created,
    response_success,
    response_bad_request,
    response_internal_server_error,
} from "$utils/response.utils";
import {
    AbsentDTO,
    JadwalDTO,
    UpdateJadwalDTO,
    UpdateMeetingDTO,
} from "$entities/Jadwal";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { UserJWTDAO } from "$entities/User";
import Logger from "$pkg/logger";

export async function create(c: Context): Promise<TypedResponse> {
    const data: JadwalDTO = await c.req.json();

    const serviceResponse = await JadwalService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Successfully created new Jadwal!"
    );
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await JadwalService.getAll(filters, user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched all Jadwal!"
    );
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await JadwalService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched Jadwal by id!"
    );
}

export async function updateJadwal(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");
    const data: UpdateJadwalDTO = await c.req.json();

    const serviceResponse = await JadwalService.UpdateJadwal(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully updated Jadwal!"
    );
}

export async function getAllParticipantsAndMeetingsByJadwalId(
    c: Context
): Promise<TypedResponse> {
    const id = c.req.param("id") as string;

    const serviceResponse =
        await JadwalService.getAllParticipantsAndMeetingsByJadwalId(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched participants with meeting attendance!"
    );
}

export async function updateMeeting(c: Context): Promise<TypedResponse> {
    const data: UpdateMeetingDTO = await c.req.json();
    const id = c.req.param("meetingId");

    const serviceResponse = await JadwalService.updateMeeting(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully updated Jadwal!"
    );
}

export async function checkFreeSchedule(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
    const day = c.req.query("day");

    const serviceResponse = await JadwalService.getAvailableSchedule(
        filters,
        day
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched Jadwal by id!"
    );
}

export async function generateAllAvailableSchedules(
    c: Context
): Promise<TypedResponse> {
    const preferredDay = c.req.query("day") as string;

    const serviceResponse = await JadwalService.generateAllAvailableSchedules(
        preferredDay
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully generated schedules for all available matakuliah!"
    );
}

export async function getAbsentNow(c: Context): Promise<TypedResponse> {
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await JadwalService.getAbsentNow(user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched participants with meeting attendance!"
    );
}

export async function getAllScheduleToday(c: Context): Promise<TypedResponse> {
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await JadwalService.getAllScheduleToday(user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched all schedule today!"
    );
}

export async function absent(c: Context): Promise<TypedResponse> {
    const data: AbsentDTO = await c.req.json();

    const serviceResponse = await JadwalService.absent(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Successfully absent in this meeting!"
    );
}

export async function deleteAll(c: Context): Promise<TypedResponse> {
    const serviceResponse = await JadwalService.deleteAll();

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Successfully delete all jadwal!"
    );
}

export async function processExcelForTeoriJadwal(
    c: Context
): Promise<TypedResponse> {
    try {
        const bodyData = await c.req.parseBody();
        const file = bodyData.file as File;

        if (!file) {
            return response_bad_request(c, "Excel file is required");
        }

        // Check file type
        if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
            return response_bad_request(
                c,
                "File must be an Excel file (.xlsx or .xls)"
            );
        }

        // Check file size (5MB limit for Excel files)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
            return response_bad_request(c, "File size must be less than 5MB");
        }

        const serviceResponse = await JadwalService.processExcelForTeoriJadwal(
            file
        );

        if (!serviceResponse.status) {
            return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_created(
            c,
            serviceResponse.data,
            "Excel processing completed successfully!"
        );
    } catch (err) {
        Logger.error(`JadwalController.processExcelForTeoriJadwal : ${err}`);
        return response_internal_server_error(
            c,
            "Failed to process Excel file"
        );
    }
}
