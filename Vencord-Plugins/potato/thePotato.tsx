//remember to rename this to index.tsx and have the css file in the same folder

import definePlugin, {OptionType} from "@utils/types";
import { Logger } from "@utils/Logger";
import { definePluginSettings } from "@api/Settings";
import "./style.css"

const theSound: string = "https://raw.githubusercontent.com/ChaosShadowGod/TheCookie/main/potato/scream.mp3"
const cachedAudios: { [key: string]: HTMLAudioElement; } = {};
const logger = new Logger("potato");
const settings = definePluginSettings({
    Click_to_remove: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Click to remove the potato",
        restartNeeded: true
    },
    TimeoutRemove: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Remove potato after a certain amount of time automatically",
        restartNeeded: true
    },
    image: {
        description: "The image",
        type: OptionType.STRING,
        default: "https://raw.githubusercontent.com/ChaosShadowGod/TheCookie/main/potato.svg",
        restartNeeded: true
    }
});

function load() {
    var r = document.querySelector('.potato') as HTMLElement;
    if (r) {
        r.style.setProperty('--potato-background-url', settings.store.image);
    }
}

function playSound(url: string) {
    if (cachedAudios[url]) {
        cachedAudios[url].currentTime = 0;
        cachedAudios[url].play();
        return;
    }
    var a = new Audio(url);
    a.play();
    cachedAudios[url] = a;
}

function callpotato() {
    var potato = document.createElement("div");
    potato.classList.add("potato");
    potato.style.left = `${window.innerWidth + 450}px`;
    potato.style.top = `${window.innerHeight + 200}px`;

    if (settings.store.Click_to_remove) {
        potato.addEventListener("click", (ev: any) => {
            if (potato.parentNode) potato.parentNode.removeChild(potato);
        });
    }

    document.body.appendChild(potato);
    playSound(theSound);

    if (settings.store.TimeoutRemove) {
        setTimeout(() => {
            if (potato.parentNode) potato.parentNode.removeChild(potato);
        }, 5000); // 5000 milliseconds = 5 seconds
    }

    return "ALL HAIL THE POTATO";
}


export default definePlugin({
    name: "Potato",
    authors: [

    ],
    description: "what the fuck am i doing with my life",
    dependencies: ["CommandsAPI"],
    settings,
    start: () => {
        load
    },
    commands: [{
        name: "potato",
        description: "P O T A T O",
        execute: opts => ({
            content: callpotato()
        })
    }]
});



