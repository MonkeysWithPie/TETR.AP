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
        "Deadlock": ["nohold", "doublehole", "messy"],
        "The Starving Artist": ["nohold", "allspin"],
        "The Grandmaster": ["gravity", "invisible"],
        "The Con Artist": ["expert", "volatile", "allspin"],
        "Divine Mastery": ["expert","doublehole","volatile","messy"],
        "A Modern Classic": ["nohold","gravity"],
        "Emperor's Decadence": ["expert", "doublehole", "nohold"],
        "Swamp Water": ["nohold", "messy", "gravity", "volatile", "doublehole", "invisible", "allspin", "expert"],
    }   

    const comboCount = Object.keys(combos).length;

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
        const comboName = Object.keys(combos)[i];
        const comboMods = combos[comboName];
        
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

waitUntil(
    () => document.body,
    () => {
        const apMenu = document.createElement("div");
        apMenu.id = "tetrap-client-area";
        apMenu.innerHTML = `{{clientbox.html}}`; 
        // placed here in the DOM so it is shown always except during screen transitions
        document.body.insertBefore(apMenu, document.getElementById("nofocus"));

        const connectionStatus = document.getElementById("ap-status")
        const shortStatus = document.getElementById("ap-shortstatus")
        const chatInput = document.getElementById("ap-chat-input")

        document.getElementById("ap-server").value = "archipelago.gg:12345";

        document.getElementById("ap-connect-form").onsubmit = (e) => {
            e.preventDefault()
            const inputs = e.srcElement.elements
            for (const input of inputs) { input.setAttribute("disabled","true") }
            connectionStatus.innerHTML = "Connecting..."

            expectLoginChecks = true;
            client.login(inputs["ap-server"].value, inputs["ap-slot"].value, "TETR.AP", { password: inputs["ap-password"].value })
                .then(() => {
                    revProgresses = getFromStorage("revProgresses") || {};
                    document.getElementById("ap-chat-area").classList.remove("disabled")
                    document.getElementById("ap-chat-messages").innerHTML = ""
                    document.getElementById("ap-connect-form").classList.add("disabled")
                    connectionStatus.innerHTML = `Connected as ${inputs["ap-slot"].value}!`
                    shortStatus.innerHTML = `Connected as ${inputs["ap-slot"].value}`

                    // wait for login checks to go through
                    waitUntil(() => menuLoaded && !expectLoginChecks, relockCards);
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
        }

        client.socket.on("disconnected", () => {
            unlockCards();
            setInStorage("revProgresses", revProgresses);
            revProgresses = null;
            document.getElementById("ap-chat-area").classList.add("disabled")
            connectionStatus.innerHTML = ""
            shortStatus.innerHTML = "Not connected"

            const inputs = document.getElementById("ap-connect-form").elements
            for (const input of inputs) { input.removeAttribute("disabled"); };
            document.getElementById("ap-connect-form").classList.remove("disabled")
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
function setInStorage(key, value) {
    // archipelago.js remembers last room and player even after a DC,
    // so we can still save data after disconnecting and not before
    if (!client.room.seedName || !client.name) return;

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
    for (const mod of mods) {
        revProgresses[mod] = revProgresses[mod] || 0;
        revProgresses[mod] += finalScore;
    }

    const { comboName, comboNum } = getComboAndNum(mods);
    if (!comboName) {
        relockCards();
        console.log(`${TAP} No combo found for mods ${mods}`);
        return;
    }

    const floor = getFloor(finalScore);
    console.log(`${TAP} Combo: ${comboName} (num ${comboNum}), Floor: ${floor}`)

    let checked = false;
    for (let i = 2; i <= floor; i++) {
        const checkID = i + (comboNum * 100);
        if (client.room.checkedLocations.includes(checkID)) {
            console.log(`${TAP} Already found check ${checkID}`)
            continue;
        }

        const itemData = await client.scout([checkID], 0);
        const item = itemData[0];
        // since the client (currently) does not know which settings were used,
        // scouting the check may yield nothing depending on the YAML settings
        if (!item) {
            console.log(`${TAP} No item found at check ${checkID}`)
            continue;
        }
        checked = true;

        let notifText = `Sent ${item.name} to ${item.receiver}! (${item.locationName})`;
        if (item.receiver == client.name) {
            notifText = `Found your ${item.name}! (${item.locationName})`
            expectedChecks.push(checkID);
        }

        let notifSettings = { color: "#888888", backgroundColor: "#060606dd", timeout: 5000 };
        if (item.filler) notifSettings.color = "#01d2d3";
        if (item.useful) notifSettings.color = "#6d8be8";
        if (item.progression) {
            notifSettings = { color: "#ae98ee", backgroundColor: "#38314dc7", timeout: 12000 };
        }
        if (item.trap) notifSettings.color = "#fa8072";
        createAPNotification(notifText, notifSettings);

        await client.check(checkID);
    }

    // checks will relock cards as it counts as receiving an item
    if (!checked) relockCards();
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
            (revProgresses[reverse] || 0) >= yamlOptions.reverse_height
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

client.messages.on("message", (content) => {
    const chatMessages = document.getElementById("ap-chat-messages")
    const messageElement = document.createElement("p")

    // TODO fix newlines, and prevent other tags
    messageElement.innerHTML = content
    messageElement.classList.add("ap-chat-message")
    chatMessages.appendChild(messageElement)
})

client.items.on("itemsReceived", async (items) => {
    const lastIndex = getFromStorage("lastSeenItemIndex") || 0;
    if (expectLoginChecks) {
        items = items.slice(lastIndex);
    }
    setInStorage("lastSeenItemIndex", items.length + lastIndex);

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

    if (!items.some(item => item.name === "Achievement")) return;

    // check for wincon
    const selfStatus = await client.players.self.fetchStatus()
    if (selfStatus === clientStatuses.goal) return; // already won

    let aches = 0;
    for (const item of client.items.received) {
        if (item.name === "Achievement") aches++;
    }
    console.log(`${TAP} Achievements found: ${aches}/${yamlOptions.goal_count}`)

    if (aches >= yamlOptions.goal_count) {
        client.updateStatus(clientStatuses.goal);
        createAPNotification(`you've reached your goal of ${yamlOptions.goal_count} achievements!`, 
            { color: "linear-gradient(90deg, #fc4444 0%, #fafa48 20%, #80ff4a 40%, #29d1ff 60%, #8f26ff 80%, #fc49e2 100%)", 
                backgroundColor: "#2c4d4dc7", timeout: 30000, gradient: true }
        );
    }
})

client.socket.on("connected", (packet) => {
    yamlOptions = packet.slot_data;
    console.log(`${TAP} Connected to AP server! ${JSON.stringify(yamlOptions)}`)
})
})()