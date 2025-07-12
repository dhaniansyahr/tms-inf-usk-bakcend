export function generateRandomString(length: number): string {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }

    return code;
}

export function isGanjilSemester(): boolean {
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed, add 1 to get the correct month number
    return currentMonth >= 1 && currentMonth <= 6; // January to June are considered ganjil semester
}

export function getCurrentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    // If it's after July, academic year is current year/next year
    // Otherwise it's previous year/current year
    if (month >= 7) {
        return `${year}/${year + 1}`;
    } else {
        return `${year - 1}/${year}`;
    }
}

export function isValidNPM(npm: string): boolean {
    const npmRegex = /^\d{13}$/;
    return npmRegex.test(npm);
}

export function isValidNIP(nip: string): boolean {
    const nipRegex = /^\d{18}$/;
    return nipRegex.test(nip);
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function checkDigitNPMDepartment(npm: string): {
    isFMIPA: boolean;
    isInformatika: boolean;
} {
    const npmRegex = /^\d{13}$/;
    if (!npmRegex.test(npm)) return { isFMIPA: false, isInformatika: false };

    const digit3And4 = npm.substring(2, 4);
    const digit6And7 = npm.substring(5, 7);

    return {
        isFMIPA: digit3And4 === "08",
        isInformatika: digit6And7 === "07",
    };
}

export function checkUskEmail(email: string): boolean {
    if (!isValidEmail(email)) return false;

    const validDomains = ["@mhs.usk.ac.id", "@usk.ac.id"];
    return validDomains.some((domain) => email.toLowerCase().endsWith(domain));
}

export function getIdentityType(identity: string): string {
    if (isValidEmail(identity)) return "EMAIL";
    if (isValidNPM(identity)) return "NPM";
    if (isValidNIP(identity)) return "NIP";
    return "INVALID";
}
