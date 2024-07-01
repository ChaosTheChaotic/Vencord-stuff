//This requires your own api key from ocr.space

import definePlugin from "@utils/types";
import { sendBotMessage, ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { sendMessage } from "@utils/discord";
import { Devs } from "@utils/constants";
import { addContextMenuPatch, NavContextMenuPatchCallback, findGroupChildrenByChildId } from "@api/ContextMenu";
import { Message } from "discord-types/general";
import { Menu } from "@webpack/common";
import { SelectedChannelStore, UserStore } from "@webpack/common";
import { findByPropsLazy } from "@webpack";
import { DraftType, UploadManager, UploadHandler } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

let recentmessage: Message;

const messagePatch: NavContextMenuPatchCallback = (children, { message }) => {
    recentmessage = message;
    if (!message.attachments || message.attachments.length === 0) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(
        group.findIndex(c => c?.props?.id === "copy-text") + 1,
        0,
        <Menu.MenuItem
            id="vc-ocr"
            label="OCR"
            icon={QuoteIcon}
            action={async () => {
                const attachments = recentmessage.attachments;
                for (const attachment of attachments) {
                    const ocrResult = await ocr(attachment.url, settings.store.engine);
                    sendBotMessage(
                        recentmessage.channel_id,
                        {
                            content: `**OCR Result for ${attachment.filename}:**\n${ocrResult}`
                        }
                    );
                }
            }}
        />
    );
};

export function QuoteIcon({
    height = 24,
    width = 24,
    className
}: {
    height?: number;
    width?: number;
    className?: string;
}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path
                d="M21 3C21.5523 3 22 3.44772 22 4V18C22 18.5523 21.5523 19 21 19H6.455L2 22.5V4C2 3.44772 2.44772 3 3 3H21ZM20 5H4V18.385L5.76333 17H20V5ZM10.5153 7.4116L10.9616 8.1004C9.29402 9.0027 9.32317 10.4519 9.32317 10.7645C9.47827 10.7431 9.64107 10.7403 9.80236 10.7553C10.7045 10.8389 11.4156 11.5795 11.4156 12.5C11.4156 13.4665 10.6321 14.25 9.66558 14.25C9.12905 14.25 8.61598 14.0048 8.29171 13.6605C7.77658 13.1137 7.5 12.5 7.5 11.5052C7.5 9.75543 8.72825 8.18684 10.5153 7.4116ZM15.5153 7.4116L15.9616 8.1004C14.294 9.0027 14.3232 10.4519 14.3232 10.7645C14.4783 10.7431 14.6411 10.7403 14.8024 10.7553C15.7045 10.8389 16.4156 11.5795 16.4156 12.5C16.4156 13.4665 15.6321 14.25 14.6656 14.25C14.1291 14.25 13.616 14.0048 13.2917 13.6605C12.7766 13.1137 12.5 12.5 12.5 11.5052C12.5 9.75543 13.7283 8.18684 15.5153 7.4116Z"
            ></path>
        </svg>
    );
}

async function ocr(imageLink, engine) {
    const apiKey = 'PUT YOUR API KEY HERE';
    const apiUrl = 'https://api.ocr.space/parse/image';

    const formData = new FormData();
    formData.append('url', imageLink);
    formData.append('apikey', apiKey);
    formData.append("OCREngine", engine);

    const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
        return `Error: ${data.ErrorMessage[0]}`;
    } else {
        return data.ParsedResults[0].ParsedText;
    }
}

async function resolveImage(options, ctx) {
    const UploadStore = findByPropsLazy("getUploads");
    for (const opt of options) {
        switch (opt.name) {
            case "image":
                const upload = UploadStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
                if (upload) {
                    if (!upload.isImage) {
                        UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                        throw "Upload is not an image";
                    }
                    return upload.item.file;
                }
                break;
            case "url":
                return opt.value;
            case "user":
                try {
                    const user = await UserStore.getUser(opt.value);
                    return user.getAvatarURL(ctx.guild?.id, 2048).replace(/\?size=\d+$/, "?size=2048");
                } catch (err) {
                    console.error("[ocr] Failed to fetch user\n", err);
                    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                    throw "Failed to fetch user. Check the console for more info.";
                }
        }
    }
    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
    return null;
}

export const settings = definePluginSettings({
    engine: {
        type: OptionType.NUMBER,
        description: "which engine",
        restartNeeded: true,
        default: 1
    },
})

export default definePlugin({
    name: "ocr",
    description: "Uses OCR to extract text from images",
    authors: [Devs.Chaos],
    dependencies: ["CommandsAPI"],
    contextMenus: {
        "message": messagePatch
    },
    settings,
    commands: [{
        name: "ocr",
        description: "Uses OCR to extract text from images",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "image",
                description: "Image attachment to use",
                type: ApplicationCommandOptionType.ATTACHMENT,
                required: true
            },
            {
                name: "send",
                description: "Send as bot message",
                type: ApplicationCommandOptionType.BOOLEAN,
                required: false
            },
            {
                name: "engine",
                description: "OCR engine to use only 1 or 2 work",
                type: ApplicationCommandOptionType.INTEGER,
                required: false
            }
        ],
        execute: async (opts, cmdCtx) => {
            const channel = SelectedChannelStore.getChannelId();
            try {
                var image = await resolveImage(opts, cmdCtx);
                if (!image) throw "No Image specified!";
            } catch (err) {
                UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                sendBotMessage(cmdCtx.channel.id, {
                    content: String(err),
                });
                return;
            }
            const engine = findOption(opts, "engine", 1);
            const ocrResult = await ocr(image.url || image, engine);

            const send = findOption(opts, "send", false);
            if (!send) {
                sendBotMessage(channel, {
                    content: `**OCR Result:**\n${ocrResult}`
                });
            } else {
                sendMessage(channel, {
                    content: `**OCR Result:**\n${ocrResult}`
                });
            }
        }
    }]
});
