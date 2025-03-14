import path from "path";
import fs from 'fs';
import handlebars from "handlebars";
import puppeteer from "puppeteer";

export async function getPDF(){
     // Define the path to the Handlebars template file
     const templateData = {
        title :"Test"
     }
    const templatePath = path.join(__dirname, '../../templates/test.hbs');
    const template = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(template);
    const renderedTemplate = compiledTemplate(templateData);

    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(renderedTemplate, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({
        format: 'A4',
        landscape: true,
        margin: {
            top: 16,
            bottom: 16,
            left: 16,
            right: 16
        }
    });
    await browser.close();


    const fileName = `Example`;

    return {
        status: true,
        data: {
            buffer,
            fileName
        }
    }
}