#!node

const fs = require("fs");
const { minify_sync } = require("terser");

const clientScript = fs.readFileSync("src/client/script.js", "utf-8")
    .replace("{{clientbox.html}}", fs.readFileSync("src/client/clientbox.html", "utf-8").replace(/\n/g, "\\n").replace(/"/g, '\\"'));

const bookmarklet = minify_sync(clientScript);

fs.writeFileSync("dist/client.min.js", `${bookmarklet.code}`);