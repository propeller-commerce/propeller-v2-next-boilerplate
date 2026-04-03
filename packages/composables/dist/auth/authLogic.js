"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginFlow = loginFlow;
exports.clearAuthHeaders = clearAuthHeaders;
exports.fetchViewer = fetchViewer;
const propeller_sdk_v2_1 = require("propeller-sdk-v2");
/**
 * Execute the login flow: authenticate, update GraphQL client headers, fetch viewer data.
 * Returns the authenticated user and tokens.
 */
async function loginFlow(graphqlClient, email, password) {
    const loginService = new propeller_sdk_v2_1.LoginService(graphqlClient);
    const userService = new propeller_sdk_v2_1.UserService(graphqlClient);
    const loginInput = { email, password };
    const loginResponse = await loginService.login(loginInput);
    if (!loginResponse?.session) {
        throw new Error('Invalid response: No session data received');
    }
    const session = loginResponse.session;
    const accessToken = session.accessToken;
    const refreshToken = session.refreshToken;
    if (!accessToken || !refreshToken) {
        throw new Error('Invalid response: Missing authentication tokens');
    }
    // Update GraphQL client with auth header
    const currentConfig = graphqlClient.getConfig();
    graphqlClient.updateConfig({
        headers: {
            ...currentConfig.headers,
            Authorization: `Bearer ${accessToken}`,
        },
    });
    // Fetch viewer data
    let user = null;
    try {
        user = (await userService.getViewer({}));
    }
    catch {
        // Viewer fetch failed -- proceed without user data
    }
    if (!user) {
        throw new Error('Failed to fetch user data after login');
    }
    return {
        user,
        accessToken,
        refreshToken,
        expiresAt: session.expirationTime,
    };
}
/**
 * Clear authentication headers from the GraphQL client.
 */
function clearAuthHeaders(graphqlClient) {
    const currentConfig = graphqlClient.getConfig();
    const newHeaders = { ...currentConfig.headers };
    delete newHeaders['Authorization'];
    graphqlClient.updateConfig({
        headers: newHeaders,
    });
}
/**
 * Fetch the current viewer/user from the API.
 */
async function fetchViewer(graphqlClient) {
    const userService = new propeller_sdk_v2_1.UserService(graphqlClient);
    try {
        return (await userService.getViewer({}));
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=authLogic.js.map