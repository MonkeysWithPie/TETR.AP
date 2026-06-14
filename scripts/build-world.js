const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

let archipelagoPath;

if (fs.existsSync(path.join(__dirname, "../../Archipelago"))) {
    archipelagoPath = path.join(__dirname, "../../Archipelago");
}

if (!archipelagoPath) {
    console.log("Remember, building APWorlds requires the DEV installation of Archipelago!")
    console.log("Archipelago auto detection failed! Please input the path:")
    process.stdin.on("data", (data) => {
        const inputPath = data.toString().trim();
        if (fs.existsSync(inputPath) && fs.existsSync(path.join(inputPath, "Archipelago"))) {
            archipelagoPath = path.join(inputPath, "Archipelago");
            buildWorld();
        } else {
            console.log("Invalid path, aborting");
            process.exit(1);
        }
    });
} else {
    buildWorld();
}

function buildWorld() {
    fs.cpSync(path.join(__dirname, "../src/apworld"), path.join(archipelagoPath, "worlds/tetr_ap"), { recursive: true });
    
    process.chdir(archipelagoPath);
    child_process.execSync('py -3.13.13 Launcher.py "Build APWorlds" -- "TETR.AP"');
    fs.copyFileSync(path.join(archipelagoPath, "build/apworlds/tetr_ap.apworld"), path.join(__dirname, "../dist/tetr_ap.apworld"));

    console.log("Build complete!")
}