import { Server } from "@server";
import { Loggable } from "@server/lib/logging/Loggable";
import { AsyncSingleton } from "@server/lib/decorators/AsyncSingletonDecorator";
import { AsyncRetryer } from "@server/lib/decorators/AsyncRetryerDecorator";
import axios from "axios";

/**
 * This service manages the connection to the Showlift server.
 * It is used to set the server URL and receive an API key.
 */
export class ShowliftService extends Loggable {
    tag = "ShowliftService";

    hasInitialized = false;

    api_key: string = 'Wc_ZhTgyX1ZwNWeiQ8cxDAoxfnkvbKJ-s94UwmD8y9c';

    /**
     * Starts the service (no-op for now)
     */
    async start({ initializeOnly = false } = {}): Promise<boolean> {
        this.hasInitialized = true;
        return true;
    }

    /**
     * Base URL for the Showlift API
     */
    private readonly baseUrl = "http://10.0.0.148:8000";

    /**
     * Sets the server URL in the Showlift database
     *
     * @param force Whether to force the update even if the URL hasn't changed
     */
    @AsyncSingleton("ShowliftService.setServerUrl")
    @AsyncRetryer({
        name: "ShowliftService.setServerUrl",
        maxTries: 2000,
        retryDelay: 60000,
        onSuccess: (_data: any) => true
    })
    async setServerUrl(force = false): Promise<void> {
        // Get the server address from the config
        const serverAddress = Server().repo.getConfig("server_address") as string;
        const serverName = Server().repo.getConfig("server_name") as string;
        const computerId = Server().repo.getConfig("computer_id") as string;

        // If no server address, do nothing
        if (!serverAddress) {
            this.log.debug("No server address configured, skipping Showlift URL update");
            return;
        }

        // Prepare the request payload
        const payload = {
            url: serverAddress,
            server_name: serverName,
            computer_id: computerId
        };

        this.log.debug(`Attempting to update Showlift server URL to ${serverAddress}...`);

        try {
            // Make the POST request to the Showlift server
            const response = await axios.post(`${this.baseUrl}/v1/bluebubbles/newServer?api_key=${this.api_key}`, payload);

            // Extract the API key from the response
            const apiKey = response.data?.api_key;
            if (apiKey) {
                // Save the API key to the server config
                this.api_key = apiKey;
                this.log.info("Successfully updated Showlift server URL and received API key");
            } else {
                this.log.warn("Showlift server URL updated but no API key returned");
            }
        } catch (ex: any) {
            this.log.error(`Failed to update Showlift server URL. Error: ${ex?.message}`);
            throw ex;
        }
    }
}
