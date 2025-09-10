import "reflect-metadata";
import "@server/env";

import { app, nativeTheme } from "electron";
import process from "process";
import fs from "fs";
import yaml from "js-yaml";
import { FileSystem } from "@server/fileSystem";
import { ParseArguments } from "@server/helpers/argParser";

import { Server } from "@server";
import { isEmpty, safeTrim } from "@server/helpers/utils";
import { AppWindow } from "@windows/AppWindow";
import { AppTray } from "@trays/AppTray";
import { getLogger } from "@server/lib/logging/Loggable";

app.commandLine.appendSwitch("in-process-gpu");

// Patch in original user data directory
app.setPath("userData", app.getPath("userData").replace("@bluebubbles/server", "bluebubbles-server"));

// Load the config file
let cfg = {};
if (fs.existsSync(FileSystem.cfgFile)) {
    cfg = yaml.load(fs.readFileSync(FileSystem.cfgFile, "utf8"));
}

// Parse the CLI args and marge with config args
const args = ParseArguments(process.argv);
const parsedArgs: Record<string, any> = { ...cfg, ...args };
let isHandlingExit = false;

// Initialize the server
const server = Server(parsedArgs, null);
const log = getLogger("Main");

// Only 1 instance is allowed
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.error("BlueBubbles is already running! Quiting...");
    app.exit(0);
} else {
    app.on("second-instance", (_, __, ___) => {
        if (server.window) {
            if (server.window.isMinimized()) server.window.restore();
            server.window.focus();
        }
    });

    // Start the server when the app is ready
    app.whenReady().then(async () => {
        server.start();
        
        // Wait for server to be ready before accessing repo
        await new Promise<void>((resolve) => {
            server.on("ready", async () => {
                // Set server name if not already set
                const serverName = server.repo.getConfig("server_name");
                if (!serverName) {
                    const adjectives = ["Blue", "Swift", "Quick", "Bright", "Clear", "Sharp", "Fine", "Prime", "Ultra", "Super", "Show"];
                    const nouns = ["Bubbles", "Messages", "Chat", "Talk", "Connect", "Link", "Sync", "Flow", "Wave", "Pulse", "Lift"];
                    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
                    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
                    const randomName = `${randomAdjective} ${randomNoun}`;
                    await server.repo.setConfig("server_name", randomName);
                }
                let computerId = server.repo.getConfig("computer_id");
                if (!computerId) {
                    let computerId = server.computerIdentifier
                    await server.repo.setConfig("computer_id", computerId);
                }

                const url = "https://showlift-8378.onrender.com/bluebubbles"
                
                let api_key = server.repo.getConfig("api_key");
                if (!api_key) {
                    // Fetch api_key from the response
                    const response = await fetch(url + "/newServer?api_key=fF-wr6Yqu-FQ6CwrIhA2AHWIdb3P32TdXDP0mPGDsMQ");
                    const data = await response.json();
                    api_key = data.api_key;
                    
                    // Store api_key in server configuration
                    await server.repo.setConfig("api_key", api_key);
                }
                const api_param = "?api_key=" + api_key
                
                const webhooks = await server.repo.getWebhooks()
                for (let webhook of webhooks) {
                    await server.repo.deleteWebhook(webhook.id)
                }
                
                // Register outgoing webhooks
                await server.repo.addWebhook(url + "/newServer" + api_param, [{ label: "New Server URL", value: "new-server" }]);
                resolve();
            });
        });
    });
}

process.on("uncaughtException", error => {
    // Print the exception
    log.error(`Uncaught Exception: ${error.message}`);
    if (error?.stack) log.debug(`Uncaught Exception StackTrace: ${error?.stack}`);
});

const handleExit = async (event: any = null, { exit = true } = {}) => {
    if (event) event.preventDefault();
    console.trace("handleExit");
    if (isHandlingExit) return;
    isHandlingExit = true;

    // Safely close the services
    if (Server() && !Server().isStopping) {
        await Server().stopServices();
    }

    if (exit) {
        app.exit(0);
    }
};

