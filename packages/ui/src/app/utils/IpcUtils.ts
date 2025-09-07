import { ScheduledMessageItem } from 'app/components/tables/ScheduledMessagesTable';
import { MultiSelectValue } from '../types';
import { showErrorToast, showSuccessToast } from './ToastUtils';

// Conditionally import ipcRenderer only in Electron environment
const ipcRenderer = (() => {
    try {
        return window.require ? window.require('electron').ipcRenderer : null;
    } catch (e) {
        return null;
    }
})();

// Helper function to handle IPC calls with fallbacks for browser environment
const safeIpcInvoke = async (channel: string, ...args: any[]): Promise<any> => {
    if (ipcRenderer) {
        return await ipcRenderer.invoke(channel, ...args);
    }
    // Return mock data or null for browser environment
    console.warn(`IPC call '${channel}' not available in browser environment`);
    return null;
};

export const getConfig = async () => {
    return await safeIpcInvoke('get-config');
};

export type FcmConfig = {
    fcm_client: string;
    fcm_server: string
};

export const getFcmConfig = async (): Promise<FcmConfig> => {
    const client = await safeIpcInvoke('get-fcm-client');
    const server = await safeIpcInvoke('get-fcm-server');
    return {
        fcm_client: client,
        fcm_server: server
    };
};

export const getEnv = async () => {
    return await safeIpcInvoke('get-env');
};

export const getDevices = async () => {
    return await safeIpcInvoke('get-devices');
};

export const getAlerts = async () => {
    return await safeIpcInvoke('get-alerts');
};

export const openLogLocation = async () => {
    return await safeIpcInvoke('open-log-location');
};

export const openAppLocation = async () => {
    return await safeIpcInvoke('open-app-location');
};

export const restartViaTerminal = async () => {
    return await safeIpcInvoke('restart-via-terminal');
};

export const restartServices = async () => {
    return await safeIpcInvoke('hot-restart');
};

export const fullRestart = async () => {
    return await safeIpcInvoke('full-restart');
};

export const clearDevices = async () => {
    return await safeIpcInvoke('purge-devices');
};

export const clearEventCache = async () => {
    return await safeIpcInvoke('purge-event-cache');
};

export const getPrivateApiRequirements = async () => {
    return await safeIpcInvoke('get-private-api-requirements');
};

export const checkPermissions = async () => {
    return await safeIpcInvoke('check-permissions');
};

export const getWebhooks = async () => {
    return await safeIpcInvoke('get-webhooks');
};

export const createWebhook = async (payload: { url: string, events: Array<MultiSelectValue> }) => {
    return await safeIpcInvoke('create-webhook', payload);
};

export const deleteWebhook = async ({ url = null, id = null }: { url?: string | null, id?: number | null }) => {
    return await safeIpcInvoke('delete-webhook', { url, id });
};

export const updateWebhook = async ({ id, url, events }: { id: number, url?: string, events?: Array<MultiSelectValue> }) => {
    return await safeIpcInvoke('update-webhook', { id, url, events });
};

export const reinstallHelperBundle = async () => {
    const res = await safeIpcInvoke('reinstall-helper-bundle');
    if (res?.success) {
        showSuccessToast({
            id: 'settings',
            description: res.message
        });
    } else if (res) {
        showErrorToast({
            id: 'settings',
            description: res.message
        });
    }
};

export const syncInvokeIpc = async (event: string, data: any = null): Promise<any> => {
    return await safeIpcInvoke(event, data);
};

export const openFullDiskPrefs = async () => {
    return await safeIpcInvoke('open-fulldisk-preferences');
};

export const openAccessibilityPrefs = async () => {
    return await safeIpcInvoke('open-accessibility-preferences');
};

export const getPrivateApiStatus = async () => {
    return await safeIpcInvoke('get-private-api-status');
};

export const getAttachmentCacheInfo = async () => {
    return await safeIpcInvoke('get-attachment-cache-info');
};

export const clearAttachmentCache = async () => {
    return await safeIpcInvoke('clear-attachment-caches');
};

export const deleteScheduledMessage = async (id: number) => {
    return await safeIpcInvoke('delete-scheduled-message', id);
};

export const deleteScheduledMessages = async () => {
    return await safeIpcInvoke('delete-scheduled-messages');
};

export const createScheduledMessage = async (message: ScheduledMessageItem) => {
    return await safeIpcInvoke('create-scheduled-message', message);
};

export const getBinaryPath = async () => {
    return await safeIpcInvoke('get-binary-path');
};

export const installUpdate = async () => {
    return await safeIpcInvoke('install-update');
};

export const getFirebaseOauthUrl = async () => {
    return await safeIpcInvoke('get-firebase-oauth-url');
};

export const getContactsOauthUrl = async () => {
    return await safeIpcInvoke('get-contacts-oauth-url');
};

export const restartOauthService = async () => {
    return await safeIpcInvoke('restart-oauth-service');
};

export const getCurrentPermissions = async () => {
    return await safeIpcInvoke('get-current-permissions');
};

export const saveLanUrl = async () => {
    return await safeIpcInvoke('save-lan-url');
};

export const registerZrokEmail = async (email: string) => {
    return await safeIpcInvoke('register-zrok-email', email);
};

export const setZrokToken = async (token: string) => {
    return await safeIpcInvoke('set-zrok-token', token);
};

export const disableZrok = async () => {
    return await safeIpcInvoke('disable-zrok');
};
