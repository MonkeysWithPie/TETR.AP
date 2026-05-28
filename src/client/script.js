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

            client.login(inputs["server"].value, inputs["slot"].value, "" /*game name*/, { password: inputs["password"].value })
                .then(() => {
                    document.getElementById("ap-chat-area").classList.remove("disabled")
                    document.getElementById("ap-chat-messages").innerHTML = ""
                    document.getElementById("ap-connect-form").classList.add("disabled")
                    connectionStatus.innerHTML = `Connected as ${inputs["slot"].value}!`
                    shortStatus.innerHTML = `Connected as ${inputs["slot"].value}`
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

async function waitForZenithFinish() {
    waitUntil(() => {
        return !document.getElementById("zenithmenu").classList.contains("rolledup")
            && document.getElementById("menus").getAttribute("data-menu-type") === "zenith"
            && document.getElementById("zenithmenu").classList.contains("inresults");
    }, () => {
        const finalScore = Number(document.getElementById("zenith_result").innerText.replace("M","").trim());
        const modImages = document.getElementById("zenith_result").getElementsByClassName("mods")[0].children;
        const mods = [];
        for (const img of modImages) {
            mods.push(img.title);
        }
        console.log(`${TAP} Zenith run finished! ${finalScore}m, mods: ${mods}`)

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

    if (cardDiv.classList.contains("floorlocked") && !cardDiv.getAttribute("ap-locked") && false) {
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
        
        setTarotCardLocked("nohold", true);
        waitForZenithFinish();
    }
)


const client = new Client();

client.messages.on("message", (content) => {
    const chatMessages = document.getElementById("ap-chat-messages")
    const messageElement = document.createElement("p")
    messageElement.innerHTML = content
    messageElement.classList.add("chat-message")
    chatMessages.appendChild(messageElement)
})
})()