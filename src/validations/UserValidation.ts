import { UserDTO } from "$entities/User";
import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";
import { prisma } from "$utils/prisma.utils";
import { MahasiswaDTO } from "$entities/Mahasiswa";
import { DosenDTO } from "$entities/Dosen";

function validateEmailFormat(email: string): boolean {
    const expression: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return expression.test(email);
}

export async function validateUser(c: Context, next: Next) {
    const data: UserDTO = await c.req.json();

    const invalidFields = [];
    if (!data.fullName) invalidFields.push("fullName is required");
    if (!data.email) invalidFields.push("email is required");

    if (!validateEmailFormat(data.email)) invalidFields.push("email format is invalid");
    if (!data.userLevelId) invalidFields.push("userLevelId is required");

    const userExist = await prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });

    if (!userExist) {
        invalidFields.push("email already used");
    }

    if (invalidFields.length > 0) {
        return response_bad_request(c, "Bad Request", invalidFields);
    }

    await next();
}

export async function validateMahasiswa(c: Context, next: Next) {
    const data: MahasiswaDTO = await c.req.json();

    const invalidFields = [];

    const isNPM = /^\d{13}$/i.test(data.npm);

    if (!isNPM) {
        invalidFields.push("npm format is invalid, expected 13 digits");
    }

    if (!data.npm) invalidFields.push("npm is required");
    if (!data.nama) invalidFields.push("nama is required");
    if (!data.password) invalidFields.push("password is required");
    if (!data.semester) invalidFields.push("semester is required");
    if (!data.tahunMasuk) invalidFields.push("tahunMasuk is required");

    const mahasiswaExist = await prisma.mahasiswa.findUnique({
        where: {
            npm: data.npm,
        },
    });

    if (mahasiswaExist) {
        invalidFields.push("npm already used");
    }

    if (invalidFields.length > 0) {
        return response_bad_request(c, "Bad Request", invalidFields);
    }

    await next();
}

export async function validateDosen(c: Context, next: Next) {
    const data: DosenDTO = await c.req.json();

    const invalidFields = [];

    const isNIP = /^\d{16}$/i.test(data.nip);

    if (!isNIP) {
        invalidFields.push("nip format is invalid, expected 16 digits");
    }

    if (!data.nip) invalidFields.push("nip is required");
    if (!data.nama) invalidFields.push("nama is required");
    if (!data.password) invalidFields.push("password is required");
    if (!data.email) invalidFields.push("email is required");

    if (!validateEmailFormat(data.email)) invalidFields.push("email format is invalid");

    if (invalidFields.length > 0) {
        return response_bad_request(c, "Bad Request", invalidFields);
    }

    await next();
}
