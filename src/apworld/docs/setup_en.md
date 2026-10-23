# TETR.AP Setup

## Required Software

- The [Archipelago Launcher](https://github.com/ArchipelagoMW/Archipelago/releases).
- A web browser of your choice.
- The latest TETR.IO APWorld, as well as the `client.min.js`, which you can download from [the releases page](https://github.com/MonkeysWithPie/TETR.AP/releases/latest).

## Installation

> [!Caution]
> **DO NOT** report bugs to osk whilst using the TETR.AP client!! Issues should be reported to this GitHub repository instead, or replicated without the mod. Posting issues in the TETR.IO discord with the TETR.AP client installed will likely get you banned.  
> This mod is also not endorced by osk. While it does not modify gameplay at all, it does not have express permission to be used. Use with caution.

### Browser

1. Open the `client.min.js` file, and copy its contents.
2. Open your browser of choice and create a bookmark.
3. Type "javascript:" into the URL section of the bookmark and then paste the contents of the client file.  
It should look something like this: `javascript:!async function(){"use strict";const e="[TETR.AP]",...`
4. Save the bookmark. The name of it doesn't matter.
5. Open TETR.IO.
6. Click the bookmark you just created while staying in the TETR.IO tab. A menu should appear in the top right.

> [!Note]
> If the menu does not appear after clicking the bookmark, your browser may not support bookmarklets. To test this, you can try replacing the URL section with `javascript:alert("this browser supports bookmarklets!")`, and then running it again. If you don't get a prompt, your browser won't be able to use the TETR.AP client. If you do get a prompt, there is an issue with the client.

### TETR.IO Desktop

> [!Note]
> The TETR.IO Desktop version of this project is currently WIP! If you want a temporary solution, check out [erzahoq's PR](https://github.com/MonkeysWithPie/TETR.AP/pull/1).

## World Options

1. Open the Archipelago Launcher.
2. Open the "Install APWorld" option within the Archipelago Launcher and select the APWorld you just downloaded. (On Windows, you can also open the APWorld to install it.)
3. Open the "Options Creator" in the Launcher and find the TETR.IO entry.
4. Create your options as you like. Option descriptions can be seen by hovering the option name. Ensure the "Highest Floor Discovered" and "Reverse Mods Unlocked" options are accurate.
5. Press export options.

## Game Creation

See also: [Archipelago Setup Tutorial](https://archipelago.gg/tutorial/Archipelago/setup_en#generating-a-game)

1. Open the Archipelago Launcher.
2. Open the "Install APWorld" option within the Archipelago Launcher and select the APWorld you just downloaded. (On Windows, you can also open the APWorld to install it.)
3. Scroll down to the bottom and open "Browse Files" in the Launcher.
4. Open the Players folder and place all the .yaml files you wish to use in the folder (NOT the Templates folder).
5. Go back to the Archipelago Launcher and open "Generate". It may take a while to generate, depending on how many games you have.
6. In the same folder where the "Players" folder was, there will now be an "output" folder.  
You can either host the room yourself (which this guide won't cover) or [host it via the Archipelago website](https://archipelago.gg/uploads).

## Joining a Game

1. Open the TETR.AP client.
2. Type the URL, slot name, and password (if you were given one) into the slots. If the URL has a port, add a colon to the end of it and type the port there (e.g. "archipelago.gg:12345").
3. Click connect.
4. You can begin playing Quick Play 2.
