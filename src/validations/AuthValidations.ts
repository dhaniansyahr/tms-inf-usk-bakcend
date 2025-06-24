import { UserLoginDTO, UserRegisterDTO } from "$entities/User";
import { Context, Next } from "hono";
import { response_bad_request } from "../utils/response.utils";
import { prisma } from "../utils/prisma.utils";
import { checkDigitNPMDepartment, checkUskEmail, getIdentityType, isValidEmail, isValidNIP, isValidNPM } from "$utils/strings.utils";

function validateEmailFormat(email: string): boolean {
        const expression: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        return expression.test(email);
}

export async function validateRegisterDTO(c: Context, next: Next) {
        const data: UserRegisterDTO = await c.req.json();

        const invalidFields = [];
        if (!data.email) invalidFields.push("email is required");
        if (!data.fullName) invalidFields.push("fullname is required");
        if (!validateEmailFormat(data.email)) invalidFields.push("email format is invalid");
        if (!data.password) invalidFields.push("password is required");

        const userExist = await prisma.user.findUnique({
                where: {
                        email: data.email,
                },
        });

        if (userExist != null) {
                invalidFields.push("email already used");
        }
        if (invalidFields.length > 0) {
                return response_bad_request(c, "Bad Request", invalidFields);
        }

        await next();
}

export async function validateLoginDTO(c: Context, next: Next) {
        const data: UserLoginDTO = await c.req.json();

        const invalidFields = [];
        if (!data.identity) invalidFields.push("Email Or NPM Or NIP is required");
        if (!data.password) invalidFields.push("password is required");

        const identityType = getIdentityType(data.identity);

        if (identityType === "INVALID") {
                invalidFields.push("Pastikan identitas yang anda masukkan benar. Identitas harus berupa email atau 13 digit NPM atau 16 digit NIP.");
        }

        if (identityType === "EMAIL") {
                if (!isValidEmail(data.identity)) {
                        invalidFields.push("Pastikan email anda benar.");
                }

                if (!checkUskEmail(data.identity)) {
                        invalidFields.push("Mohon gunakan email USK untuk login.");
                }
        }

        if (identityType === "NPM") {
                if (!isValidNPM(data.identity)) {
                        invalidFields.push("Pastikan NPM anda benar. NPM harus 13 digit.");
                }

                if (!checkDigitNPMDepartment(data.identity).isFMIPA) {
                        invalidFields.push("Mohon maaf hanya mahasiswa FMIPA yang dapat login.");
                }

                if (!checkDigitNPMDepartment(data.identity).isInformatika) {
                        invalidFields.push("Mohon maaf hanya mahasiswa Informatika yang dapat login.");
                }
        }

        if (identityType === "NIP") {
                if (!isValidNIP(data.identity)) {
                        invalidFields.push("Pastikan NIP anda benar. NIP harus 16 digit.");
                }
        }

        if (identityType === "INVALID") {
                invalidFields.push("Pastikan identitas yang anda masukkan benar. Identitas harus berupa email atau 13 digit NPM atau 16 digit NIP.");
        }

        if (invalidFields.length > 0) {
                return response_bad_request(c, "Bad Request", invalidFields);
        }

        await next();
}
