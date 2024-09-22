import definePlugin from "@utils/types";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { NavContextMenuPatchCallback, findGroupChildrenByChildId } from "@api/ContextMenu";
import { Message } from "discord-types/general";
import { Menu } from "@webpack/common";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";

// Declare a global variable to store the recent message
let recentMessage: Message;

const messagePatch: NavContextMenuPatchCallback = (children, { message }) => {
    // Store the current message
    recentMessage = message;

    // Check if the message has image attachments
    const imageAttachments = message.attachments?.filter(attachment => attachment.content_type?.startsWith('image/'));
    if (!imageAttachments || imageAttachments.length === 0) return;

    // Find the group in the context menu where the new option should be added
    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    // Insert the "OCR" button for images in the context menu
    group.splice(
        group.findIndex(c => c?.props?.id === "copy-text") + 1,
        0,
        <Menu.MenuItem
            id="vc-bsb"
            label="SpeechBubble"
            icon={QuoteIcon}
            action={async () => {
                for (const attachment of imageAttachments) {
                    const imageUrl = attachment.url;

                    // Create an image with a speech bubble for each image
                    try {
                        const bubbleImage = await createImageWithBubble(imageUrl);

                        // Download the image with the bubble
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(bubbleImage);
                        link.download = `quote-${recentMessage.author.username}.png`;
                        link.click();
                    } catch (error) {
                        console.error(`Failed to create bubble image: ${error.message}`);
                    }
                }
            }}
        />
    );
};

export default definePlugin({
    name: "BetterSpeechbubble",
    description: "Adds a transparent speech bubble on top of the image in messages",
    authors: [Devs.Chaos],
    contextMenus: {
        message: messagePatch,
    },
    commands: [
        {
            name: "speechbubble",
            description: "Generates an image with a speech bubble on top",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "image",
                    description: "Image to add speech bubble to",
                    type: ApplicationCommandOptionType.ATTACHMENT,
                    required: true,
                },
            ],
            execute: async (opts, cmdCtx) => {
                const imageOption = findOption(opts, "image");
                if (!imageOption?.attachment?.url) {
                    return sendMessage(cmdCtx.channel.id, { content: "No valid image provided." });
                }

                const imageUrl = imageOption.attachment.url;
                try {
                    const bubbleImage = await createImageWithBubble(imageUrl);
                    const link = URL.createObjectURL(bubbleImage);

                    // Send the image with bubble back in chat
                    await sendMessage(cmdCtx.channel.id, { file: { name: "quote.png", value: bubbleImage } });
                } catch (error) {
                    console.error(`Failed to create bubble image: ${error.message}`);
                    await sendMessage(cmdCtx.channel.id, { content: "Failed to create bubble image." });
                }
            },
        },
    ],
});

// Function to add a transparent speech bubble on top of an image
async function createImageWithBubble(imageUrl: string): Promise<Blob> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Cannot get 2D rendering context.");

    // Load and draw the original image
    const imageBlob = await fetchImageAsBlob(imageUrl);
    const image = new Image();
    await new Promise<void>(resolve => {
        image.onload = () => resolve();
        image.src = URL.createObjectURL(imageBlob);
    });

    // Set canvas size to match the image
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw the original image
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // Load the speech bubble
    const bubble = new Image();
    const bubbleUrl = "https://example.com/transparent-speech-bubble.png";  // Replace with actual URL
    await new Promise<void>(resolve => {
        bubble.onload = () => resolve();
        bubble.src = bubbleUrl;
    });

    // Define where the bubble will be drawn
    const bubbleHeight = image.height * 0.2;  // Scale the bubble size based on the image height
    const bubbleWidth = image.width * 0.5;
    const bubbleX = image.width * 0.25;
    const bubbleY = 20;

    // Draw the speech bubble
    ctx.drawImage(bubble, bubbleX, bubbleY, bubbleWidth, bubbleHeight);

    // Make the interior of the speech bubble transparent
    // Assuming the speech bubble image has a specific "interior" where you want to clear it out
    // Define coordinates and dimensions of the interior
    const interiorX = bubbleX + (bubbleWidth * 0.1);  // Offset a bit from the left edge of the bubble
    const interiorY = bubbleY + (bubbleHeight * 0.3); // Offset a bit from the top
    const interiorWidth = bubbleWidth * 0.8;          // Width of the clear area inside the bubble
    const interiorHeight = bubbleHeight * 0.5;        // Height of the clear area

    // Set the global composite operation to "destination-out" to make the interior transparent
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(interiorX, interiorY, interiorWidth, interiorHeight);

    // Reset the composite operation to default
    ctx.globalCompositeOperation = "source-over";

    // Convert canvas to Blob and return
    return await canvasToBlob(canvas);
}


// Utility function to fetch image as Blob
async function fetchImageAsBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    return response.blob();
}

// Icon for the context menu button
export function QuoteIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path
                d="M21 3C21.5523 3 22 3.44772 22 4V18C22 18.5523 21.5523 19 21 19H6.455L2 22.5V4C2 3.44772 2.44772 3 3 3H21ZM20 5H4V18.385L5.76333 17H20V5ZM10.5153 7.4116L10.9616 8.1004C9.29402 9.0027 9.32317 10.4519 9.32317 10.7645C9.47827 10.7431 9.64107 10.7403 9.80236 10.7553C10.7045 10.8389 11.4156 11.5795 11.4156 12.5C11.4156 13.4665 10.6321 14.25 9.66558 14.25C9.12905 14.25 8.61598 14.0048 8.29171 13.6605C7.77658 13.1137 7.5 12.5 7.5 11.5052C7.5 9.75543 8.72825 8.18684 10.5153 7.4116ZM15.5153 7.4116L15.9616 8.1004C14.294 9.0027 14.3232 10.4519 14.3232 10.7645C14.4783 10.7431 14.6411 10.7403 14.8024 10.7553C15.7045 10.8389 16.4156 11.5795 16.4156 12.5C16.4156 13.4665 15.6321 14.25 14.6656 14.25C14.129 14.25 13.616 14.0048 13.2917 13.6605C12.7766 13.1137 12.5 12.5 12.5 11.5052C12.5 9.75543 13.7283 8.18684 15.5153 7.4116Z"
                fill="currentColor"
            />
        </svg>
    );
}

// Utility function to convert canvas to Blob
async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("Canvas conversion to Blob failed"));
            }
        }, "image/png");
    });
}
