(async function() { 
'use strict';

const TAP = "[TETR.AP]"

const { Client } = await import("https://unpkg.com/archipelago.js/dist/archipelago.min.js");

async function waitUntil(predicate, trigger, interval = 200) {
    while (!await predicate()) {
      await new Promise(res => setTimeout(res, interval));
    }
    await trigger();
}

function getComboAndNum(mods) {
    const combos = {
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
    }   

    for (let i = 0; i < Object.keys(combos).length; i++) {
        const comboName = Object.keys(combos)[i];
        const comboMods = combos[comboName];
        if (JSON.stringify(comboMods) === JSON.stringify(mods)) {
            return { comboName, comboNum: i }
        }
    }

    return { comboName: null, comboNum: null };
}

function getFloor(height) {
    const thresholds = [0, 50, 150, 300, 450, 650, 850, 1100, 1350, 1650]
    for (let i = 0; i < thresholds.length; i++) {
        if (height < thresholds[i]) {
            return i + 1;
        }
    }
    return 10;
}

const client = new Client();

let foundChecks = [];
let menuLoaded = false;

waitUntil(
    () => document.body,
    () => {
        const apMenu = document.createElement("div");
        apMenu.id = "tetrap-client-area";
        apMenu.innerHTML = `{{clientbox.html}}`; 
        document.body.insertBefore(apMenu, document.getElementById("nofocus"));

        const connectionStatus = document.getElementById("ap-status")
        const shortStatus = document.getElementById("ap-shortstatus")
        const chatInput = document.getElementById("ap-chat-input")

        document.getElementById("ap-connect-form").onsubmit = (e) => {
            e.preventDefault()
            const inputs = e.srcElement.elements
            for (const input of inputs) { input.setAttribute("disabled","true") }
            connectionStatus.innerHTML = "Connecting..."

            client.login(inputs["ap-server"].value, inputs["ap-slot"].value, "TETR.AP", { password: inputs["ap-password"].value })
                .then(() => {
                    document.getElementById("ap-chat-area").classList.remove("disabled")
                    document.getElementById("ap-chat-messages").innerHTML = ""
                    document.getElementById("ap-connect-form").classList.add("disabled")
                    connectionStatus.innerHTML = `Connected as ${inputs["ap-slot"].value}!`
                    shortStatus.innerHTML = `Connected as ${inputs["ap-slot"].value}`
                    foundChecks = getFromStorage("foundChecks") || [];
                    
                    waitUntil(() => menuLoaded, relockCards);
                })
                .catch((e) => {
                    for (const input of inputs) { input.removeAttribute("disabled"); };
                    connectionStatus.innerHTML = `Failed! ${e}`
                    console.error(e);
                })
        }

        document.getElementById("ap-chat-send").onclick = () => {
            if (chatInput.value.trim() === "") return;
            client.messages.say(chatInput.value)
            chatInput.value = ""
        }

        document.getElementById("ap-disconnect").onclick = () => {
            setInStorage("foundChecks", foundChecks);
            client.socket.disconnect()
            document.getElementById("ap-chat-area").classList.add("disabled")
            connectionStatus.innerHTML = ""
            shortStatus.innerHTML = "Not connected"

            const inputs = document.getElementById("ap-connect-form").elements
            for (const input of inputs) { input.removeAttribute("disabled"); };
            document.getElementById("ap-connect-form").classList.remove("disabled")
        }

        document.getElementById("ap-collapse").onclick = (e) => {
            const area = document.getElementById("tetrap-client-area")
            area.classList.toggle("collapsed")
            if (area.classList.contains("collapsed")) {
                e.srcElement.innerHTML = "◀"
            } else {
                e.srcElement.innerHTML = "▶"
            }
        }
    }
)

window.onbeforeunload = () => {
    setInStorage("foundChecks", foundChecks);
}

function getFromStorage(key) {
    if (!client.authenticated) return null;

    const allData = localStorage.getItem("tetr-ap-data");
    if (!allData) return null;

    const data = JSON.parse(allData);
    return data[client.room.seedName][client.name][key];
}
function setInStorage(key, value) {
    if (!client.authenticated) return;

    let allData = localStorage.getItem("tetr-ap-data");
    if (!allData) {
        allData = {};
    } else {
        allData = JSON.parse(allData);
    }

    if (!allData[client.room.seedName]) {
        allData[client.room.seedName] = {};
    }
    if (!allData[client.room.seedName][client.name]) {
        allData[client.room.seedName][client.name] = {};
    }

    allData[client.room.seedName][client.name][key] = value;
    localStorage.setItem("tetr-ap-data", JSON.stringify(allData));
}

function createAPNotification(text, color, timeout = 5000) {
    const notification = document.createElement("div");
    notification.classList.add("ns", "notification", "has_image");
    notification.style = `--pri: ${color}; --sec: #000; border-color: ${color}; background-color: rgba(6, 6, 6, 0.867); color: white;`;
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

    const finalScore = Number(document.getElementById("zenith_result").innerText.replace("M","").trim());
    const modImages = document.getElementById("zenith_result").getElementsByClassName("mods")[0].children;
    const mods = [];
    for (const img of modImages) {
        mods.push(img.src.split("/").slice(-1)[0].replace(".png",""));
    }

    console.log(`${TAP} Zenith run finished! ${finalScore}m, mods: ${mods}`)
    const { comboName, comboNum } = getComboAndNum(mods);
    if (!comboName) {
        relockCards();
        console.log(`${TAP} No combo found for mods ${mods}`);
        return;
    }

    const floor = getFloor(finalScore);
    console.log(`${TAP} Combo: ${comboName} (num ${comboNum}), Floor: ${floor}`)

    for (let i = 2; i <= floor; i++) {
        const checkID = i + (comboNum * 100);
        if (foundChecks.includes(checkID)) continue;

        const itemData = await client.scout([checkID], 0);
        if (!itemData[0]) continue;
        const item = itemData[0];

        let notifText = `Sent ${item.name} to ${item.receiver}! (${item.locationName})`;
        if (item.receiver == client.name) {
            notifText = `Found your ${item.name}! (${item.locationName})`
        }

        let color = "#888888";
        if (item.filler) color = "#01d2d3";
        if (item.useful) color = "#6d8be8";
        if (item.progression) color = "#ae98ee";
        if (item.trap) color = "#fa8072";
        createAPNotification(notifText, color);

        foundChecks.push(checkID);
        await client.check(checkID);
    }

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

    const items = client.items.received;
    
    let unlocked = [];

    for (const item of items) {
        if (tarotCardMap[item.name]) {
            unlocked.push(tarotCardMap[item.name])
        }

        const reverse = item.name.replace("Reversed ","");
        if (tarotCardMap[reverse] && reverse !== item.name) {
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
        return !document.getElementById("zenithmenu").classList.contains("rolledup")
            && !document.getElementById("zenithmenu").classList.contains("hidden")
            && document.getElementById("menus").getAttribute("data-menu-type") === "zenith"
            && document.getElementById("zenithmenu").classList.contains("inresults")
            && document.getElementById("kuro").classList.contains("hidden")
    }, () => {
        onZenithFinish();

        waitUntil(() => 
            document.getElementById("zenithmenu").classList.contains("hidden"), 
            () => waitForZenithFinish()
        )
    });
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
        return console.warn(`${TAP} Card ${card} is locked by game!`)
    }

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
    if (!cardDiv.classList.contains("reversable") && !lock && !cardDiv.classList.contains("floorlocked")) {
        cardDiv.classList.add("reversable")
    } else if (cardDiv.classList.contains("reversable") && lock) {
        cardDiv.classList.remove("reversable")
    }

    const crystal1 = cardDiv.getElementsByClassName("zenith_card_crystal")[0];
    const crystal2 = cardDiv.getElementsByClassName("zenith_card_crystal_dark")[0];
    const progressDiv = cardDiv.getElementsByClassName("zenith_card_progress")[0];
    if (lock) {
        // TODO add our own progress counter, like the below
        // <div class="zenith_card_progress"><sub>00</sub>328<span> / 30000<span>M</span></span></div>
        progressDiv.innerHTML = `<img src="{{archipelago_logo.png}}" height="16px" width="16px"> LOCKED`
        if (!cardDiv.classList.contains("floorlocked")) progressDiv.classList.remove("hidden")

        crystal1.classList.add("hidden")
        crystal2.classList.add("hidden")
    } else {
        crystal1.classList.remove("hidden")
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

client.messages.on("message", (content) => {
    const chatMessages = document.getElementById("ap-chat-messages")
    const messageElement = document.createElement("p")
    // TODO fix newlines, and prevent other tags
    messageElement.innerHTML = content
    messageElement.classList.add("ap-chat-message")
    chatMessages.appendChild(messageElement)
})

client.items.on("itemsReceived", (items) => {
    console.log(`${TAP} Received items: ${items}`)
})
})()