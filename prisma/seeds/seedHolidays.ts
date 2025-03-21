import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "/prisma/seeds/data/google_calendar_client.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH, "utf-8");
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client: any) {
    const content = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: "authorized_user",
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request authorization to call APIs.
 *
 */
async function authorize() {
    let client: any = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

/**
 * Fetch holidays from Google Calendar API and save them to the database
 */
async function fetchAndSaveHolidays(prisma: PrismaClient) {
    const auth = await authorize();
    const calendar = google.calendar({ version: "v3", auth });

    try {
        const response = await calendar.events.list({
            calendarId: "en.holiday@group.v.calendar.google.com", // Replace with your holiday calendar ID
            timeMin: new Date().toISOString(),
            maxResults: 100, // Adjust as needed
            singleEvents: true,
            orderBy: "startTime",
        });

        const holidays = response.data.items;

        console.log("Holidays : ", holidays);

        // if (holidays && holidays.length) {
        //     for (const holiday of holidays) {
        //         await prisma.holiday.create({
        //             data: {
        //                 title: holiday.summary,
        //                 startDate: holiday.start.date || holiday.start.dateTime,
        //                 endDate: holiday.end.date || holiday.end.dateTime,
        //             },
        //         });
        //     }
        //     console.log(`Successfully saved ${holidays.length} holidays to the database.`);
        // } else {
        //     console.log("No holidays found.");
        // }
    } catch (error) {
        console.error("Error fetching holidays:", error);
    }
}

// Execute the seeder
export async function seedHolidays(prisma: PrismaClient) {
    const countHolidays = await prisma.holidays.count();

    if (countHolidays > 0) {
        console.log("Holidays already exist in the database.");
        return;
    }

    await fetchAndSaveHolidays(prisma);
}
