import { UserLoginDTO, UserRegisterDTO } from "$entities/User";
import { Context, Next } from "hono";
import { response_bad_request } from "../utils/response.utils";
import { prisma } from "../utils/prisma.utils";

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

    const isEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(data.identity);
    const isNPM = /^\d{13}$/i.test(data.identity);
    const isNIP = /^\d{16}$/i.test(data.identity);

    if (!isEmail && !isNPM && !isNIP) {
        invalidFields.push("Invalid identity format. It must be an email or 13-digit NPM or 16-digit NIP.");
    }

    if (isEmail) {
        if (!validateEmailFormat(data.identity)) {
            invalidFields.push("Invalid email format.");
        }
    }

    if (isNPM) {
        if (data.identity.length !== 13) {
            invalidFields.push("Invalid NPM format. It must be 13 digits.");
        }
    }

    if (isNIP) {
        if (data.identity.length !== 16) {
            invalidFields.push("Invalid NIP format. It must be 16 digits.");
        }
    }

    if (invalidFields.length > 0) {
        return response_bad_request(c, "Bad Request", invalidFields);
    }

    await next();
}
