import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { exclude, UserRegisterDTO, UserLoginDTO, UserJWTDAO } from "$entities/User";
import { BadRequestWithMessage, INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import { prisma } from "$utils/prisma.utils";
import Logger from "$pkg/logger";
import bcrypt from "bcrypt";

function createToken(user: User, expiresIn: number = 3600) {
    const jwtPayload = exclude(user, "password") as unknown as UserJWTDAO;
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET ?? "", { expiresIn });
    return token;
}

function isNPMOrNIPOrEmail(identity: string): string {
    if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(identity)) {
        return "EMAIL";
    } else if (/^\d{13}$/i.test(identity)) {
        return "NPM";
    } else if (/^\d{16}$/i.test(identity)) {
        return "NIP";
    } else {
        return "INVALID";
    }
}

export async function logIn(data: UserLoginDTO): Promise<ServiceResponse<any>> {
    try {
        const { identity } = data;

        const checkIdentity = isNPMOrNIPOrEmail(identity);

        if (checkIdentity === "NPM") {
            return loginMahasiswa(data);
        } else if (checkIdentity === "NIP") {
            return loginDosen(data);
        } else if (checkIdentity === "EMAIL") {
            return loginWithEmail(data);
        } else {
            return {
                status: false,
                err: { message: "Invalid Identity, Expected NPM, NIP, or Email!", code: 404 },
                data: {},
            };
        }
    } catch (err) {
        Logger.error(`AuthService.login : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function loginMahasiswa(data: UserLoginDTO): Promise<ServiceResponse<any>> {
    try {
        const { identity, password } = data;

        const mahasiswa: any = await prisma.mahasiswa.findUnique({
            where: {
                npm: identity,
            },
        });

        const isPasswordVerified = await bcrypt.compareSync(password, mahasiswa?.password);

        if (mahasiswa && isPasswordVerified) {
            const token = createToken(mahasiswa, 60 * 60 * 24);
            const refreshToken = createToken(mahasiswa, 60 * 60 * 24 * 3);
            return { status: true, data: { user: exclude(mahasiswa, "password"), token, refreshToken } };
        } else {
            return {
                status: false,
                err: {
                    message: "Invalid Password!",
                    code: 404,
                },
                data: {},
            };
        }
    } catch (err) {
        Logger.error(`AuthService.loginMahasiswa : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function loginDosen(data: UserLoginDTO): Promise<ServiceResponse<any>> {
    try {
        const { identity, password } = data;

        const dosen: any = await prisma.dosen.findUnique({
            where: {
                nip: identity,
            },
        });

        const isPasswordVerified = await bcrypt.compareSync(password, dosen?.password);

        if (dosen && isPasswordVerified) {
            const token = createToken(dosen, 60 * 60 * 24);
            const refreshToken = createToken(dosen, 60 * 60 * 24 * 3);
            return { status: true, data: { user: exclude(dosen, "password"), token, refreshToken } };
        } else {
            return {
                status: false,
                err: {
                    message: "Invalid Password!",
                    code: 404,
                },
                data: {},
            };
        }
    } catch (err) {
        Logger.error(`AuthService.loginMahasiswa : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function loginWithEmail(data: UserLoginDTO): Promise<ServiceResponse<any>> {
    try {
        const { identity, password } = data;

        const user: any = await prisma.user.findFirst({
            where: {
                email: identity,
            },
        });

        const isPasswordVerified = await bcrypt.compareSync(password, user?.password);

        if (user && isPasswordVerified) {
            const token = createToken(user, 60 * 60 * 24);
            const refreshToken = createToken(user, 60 * 60 * 24 * 3);
            return { status: true, data: { user: exclude(user, "password"), token, refreshToken } };
        } else {
            return {
                status: false,
                err: {
                    message: "Invalid Password!",
                    code: 404,
                },
                data: {},
            };
        }
    } catch (err) {
        Logger.error(`AuthService.loginWithEmail : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function register(data: UserRegisterDTO): Promise<ServiceResponse<any>> {
    try {
        data.password = await bcrypt.hash(data.password, 12);

        const newUser = await prisma.user.create({
            data,
        });

        const token = createToken(newUser);
        const refreshToken = createToken(newUser, 60 * 60 * 24 * 3);

        return {
            status: true,
            data: {
                user: exclude(newUser, "password"),
                token,
                refreshToken,
            },
        };
    } catch (err) {
        Logger.error(`AuthService.register : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export function verifyToken(token: string): ServiceResponse<any> {
    try {
        try {
            const JWT_SECRET = process.env.JWT_SECRET || "";
            jwt.verify(token, JWT_SECRET);
            return {
                status: true,
                data: {},
            };
        } catch (err) {
            return {
                status: false,
                err: {
                    code: 403,
                    message: "Invalid Token",
                },
                data: {},
            };
        }
    } catch (err) {
        Logger.error(`AuthService.verifyToken : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
): Promise<ServiceResponse<any>> {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            return BadRequestWithMessage("Invalid User ID!");
        }

        const match = await bcrypt.compare(oldPassword, user.password);

        if (!match) {
            return BadRequestWithMessage("Incorrect Old Password!");
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                password: hashedNewPassword,
            },
        });

        return {
            status: true,
            data: {},
        };
    } catch (err) {
        Logger.error(`AuthService.changePassword : ${err}`);
        return {
            status: false,
            err: { message: (err as Error).message, code: 500 },
            data: {},
        };
    }
}