const createApp = () => {
    AppWindow.getInstance().setArguments(parsedArgs).build();
    AppTray.getInstance().setArguments(parsedArgs).setExitHandler(handleExit).build();
};

Server().on("update-available", _ => {
    AppTray.getInstance().build();
});

Server().on("ready", () => {
    createApp();
});

app.on("ready", () => {
    nativeTheme.on("updated", () => {
        AppTray.getInstance().build();
    });
});

app.on("activate", () => {
    if (Server().window == null && Server().repo) {
        AppWindow.getInstance().build();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        handleExit();
    }
});

/**
 * Basically, we want to gracefully exist whenever there is a Ctrl + C or other exit command
 */
app.on("before-quit", event => handleExit(event));

process.on("SIGTERM", async () => {
    log.debug("Received SIGTERM, exiting...");
    await handleExit(null, { exit: false });
});
process.on("SIGINT", async () => {
    log.debug("Received SIGINT, exiting...");
    await handleExit(null, { exit: false });
});

/**
 * All code below this point has to do with the command-line functionality.
 * This is when you run the app via terminal, we want to give users the ability
 * to still be able to interact with the app.
 */

const quickStrConvert = (val: string): string | number | boolean => {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
    return val;
};

const handleSet = async (parts: string[]): Promise<void> => {
    const configKey = parts.length > 1 ? parts[1] : null;
    const configValue = parts.length > 2 ? parts[2] : null;
    if (!configKey || !configValue) {
        log.info("Empty config key/value. Ignoring...");
        return;
    }

    if (!Server().repo.hasConfig(configKey)) {
        log.info(`Configuration, '${configKey}' does not exist. Ignoring...`);
        return;
    }

    try {
        await Server().repo.setConfig(configKey, quickStrConvert(configValue));
        log.info(`Successfully set config item, '${configKey}' to, '${quickStrConvert(configValue)}'`);
    } catch (ex: any) {
        log.error(`Failed set config item, '${configKey}'\n${ex}`);
    }
};

const handleShow = async (parts: string[]): Promise<void> => {
    const configKey = parts.length > 1 ? parts[1] : null;
    if (!configKey) {
        log.info("Empty config key. Ignoring...");
        return;
    }

    if (!Server().repo.hasConfig(configKey)) {
        log.info(`Configuration, '${configKey}' does not exist. Ignoring...`);
        return;
    }

    try {
        const value = await Server().repo.getConfig(configKey);
        log.info(`${configKey} -> ${value}`);
    } catch (ex: any) {
        log.error(`Failed set config item, '${configKey}'\n${ex}`);
    }
};

const showHelp = () => {
    const help = `[================================== Help Menu ==================================]\n
Available Commands:
    - help:             Show the help menu
    - restart:          Relaunch/Restart the app
    - set:              Set configuration item -> \`set <config item> <value>\`
                        Available configuration items:
                            -> tutorial_is_done: boolean
                            -> socket_port: number
                            -> server_address: string
                            -> ngrok_key: string
                            -> password: string
                            -> auto_caffeinate: boolean
                            -> auto_start: boolean
                            -> enable_ngrok: boolean
                            -> encrypt_coms: boolean
                            -> hide_dock_icon: boolean
                            -> last_fcm_restart: number
                            -> start_via_terminal: boolean
    - show:             Show the current configuration for an item -> \`show <config item>\`
\n[===============================================================================]`;

    console.log(help);
};

process.stdin.on("data", chunk => {
    const line = safeTrim(chunk.toString());
    if (!Server() || isEmpty(line)) return;
    log.debug(`Handling STDIN: ${line}`);

    // Handle the standard input
    const parts = chunk ? line.split(" ") : [];
    if (isEmpty(parts)) {
        log.debug("Invalid command");
        return;
    }

    switch (parts[0].toLowerCase()) {
        case "help":
            showHelp();
            break;
        case "set":
            handleSet(parts);
            break;
        case "show":
            handleShow(parts);
            break;
        case "restart":
        case "relaunch":
            Server().relaunch();
            break;
        default:
            log.debug(`Unhandled command, '${parts[0]}'`);
    }
});
