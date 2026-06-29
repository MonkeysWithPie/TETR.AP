(async function() { 
'use strict';

const TAP = "[TETR.AP]"

const { Client, clientStatuses } = await import("https://unpkg.com/archipelago.js/dist/archipelago.min.js");

async function waitUntil(predicate, trigger, interval = 200) {
    while (!await predicate()) {
      await new Promise(res => setTimeout(res, interval));
    }
    await trigger();
}

const modCombos = {
    "Standard": [],
    "Temperance": ["nohold"],
    "Asceticism": ["nohold_reversed"],
    "Wheel of Fortune": ["messy"],
    "Loaded Dice": ["messy_reversed"],
    "The Tower": ["gravity"],
    "Freefall": ["gravity_reversed"],
    "Strength": ["volatile"],
    "Last Stand": ["volatile_reversed"],
    "The Devil": ["doublehole"],
    "Damnation": ["doublehole_reversed"],
    "The Hermit": ["invisible"],
    "The Exile": ["invisible_reversed"],
    "The Magician": ["allspin"],
    "The Warlock": ["allspin_reversed"],
    "The Emperor": ["expert"],
    "The Tyrant": ["expert_reversed"],
    "Deadlock": ["nohold", "doublehole", "messy"],
    "The Starving Artist": ["nohold", "allspin"],
    "The Grandmaster": ["gravity", "invisible"],
    "The Con Artist": ["expert", "volatile", "allspin"],
    "Divine Mastery": ["expert","doublehole","volatile","messy"],
    "A Modern Classic": ["nohold","gravity"],
    "Emperor's Decadence": ["expert", "doublehole", "nohold"],
    "Swamp Water": ["nohold", "messy", "gravity", "volatile", "doublehole", "invisible", "allspin", "expert"],
} 

function getComboAndNum(mods) {  
    const comboCount = Object.keys(modCombos).length;

    function arraysEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length !== b.length) return false;

        a.sort();
        b.sort();

        for (var i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    for (let i = 0; i < comboCount; i++) {
        const comboName = Object.keys(modCombos)[i];
        const comboMods = modCombos[comboName];
        
        if (arraysEqual(mods, comboMods)) {
            return { comboName, comboNum: i }
        }
    }

    // SWL is a special case since it requires exactly 7 mods
    if (mods.length === 7) {
        return { comboName: "Swamp Water Lite", comboNum: comboCount + 1 }
    }

    return { comboName: null, comboNum: null };
}

function getFloor(height) {
    const thresholds = [0, 50, 150, 300, 450, 650, 850, 1100, 1350, 1650]
    for (let i = 0; i < thresholds.length; i++) {
        if (height < thresholds[i]) {
            return i;
        }
    }
    return 10;
}

const client = new Client();

let menuLoaded = false;
let yamlOptions = null;
let revProgresses = null;
let expectLoginChecks = false;
let expectedChecks = [];
let expectDisconnect = false;
let recentConnectFail = false;
let chatScrolling = null;

let hintMode = false;
let hintScore = null;
let hintGoal = null;
let hintPoints = null;

waitUntil(
    () => document.body,
    () => {
        const apMenu = document.createElement("div");
        apMenu.id = "tetrap-client-area";
        apMenu.innerHTML = `{{clientbox.html}}`; 
        // placed here in the DOM so it is shown always except during screen transitions
        document.body.insertBefore(apMenu, document.getElementById("nofocus"));

        if (getPreference("darkMode") === undefined) {
            setPreference("darkMode", window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
        if (getPreference("darkMode")) {
            apMenu.classList.add("dark");
        }

        const connectionStatus = document.getElementById("ap-status")
        const shortStatus = document.getElementById("ap-shortstatus")
        const chatInput = document.getElementById("ap-chat-input")
        const connectButton = document.getElementById("ap-connect")

        const tabs = document.getElementsByClassName("ap-tab");
        for (const tab of tabs) {
            const tabName = tab.getAttribute("data-tab-name");

            const button = document.createElement("div");
            button.classList.add("ap-tab-button");
            if (tabName === "connect") button.classList.add("active");

            button.innerHTML = tab.getAttribute("data-tab-name");
            button.onclick = () => setTab(tabName);

            document.getElementById("ap-nav").appendChild(button);
        }
        const filler = document.createElement("div");
        filler.style.flexGrow = "1";
        filler.style.borderBottom = "1px solid var(--ap-text)";
        document.getElementById("ap-nav").appendChild(filler);

        document.getElementById("ap-server").value = getPreference("lastServer") || "archipelago.gg:12345";
        document.getElementById("ap-slot").value = getPreference("lastSlot") || "";
        document.getElementById("ap-password").value = getPreference("lastPassword") || "";

        const body = document.getElementsByTagName("body")[0];
        for (const input of apMenu.querySelectorAll("input[type=text]")) {
            input.onfocus = () => {
                body.classList.add("chatfocus");
                body.classList.add("tetrap-chatfocus");
            }
            input.onblur = () => {
                body.classList.remove("chatfocus");
                body.classList.remove("tetrap-chatfocus");
            }
        }

        document.getElementById("ap-dark-toggle").onclick = (e) => {
            setPreference("darkMode", document.getElementById("tetrap-client-area").classList.toggle("dark"));
        }

        document.getElementById("ap-connect-form").onsubmit = (e) => {
            e.preventDefault()
            if (client.authenticated) {
                expectDisconnect = true;
                connectionStatus.innerHTML = "Disconnecting..."
                connectButton.setAttribute("disabled","true")
                client.socket.disconnect();
                return;
            }

            const inputs = document.getElementById("ap-connect-form").elements
            for (const input of inputs) { input.setAttribute("disabled","true") }
            connectButton.setAttribute("disabled","true")
            connectionStatus.innerHTML = "Connecting..."
            document.getElementById("ap-connect-error").innerHTML = "";

            expectLoginChecks = true;
            const tags = inputs["ap-hintmode"].checked ? ["HintGame"] : [];
            client.login(inputs["ap-server"].value, inputs["ap-slot"].value, "TETR.AP", { password: inputs["ap-password"].value, version: { major: 0, minor: 6, build: 7 }, tags })
                .then(async () => {
                    recentConnectFail = false;
                    document.getElementById("ap-chat-messages").innerHTML = ""
                    setTab("chat");
                    connectionStatus.innerHTML = `Connected`
                    document.getElementById("ap-username").innerHTML = inputs["ap-slot"].value
                    shortStatus.innerHTML = `Connected as ${inputs["ap-slot"].value}`
                    
                    connectButton.value = "Disconnect"
                    connectButton.removeAttribute("disabled")
                    document.getElementById("ap-nav").classList.remove("disabled");

                    if (inputs["ap-hintmode"].checked) {
                        hintMode = true;

                        document.getElementById("ap-progress-hintmode").style.display = "block";
                        document.getElementById("ap-progress-standard").style.display = "none";
                        return;
                    }
                    hintMode = false;
                    document.getElementById("ap-progress-hintmode").style.display = "none";
                    document.getElementById("ap-progress-standard").style.display = "block";

                    setPreference("lastServer", inputs["ap-server"].value);
                    setPreference("lastSlot", inputs["ap-slot"].value);
                    setPreference("lastPassword", inputs["ap-password"].value);

                    await client.storage.fetch(["revProgresses"], true);
                    revProgresses = client.storage.store["revProgresses"];
                    if (revProgresses === null) {
                        // attempt to copy old localStorage data
                        revProgresses = getFromStorage("revProgresses") || {};
                    }

                    await detectDifficulties();

                    // wait for login checks to go through
                    waitUntil(() => menuLoaded && !expectLoginChecks, relockCards);

                    // login checks aren't sent when there aren't any checks(?)
                    // in that case, we wait a bit and stop expecting login checks
                    setTimeout(() => {
                        if (expectLoginChecks) {
                            console.warn(`${TAP} Login checks timeout`)
                            expectLoginChecks = false;
                        }
                    }, 5000)
                })
                .catch((e) => {
                    recentConnectFail = true;
                    for (const input of inputs) { input.removeAttribute("disabled"); };
                    connectButton.removeAttribute("disabled");

                    connectionStatus.innerHTML = `Disconnected`
                    const errorElement = document.getElementById("ap-connect-error")

                    // ArgumentError should not happen because #ap-slot is required, and
                    // LoginErrors are already covered by connectionRefused event
                    if (e instanceof TypeError) {
                        errorElement.innerHTML = "The server you input is not a valid URL!"
                    }
                    else if (e.name === "SecurityError") {
                        errorElement.innerHTML = "The port you input is incorrect!"
                    }
                    else if (e.message.includes("Failed to connect to Archipelago server")) {
                        errorElement.innerHTML = "The server you input is not hosting a server!"
                    }
                    else if (e.message.includes("Connection was refused")) {
                        // handled
                    }
                    else {
                        errorElement.innerHTML = `Failed to connect! Not sure why. Check the console for more info.`;
                    }

                    console.error(e);
                })
        }

        document.getElementById("ap-chat-input").onkeypress = (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.value.trim() === "") return;
                client.messages.say(chatInput.value)
                chatInput.value = ""
            }
        }

        client.socket.on("disconnected", () => {
            if (recentConnectFail) return;
            unlockCards();
            revProgresses = null;
            
            connectionStatus.innerHTML = "Disconnected"
            document.getElementById("ap-username").innerHTML = ""
            shortStatus.innerHTML = "Not connected"

            connectButton.value = "Connect"
            connectButton.removeAttribute("disabled")
            document.getElementById("ap-nav").classList.add("disabled");

            const inputs = document.getElementById("ap-connect-form").elements
            for (const input of inputs) { input.removeAttribute("disabled"); };
            setTab("connect");

            if (!expectDisconnect) {
                createAPNotification("Unexpectedly disconnected from server!", { color: "#fa5e4d", backgroundColor: "#060606dd", timeout: 10000 })
            } else { expectDisconnect = false; }
        })

        client.socket.on("connectionRefused", (packet) => {
            let errorMessage = `Failed to connect! Not sure why.`;
            if (!packet.errors) {
                document.getElementById("ap-connect-error").innerHTML = errorMessage;
                return;
            }

            if (packet.errors.includes("InvalidSlot")) {
                errorMessage = `Your slot name is invalid!`;
            }
            if (packet.errors.includes("InvalidPassword")) {
                if (document.getElementById("ap-password").value === "") {
                    errorMessage = `This server requires a password!`;
                } else {
                    errorMessage = `The password you entered is invalid!`;
                }
            }
            if (packet.errors.includes("InvalidGame")) {
                errorMessage = `The slot you are trying to connect to is not running TETR.AP!`;
            }
            if (packet.errors.includes("InvalidVersion")) {
                errorMessage = `The server is running an incompatible version of Archipelago! This client may have an update available, or the server could be outdated.`;
            }
            if (packet.errors.includes("InvalidItemsHandling")) {
                errorMessage = `The server didn't like your item handling flags. This should never happen.`
            }

            document.getElementById("ap-connect-error").innerHTML = errorMessage;
        })

        document.getElementById("ap-collapse").onclick = (e) => {
            const area = document.getElementById("tetrap-client-area")
            area.classList.toggle("collapsed")
            if (area.classList.contains("collapsed")) {
                e.srcElement.innerHTML = "◀"
            } else {
                e.srcElement.innerHTML = "▶"
            }
        }

        document.getElementById("ap-chat-messages").onscrollend = () => {
            chatScrolling = false;
        }

        document.getElementById("ap-buy-hint").onclick = async () => {
            if (!hintMode) return;
            if (hintPoints < 1) {
                createAPNotification("You don't have enough Hint Points!", { color: "#fa5e4d", backgroundColor: "#060606dd", timeout: 3000 })
                return;
            }
            
            const hintable = client.room.missingLocations;
            if (hintable.length === 0) {
                createAPNotification("There are no more hints available!", { color: "#fa5e4d", backgroundColor: "#060606dd", timeout: 3000 })
                return;
            }
            
            hintPoints -= 1;
            document.getElementById("ap-hint-points").innerHTML = hintPoints;
            const hintIndex = Math.floor(Math.random() * hintable.length);
            const hint = await client.scout([hintable[hintIndex]], 1);

            let notifSettings = { color: "#888888", backgroundColor: "#060606dd", timeout: 7000 };
            if (hint[0].filler) notifSettings.color = "#01d2d3";
            if (hint[0].useful) notifSettings.color = "#6d8be8";
            if (hint[0].progression) notifSettings.color = "#ae98ee";
            if (hint[0].trap) notifSettings.color = "#fa8072";
            createAPNotification(`${hint[0].receiver}'s ${hint[0].name} is at ${hint[0].locationName}`, notifSettings);
        }

        document.getElementById("ap-hint-req-changer").onsubmit = (e) => {
            e.preventDefault();
            hintGoal = Math.floor(Number(document.getElementById("ap-hint-req-input").value) * 1.2);
            setPreference("hintGoal", hintGoal);
            document.getElementById("ap-hint-req").innerHTML = hintGoal;
        }
    }
)

// since someone might play on the same room with two different sessions,
// data is saved per room and per player
function getFromStorage(key) {
    if (!client.room.seedName || !client.name) return null;

    const allData = localStorage.getItem("tetr-ap-data");
    if (!allData) return null;

    const data = JSON.parse(allData);
    
    if (!data[client.room.seedName]) return null;
    if (!data[client.room.seedName][client.name]) return null;

    return data[client.room.seedName][client.name][key];
}

function setPreference(key, val) {
    const data = JSON.parse(localStorage.getItem("tetrap-prefs")) || {};
    
    data[key] = val;
    localStorage.setItem("tetrap-prefs", JSON.stringify(data));
}
function getPreference(key) {
    const data = JSON.parse(localStorage.getItem("tetrap-prefs")) || {};
    return data[key];
}

function setTab(tabName) {
    if (!client.authenticated && tabName !== "connect") return;

    const tabs = document.getElementsByClassName("ap-tab");
    for (const tab of tabs) {
        if (tab.getAttribute("data-tab-name") === tabName) {
            tab.classList.remove("disabled");
        } else {
            tab.classList.add("disabled");
        }
    }

    const buttons = document.getElementsByClassName("ap-tab-button");
    for (const button of buttons) {
        if (button.innerHTML.toLowerCase() === tabName) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    }

    if (tabName === "progress") {
        updateProgressTab();
    }
}

function createAPNotification(text, {
    color = "#888888", 
    backgroundColor = "#060606dd",
    timeout = 5000,
    gradient = false, }) {
    const notification = document.createElement("div");
    notification.classList.add("ns", "notification", "has_image");

    let style = 
`--pri: ${color};
--sec: #000;
border-color: ${color};
background-color: ${backgroundColor};
color: white;`;
    
    if (gradient) {
        style += `border-image: ${color} 1;`;
    }

    notification.style = style;
    notification.innerHTML = `<img class="notification_icon" src="{{archipelago_logo.png}}"><p>${text.toLowerCase()}</p>`;
    document.getElementById("notifications").appendChild(notification);

    setTimeout(() => {
        notification.classList.add("despawning");
        setTimeout(() => {
            notification.remove();
        }, 600)
    }, timeout);
}

async function onZenithFinish() {
    if (!client.authenticated) return;

    const finalScore = Number(document.getElementById("zenith_result").innerText.replace("M","").replace(",","").trim());
    const modImages = document.getElementById("zenith_result").getElementsByClassName("mods")[0].children;
    const mods = [];
    for (const img of modImages) {
        mods.push(img.src.split("/").slice(-1)[0].replace(".png",""));
    }

    console.log(`${TAP} Zenith run finished! ${finalScore}m, mods: ${mods}`)

    if (hintMode) {
        let scoreEarned = finalScore;
        // TODO: multipliers and bonuses and stuff

        hintScore += scoreEarned;
        hintPoints += Math.floor(hintScore / hintGoal);
        hintScore = hintScore % hintGoal;

        document.getElementById("ap-hint-score").innerHTML = hintScore.toFixed(1);
        document.getElementById("ap-hint-points").innerHTML = hintPoints;

        return;
    }

    for (const mod of mods) {
        revProgresses[mod] = revProgresses[mod] || 0;
        revProgresses[mod] += finalScore;
    }
    client.storage.prepare("revProgresses", {})
        .default()
        .update(revProgresses)
        .commit(false);
    relockCards();

    const { comboName, comboNum } = getComboAndNum(mods);
    if (!comboName) {
        console.log(`${TAP} No combo found for mods ${mods}`);
        return;
    }

    const floor = getFloor(finalScore);
    console.log(`${TAP} Combo: ${comboName} (num ${comboNum}), Floor: ${floor}`)

    let sentToSelf = false;
    const scoutIDs = [];
    for (let i = 2; i <= floor; i++) {
        scoutIDs.push(i + (comboNum * 100));
    }
    const scoutResults = await client.scout(scoutIDs, 0);

    let checkPromises = [];
    for (const item of scoutResults) {
        if (!item) {
            continue;
        }
        if (client.room.checkedLocations.includes(item.locationId)) {
            continue;
        }
        
        let notifText = `Sent ${item.name} to ${item.receiver}! (${item.locationName})`;
        if (item.receiver == client.name) {
            notifText = `Found your ${item.name}! (${item.locationName})`
            sentToSelf = true;
            expectedChecks.push(item.locationId);
        }

        let notifSettings = { color: "#888888", backgroundColor: "#060606dd", timeout: 5000 };
        if (item.filler) notifSettings.color = "#01d2d3";
        if (item.useful) notifSettings.color = "#6d8be8";
        if (item.progression) {
            notifSettings = { color: "#ae98ee", backgroundColor: "#38314dc7", timeout: 12000 };
        }
        if (item.trap) notifSettings.color = "#fa8072";
        createAPNotification(notifText, notifSettings);

        checkPromises.push(client.check(item.locationId));
    }
    await Promise.all(checkPromises);
    relockCards();
}

const tarotCardMap = {
    "Temperance": "nohold",
    "Wheel of Fortune": "messy",
    "The Tower": "gravity",
    "Strength": "volatile",
    "The Devil": "doublehole",
    "The Hermit": "invisible",
    "The Magician": "allspin",
    "The Emperor": "expert",
}

function unlockCards() {
    for (const card in tarotCardMap) {
        setTarotCardLocked(tarotCardMap[card], false)
        setTarotCardReverseLocked(tarotCardMap[card], false)
    }
}
function relockCards() {
    if (!client.authenticated) return;
    
    let unlocked = [];

    for (const item of client.items.received) {
        if (tarotCardMap[item.name]) {
            unlocked.push(tarotCardMap[item.name])
        }

        const reverse = item.name.replace("Reversed ","");
        if (
            tarotCardMap[reverse] && 
            reverse !== item.name && 
            (revProgresses[tarotCardMap[reverse]] || 0) >= yamlOptions.reverse_height
        ) {
            unlocked.push(`${tarotCardMap[reverse]}_reversed`)
        }
    }

    for (const card in tarotCardMap) {
        setTarotCardLocked(tarotCardMap[card], !unlocked.includes(tarotCardMap[card]))
        setTarotCardReverseLocked(tarotCardMap[card], !unlocked.includes(`${tarotCardMap[card]}_reversed`))
    }
}

async function waitForZenithFinish() {
    waitUntil(() => {
        return !document.getElementById("zenithmenu").classList.contains("rolledup") // zenithmenu shown and in results
            && !document.getElementById("zenithmenu").classList.contains("hidden")
            &&  document.getElementById("zenithmenu").classList.contains("inresults")
            &&  document.getElementById("menus").getAttribute("data-menu-type") === "zenith" // in the zenith menu
            &&  document.getElementById("kuro").classList.contains("hidden") // not during a screen transition
    }, () => {
        onZenithFinish();

        // make sure the menu is hidden so the same run isn't being registered multiple times
        waitUntil(() => 
            document.getElementById("zenithmenu").classList.contains("hidden"), 
            () => waitForZenithFinish()
        )
    });
}

async function detectDifficulties() {
    // as per https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/world%20api.md#slot-data, it's better to use locationScouts than it is
    // to add the difficulties to the slot data directly. here we scout each check to see if it exists and determine difficulties based on that
    const scouts = [];

    // +1 bc of SWL
    for (let i = 0; i < Object.keys(modCombos).length + 1; i++) {
        for (let j = 2; j <= 10; j++) {
            const checkID = j + (i * 100);
            scouts.push(checkID);
        }
    }
    const items = await client.scout(scouts, 0);

    yamlOptions.difficulties = {};
    for (const item of items) {
        const checkID = item.locationId;

        // HACK: `checkID % 100` causes errors when placed in a bookmarklet because the browser thinks it should be `%10` instead which is illegal
        // so we convert to string and back to number to force the correct modulo operation
        const floor = checkID % Number("100");

        let combo = Object.keys(modCombos)[Math.floor(checkID / 100)];
        if (!combo) combo = "Swamp Water Lite";
        
        yamlOptions.difficulties[combo] = floor;
    }

    console.log(`${TAP} Detected difficulties: ${JSON.stringify(yamlOptions.difficulties)}`)

    // attempt to auto-detect check style
    if (typeof yamlOptions.check_style !== "number") {
        const mightBeVanilla = await client.scout([2], 0);

        let allCheckTarget;
        for (const mod in yamlOptions.difficulties) {
            if (yamlOptions.difficulties[mod] >= 2 && mod !== "Standard") {
                allCheckTarget = 2 + (Object.keys(modCombos).indexOf(mod) * 100);
                break;
            }
        }
        if (!allCheckTarget) return console.warn(`${TAP} Could not find a check to auto-detect check style!`);

        const mightBeAll = await client.scout([allCheckTarget], 0);

        console.log(`${TAP} ${mightBeVanilla[0]} ${mightBeAll[0]}`)
        if (mightBeVanilla[0] && !mightBeAll[0]) {
            yamlOptions.check_style = 0;
        }
        if (mightBeVanilla[0] && mightBeAll[0]) {
            yamlOptions.check_style = 2;
        }
        if (!mightBeVanilla[0] && !mightBeAll[0]) {
            yamlOptions.check_style = 1;
        }
        console.log(`${TAP} Auto-detected check style: ${yamlOptions.check_style}`)
    }
}

async function updateProgressTab() {
    if (hintMode) {
        hintGoal = hintGoal || getPreference("hintGoal") || 1000;
        hintScore ||= 0;
        hintPoints ||= 0;

        document.getElementById("ap-hint-points").innerHTML = hintPoints;
        document.getElementById("ap-hint-score").innerHTML = hintScore;
        document.getElementById("ap-hint-req").innerHTML = hintGoal;    
    }

    const modsetList = document.getElementById("ap-modset-list");
    modsetList.innerHTML = "";

    if (typeof yamlOptions.check_style !== "number") {
        document.getElementById("ap-progress-hint").style.display = "none";
        modsetList.textContent = "The APWorld on the server is outdated, so tracking info can't be shown."
        return;
    }

    const unlockedMods = [];
    
    for (const item of client.items.received) {
        if (tarotCardMap[item.name]) {
            unlockedMods.push(tarotCardMap[item.name])
        }

        const reversed = item.name.replace("Reversed ","");
        if (tarotCardMap[reversed] && reversed !== item.name && (revProgresses[tarotCardMap[reversed]] || 0) >= yamlOptions.reverse_height) {
            unlockedMods.push(`${tarotCardMap[reversed]}_reversed`)
        }
    }

    const possibleModsets = [];

    for (const comboName in modCombos) {
        const comboMods = modCombos[comboName];
        let allowed = true;
        for (const mod of comboMods) {
            if (!unlockedMods.includes(mod)) allowed = false;
        }
        if (allowed) {
            possibleModsets.push(comboName);
        }
    }
    if (unlockedMods.length >= 7) {
        possibleModsets.push("Swamp Water Lite");
    }

    const ranks = {
        2: "bronze",
        3: "bronze",
        4: "bronze",
        5: "silver",
        6: "silver",
        7: "gold",
        8: "gold",
        9: "platinum",
        10: "diamond",
    }

    const emptyImg = document.createElement("div");
    emptyImg.style.width = "32px";
    for (const modset of possibleModsets) {
        const modsetDiv = document.createElement("div");
        modsetDiv.classList.add("ap-modset");

        const modsetName = document.createElement("p");
        modsetName.textContent = modset;
        modsetDiv.appendChild(modsetName);

        for (let i = 2; i <= 10; i++) {
            if (i > yamlOptions.difficulties[modset]) break;

            const img = document.createElement("img");

            // 0 = vanilla, 1 = ranks, 2 = all
            if (yamlOptions.check_style === 0 && modset !== "Standard" || yamlOptions.check_style === 1) {
                if (![3,5,7,9,10].includes(i)) { // not a check
                    modsetDiv.appendChild(emptyImg.cloneNode());
                    continue;
                }
            }
            
            const checkID = i + (Object.keys(modCombos).indexOf(modset) * 100);
            const hasCheck = client.room.checkedLocations.includes(checkID);
            
            img.src = `/res/achievements/frames/${hasCheck ? ranks[i] : "none"}.png`;

            modsetDiv.appendChild(img);
        }

        modsetList.appendChild(modsetDiv);
    }
}

function getTarotCard(card) {
    const cardDivs = document.getElementsByClassName("zenith_card");
    for (const div of cardDivs) {
        if (div.getAttribute("data-card") === card) {
            return div;
        }
    }
    throw new Error(`${TAP} Could not find tarot card ${card}!`)
}

function setTarotCardLocked(card, lock) {
    const cardDiv = getTarotCard(card);

    if (cardDiv.classList.contains("floorlocked") && !cardDiv.getAttribute("ap-locked")) {
        // AFAIK it's not allowed to unlock cards that the player hasn't unlocked in main TETR.IO
        // this shouldn't happen since YAML settings should only lock cards that aren't locked ingame
        return console.warn(`${TAP} Card ${card} is locked by game!`)
    }

    // set an attribute so we know it's locked by AP, and can distinguish from game-locked cards
    cardDiv.setAttribute("ap-locked", lock);
    if (cardDiv.classList.contains("floorlocked") && !lock) {
        cardDiv.classList.remove("floorlocked")
    } else if (lock) {
        cardDiv.classList.add("floorlocked")
    }

    const images = cardDiv.getElementsByTagName("img");
    for (const img of images) {
        if (lock && img.classList.contains("zenith_card_lock")) {
            img.src = "{{lockover-ap.png}}"
            img.classList.add("zenith_card_lockover")
        }
    }

    const idToNameMap = {
        "nohold": "No Hold",
        "messy": "Messier Garbage",
        "gravity": "Gravity",
        "volatile": "Volatile Garbage",
        "doublehole": "Double Hole Garbage",
        "invisible": "Invisible",
        "allspin": "All-Spin",
        "expert": "Expert Mode",
    }

    const infos = document.getElementById("zenith_deck_infos");
    for (const info of infos.children) {
        if (info.getAttribute("data-for") === `${card}_locked` && lock) {
            info.getElementsByTagName("h1")[0].innerHTML = `${(idToNameMap[card] || card).toUpperCase()}`
            info.getElementsByTagName("p")[0].innerHTML = "acquire from AP to unlock"
        }
    }
}
function setTarotCardReverseLocked(card, lock) {
    const cardDiv = getTarotCard(card);

    if ((!cardDiv.classList.contains("reversable") && !cardDiv.getAttribute("ap-reverse-locked"))
        || (cardDiv.classList.contains("floorlocked") && !cardDiv.getAttribute("ap-locked"))) {
        return console.warn(`${TAP} Card ${card} is not reversable or is locked by game!`)
    }

    cardDiv.setAttribute("ap-reverse-locked", lock);

    const floorLocked = cardDiv.classList.contains("floorlocked");
    const actuallyLocked = floorLocked || lock;
    if (!cardDiv.classList.contains("reversable") && !actuallyLocked) {
        cardDiv.classList.add("reversable")
    } else if (cardDiv.classList.contains("reversable") && actuallyLocked) {
        cardDiv.classList.remove("reversable")
    }

    const crystal1 = cardDiv.getElementsByClassName("zenith_card_crystal")[0];
    const crystal2 = cardDiv.getElementsByClassName("zenith_card_crystal_dark")[0];
    const progressDiv = cardDiv.getElementsByClassName("zenith_card_progress")[0];
    if (lock) {
        const progress = revProgresses[card] || 0;
        if (progress < yamlOptions.reverse_height && progress > 0) {
            let text = `<img src="{{archipelago_logo.png}}" height="16px" width="16px"> `
            progressDiv.classList.remove("hidden")
            text += `<sub>${"0".repeat(yamlOptions.reverse_height.length - String(progress).length)}</sub>`
            text += `${Math.floor(progress)}`
            text += `<span> / ${yamlOptions.reverse_height}<span>M</span></span>`

            progressDiv.innerHTML = text;
        } else if (yamlOptions.reverse_height !== 0 && progress <= 0) {
            progressDiv.classList.add("hidden")
        } else {
            progressDiv.innerHTML = `<img src="{{archipelago_logo.png}}" height="16px" width="16px"> LOCKED`
        }
        if (!cardDiv.classList.contains("floorlocked") && progress > 0) progressDiv.classList.remove("hidden")

        crystal1.classList.add("hidden")
        crystal2.classList.add("hidden")
    } else {
        // make the dark crystal appear if the reverse is unlocked but the standard card isn't,
        // so the user knows when they've unlocked the reverse
        if (!floorLocked && !lock) {
            crystal1.classList.remove("hidden")
        } else {
            crystal1.classList.add("hidden")
        }

        crystal2.classList.remove("hidden")
        progressDiv.classList.add("hidden")
    }
}

waitUntil(
    () => { 
        let menus = document.getElementById("menus");
        return !menus || menus.getAttribute("data-menu-type") !== "none" 
    }, 
    () => {
        console.log(`${TAP} Menus loaded!`)
        menuLoaded = true;
        const menu = document.getElementById("tetrap-client-area");
        menu.classList.add("after-menu-load");
        
        waitForZenithFinish();
    }
)

client.messages.on("message", (content, nodes) => {
    const chatMessages = document.getElementById("ap-chat-messages")
    const messageElement = document.createElement("div")

    for (const node of nodes) {
        const nodeElement = document.createElement("span");
        
        // https://archipelago.js.org/stable/classes/index.TextualMessageNode.html
        // not sure why these are separate since they share the same class? 
        if (node.type === "entrance") node.type = "text";
        
        nodeElement.textContent = node.text;
        if (node.type === "item") {
            if (node.item.filler) nodeElement.style.color = "#01d2d3";
            if (node.item.useful) nodeElement.style.color = "#6d8be8";
            if (node.item.progression) nodeElement.style.color = "#ae98ee";
            if (node.item.trap) nodeElement.style.color = "#fa8072";
        }
        else if (node.type === "player") {
            if (node.player.name === client.name) {
                nodeElement.style.color = "#ba70ff";
            }
        }
        else if (node.type === "color") {
            // see https://archipelago.js.org/stable/types/index.API.ValidJSONColorType.html
            if (node.color === "bold") {
                nodeElement.style.fontWeight = "bold";
            } else if (node.color === "underline") {
                nodeElement.style.textDecoration = "underline";
            } else if (node.color.includes("_bg")) {
                nodeElement.style.backgroundColor = node.color.replace("_bg", "");
            } else {
                nodeElement.style.color = node.color;
            }
        }

        nodeElement.classList.add(`ap-${node.type}-message`);
        messageElement.appendChild(nodeElement);
    }

    // messageElement.textContent = content
    messageElement.classList.add("ap-message")
    // don't scroll if the user is scrolled up...
    let shouldScroll = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 20;
    if (content.startsWith(`${client.name}:`)) {
        shouldScroll = true; // ...unless it's their own message...
    }
    if (chatScrolling) {
        shouldScroll = true; // ...or if we're already scrolling
    }

    chatMessages.appendChild(messageElement)
    if (shouldScroll) {
        chatMessages.scroll({ top: chatMessages.scrollHeight, behavior: "smooth" })
        chatScrolling = true;
    }
})

client.items.on("itemsReceived", async (items) => {
    let lastIndex = client.storage.store["lastSeenItemIndex"];
    if (!lastIndex) {
        await client.storage.fetch(["lastSeenItemIndex"], true);
        lastIndex = client.storage.store["lastSeenItemIndex"];
        if (lastIndex === null) lastIndex = 0;
    }

    if (expectLoginChecks) {
        items = items.slice(lastIndex);
    }
    client.storage.prepare("lastSeenItemIndex", 0)
        .default()
        .add(items.length)
        .commit(false);

    console.log(`${TAP} Received items: ${items}`)
    
    if (items.some(item => item.name.includes("Progress"))) {
        const matcher = /\+1km Reversed (.*) Progress/

        for (const item of items) {
            if (!matcher.test(item.name)) continue;

            const cardName = tarotCardMap[item.name.match(matcher)[1]];
            if (!cardName) continue;
            waitUntil(() => revProgresses, () => {
                if (!revProgresses[cardName]) revProgresses[cardName] = 0;
                revProgresses[cardName] += 1000;
                if (menuLoaded) relockCards();
            });
        }
    }

    for (const item of items) {
        if (expectedChecks.includes(item.locationId)) continue; // already notified

        let sender = item.sender;
        // slot being 0 refers to the server
        // see https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md#networkplayer
        if (sender.slot === 0) sender = "Cheat console";

        let important = false;
        if (tarotCardMap[item.name] || tarotCardMap[item.name.replace("Reversed ","")]) important = true;

        if (client.items.received.filter(pastItem => pastItem.name === item.name).length > 1 && important) {
            // this item was already received, so it's likely that it was cheated in earlier on
            // in this case, we don't notify at all
            continue;
        }

        if (item.name === "Achievement") {
            createAPNotification(`${sender} found one of your Achievements!`, 
                { color: "#866de8", backgroundColor: "#1b1825bc" }
            );
        }
        else if (important) { // item.progression is not populated unless scouted, so check for tarot cards manually
            createAPNotification(`${sender} found your ${item.name}!`, 
                { color: "#ae98ee", backgroundColor: "#38314dc7", timeout: 12000 }
             );
        }
        else {
            createAPNotification(`${sender} found your ${item.name}`,
                { color: "#888888", backgroundColor: "#060606dd" }
            );
        }
    }
    
    // if menu isn't loaded, cards will be relocked when it is
    // checks may appear before login is finished, and login relocks cards anyways, so skip for now
    if (menuLoaded && !expectLoginChecks) relockCards(); 
    if (expectLoginChecks) expectLoginChecks = false;
    updateProgressTab();

    // check for wincon
    const selfStatus = await client.players.self.fetchStatus()
    if (selfStatus === clientStatuses.goal) return; // already won

    let aches = 0;
    for (const item of client.items.received) {
        if (item.name === "Achievement") aches++;
    }
    document.getElementById("ap-ach-count").textContent = aches;

    if (aches >= yamlOptions.goal_count) {
        client.updateStatus(clientStatuses.goal);
        createAPNotification(`you've reached your goal of ${yamlOptions.goal_count} achievements!`, 
            { color: "linear-gradient(90deg, #fc4444 0%, #fafa48 20%, #80ff4a 40%, #29d1ff 60%, #8f26ff 80%, #fc49e2 100%)", 
                backgroundColor: "#2c4d4dc7", timeout: 30000, gradient: true }
        );
    }
})

client.socket.on("connected", async (packet) => {
    yamlOptions = packet.slot_data;
    document.getElementById("ap-req-count").textContent = yamlOptions.goal_count;
    console.log(`${TAP} Connected to AP server! ${JSON.stringify(yamlOptions)}`)
})
})()