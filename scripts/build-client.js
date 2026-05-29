#!node

const fs = require("fs");
const { minify_sync } = require("terser");

let clientScript = fs.readFileSync("src/client/script.js", "utf-8")
    .replace("{{clientbox.html}}", fs.readFileSync("src/client/clientbox.html", "utf-8").replace(/\n/g, "\\n").replace(/"/g, '\\"'));

const images = ["lockover-ap.png", "archipelago_logo.png"];
for (const img of images) {
    clientScript = clientScript.replace(`{{${img}}}`, `https://raw.githubusercontent.com/MonkeysWithPie/TETR.AP/refs/heads/main/res/${img}`);
}

const bookmarklet = minify_sync(clientScript, { mangle: { 
    keep_fnames: true,
}});

fs.writeFileSync("dist/client.min.js", `${bookmarklet.code}`);