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

export async function logIn(data: UserLoginDTO): Promise<ServiceResponse<any>> {
    try {
        const { identity, password } = data;

        const user: any = await prisma.user.findFirst({
            where: {
                OR: [{ email: identity }, { mahasiswa: { npm: identity } }, { dosen: { nip: identity } }],
            },
            include: {
                userLevel: true,
                mahasiswa: true,
                dosen: true,
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
                    message: "Invalid credential!",
                    code: 404,
                },
                data: {},
            };
        }
    } catch (err) {
        Logger.error(`AuthService.login : ${err}`);
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
