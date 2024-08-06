import { Devs } from "@utils/constants";
import { ApplicationCommandInputType } from "@api/Commands";
import definePlugin from "@utils/types";
import { rebuildAndRestart } from "@utils/Rebuild";

export default definePlugin({
    name: "Rebuild and restart",
    description: "Rebuilds and restarts the client with a command",
    authors: [Devs.Chaos],
    commands: [
        {
            name: "Rebuild and restart (rbars)",
            description: "Rebuilds the client",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute(args, ctx) {
                rebuildAndRestart();
            },
        },
        {
            name: "Restart",
            description: "Restarts the client",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute(args, ctx) {
                window.DiscordNative.app.relaunch()
            },
        },
        {
            name: "Rebuild",
            description: "Rebuilds Vencord",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute(args, ctx) {
                VencordNative.updater.rebuild()
            },
        }
    ],
    toolboxActions: {
        "Rebuild and restart"() {
            rebuildAndRestart()
        },
        "Rebuild"(){
            VencordNative.updater.rebuild()
        },
        "Restart"(){
            window.DiscordNative.app.relaunch()
    },
    }})
