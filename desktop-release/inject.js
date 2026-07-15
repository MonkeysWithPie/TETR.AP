// to make this work: 
// 1. run TETR.IO with the --remote-debugging-port=9222 flag
//    /home/[user]/Documents/Apps/tetrio-desktop-10.0.0/TETR.IO --remote-debugging-port=9222
//    or wherever your TETR.IO is installed
// 2. run this script with node
//    node inject.js
// 3. enjoy!
const puppeteer = require("puppeteer-core");
const fs = require("node:fs");
const path = require("node:path");

const url = "http://127.0.0.1:9222";
const clientPath = path.resolve(__dirname, "../../dist/client.min.js");

async function main() {
    const browser = await puppeteer.connect({
        browserURL: url,
        defaultViewport: null,
    });

    const pages = await browser.pages();

    const page = pages.find(p => 
        p.url().startsWith("https://tetr.io")
    )

    if (!page) {
        throw new Error("No tetr.io page found");
    }

    console.log("Found:", page.url());

    if (!fs.existsSync(clientPath)) {
        throw new Error("Client file not found: " + clientPath);
    }

    let clientSource = fs.readFileSync(clientPath, "utf-8");

    clientSource = clientSource.replace(/^\s*javascript:/i, "");

    const result = await page.evaluate((source) => {
        if (window.__TETR_AP_DESKTOP_LOADED__) {
            return "already loaded!"
        }

        window.__TETR_AP_DESKTOP_LOADED__ = true;

        try {
            const script = document.createElement("script");

            script.textContent = source;

            (document.head || document.documentElement).appendChild(script);

            script.remove();

            return "success"
        } catch (error) {
            window.__TETR_AP_DESKTOP_LOADED__ = false;
            throw error
        }
    }, clientSource);

    console.log("result", result);


    await browser.disconnect();
}

main().catch(console.error);