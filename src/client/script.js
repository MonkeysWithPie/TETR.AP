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
        "Wheel of Fortune": ["messy"],
        "The Tower": ["gravity"],
        "Strength": ["volatile"],
        "The Devil": ["doublehole"],
        "The Hermit": ["invisible"],
        "The Magician": ["allspin"],
        "The Emperor": ["expert"],
    }   

    for (let i = 0; i < Object.keys(combos).length; i++) {
        const comboName = Object.keys(combos)[i];
        const comboMods = combos[comboName];
        if (JSON.stringify(comboMods) === JSON.stringify(mods)) {
            return { comboName, comboNum: i }
        }
    }
}

function getFloor(height) {
    const thresholds = [50, 150, 300, 450, 650, 850, 1100, 1350, 1650]
    for (let i = 0; i < thresholds.length; i++) {
        if (height < thresholds[i]) {
            return i + 1;
        }
    }
    return 10;
}

const client = new Client();

let foundChecks = [];

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
                    relockCards();
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
    const floor = getFloor(finalScore);
    console.log(`${TAP} Combo: ${comboName} (num ${comboNum}), Floor: ${floor}`)

    for (let i = 2; i <= floor; i++) {
        const checkID = i + (comboNum * 100);
        if (foundChecks.includes(checkID)) continue;

        const itemData = await client.scout([checkID], 0);
        if (!itemData[0]) continue;
        const item = itemData[0];

        let notifText = `Sent ${item.name} to ${item.receiver}! (${item.locationName})`;
        if (item.receiver === client.name) {
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

function relockCards() {
    if (!client.authenticated) return;

    const cards = {
        "Temperance": "nohold",
        "Wheel of Fortune": "messy",
        "The Tower": "gravity",
        "Strength": "volatile",
        "The Devil": "doublehole",
        "The Hermit": "invisible",
        "The Magician": "allspin",
        "The Emperor": "expert",
    }
    const items = client.items.received;
    
    let unlocked = [];

    for (const item of items) {
        if (cards[item.name]) {
            unlocked.push(cards[item.name])
        }
    }

    for (const card in cards) {
        setTarotCardLocked(cards[card], !unlocked.includes(cards[card]))
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

function setTarotCardLocked(card, lock) {
    const cardDivs = document.getElementsByClassName("zenith_card");
    let cardDiv;
    for (const div of cardDivs) {
        if (div.getAttribute("data-card") === card) {
            cardDiv = div;
            break;
        }
    }
    if (!cardDiv) return console.error(`${TAP} Could not find tarot card ${card} to set lock state!`);

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

waitUntil(
    () => { 
        let menus = document.getElementById("menus");
        return !menus || menus.getAttribute("data-menu-type") !== "none" 
    }, 
    () => {
        console.log(`${TAP} Menus loaded!`)
        const menu = document.getElementById("tetrap-client-area");
        menu.classList.add("after-menu-load");
        
        waitForZenithFinish();
    }
)

client.messages.on("message", (content) => {
    const chatMessages = document.getElementById("ap-chat-messages")
    const messageElement = document.createElement("p")
    messageElement.innerHTML = content
    messageElement.classList.add("ap-chat-message")
    chatMessages.appendChild(messageElement)
})

client.items.on("itemsReceived", (items) => {
    console.log(`${TAP} Received items: ${items}`)
})
})()