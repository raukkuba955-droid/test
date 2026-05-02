// server.js
const WebSocket = require('ws');
const msgpack = require('msgpack-lite');

const PORT = 8080;
const EXPECTED_TOKEN = 'follow-3c8f2e'; // Same token as in your userscript

const wss = new WebSocket.Server({ port: PORT });

const activeHosts = new Map(); // Key: activeFollowName, Value: { ws, id, x, y, mouseX, mouseY, isSpecialAction, lastUpdate }
let nextClientId = 1;

console.log(`WebSocket server for Arras.io FollowMe started on port ${PORT}`);
console.log(`Expected client token: ${EXPECTED_TOKEN}`);

wss.on('connection', (ws, req) => {
    const clientId = nextClientId++;
    const clientIp = req.socket.remoteAddress; // Get client IP for logging
    console.log(`[Client ${clientId} - ${clientIp}] Connected.`);

    ws.on('message', (message) => {
        try {
            const dataArray = (message instanceof Buffer) ? new Uint8Array(message) : new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
            let decodedData = msgpack.decode(dataArray);

            if (!decodedData || !Array.isArray(decodedData) || decodedData.length === 0) {
                console.warn(`[Client ${clientId}] Received empty or invalid msgpack data.`);
                return;
            }

            const type = decodedData.splice(0, 1)[0];

            switch (type) {
                case 0: // Initialization: [token, clientType (2 for host)]
                    if (decodedData.length >= 2) {
                        const [token, clientTypeCode] = decodedData;
                        if (token === EXPECTED_TOKEN && clientTypeCode === 2) {
                            console.log(`[Client ${clientId}] Registered as a host.`);
                            ws.send(msgpack.encode([0, 0])); // Send confirmation
                        } else {
                            console.warn(`[Client ${clientId}] Invalid host initialization. Token: ${token}, TypeCode: ${clientTypeCode}. Terminating.`);
                            ws.terminate();
                        }
                    } else {
                         console.warn(`[Client ${clientId}] Malformed type 0 message. Terminating.`);
                         ws.terminate();
                    }
                    break;

                case 1: // Update: [worldX, worldY, activeFollowName, mouseX, mouseY, specialAction]
                    if (decodedData.length >= 6) {
                        const [worldX, worldY, activeFollowName, mouseX, mouseY, specialAction] = decodedData;
                        activeHosts.set(activeFollowName, {
                            ws: ws, id: clientId, name: activeFollowName,
                            x: worldX, y: worldY, mouseX: mouseX, mouseY: mouseY,
                            isSpecialAction: specialAction, lastUpdate: Date.now()
                        });
                        console.log(`[Host: ${activeFollowName} (Client ${clientId})] Update: Pos(${worldX},${worldY}) Mouse(${mouseX},${mouseY}) Action:${specialAction}`);
                        // TODO: Broadcast this update to followers of 'activeFollowName'
                    } else {
                        console.warn(`[Client ${clientId}] Malformed type 1 message.`);
                    }
                    break;

                case 3: // Deactivate: [activeFollowName]
                    if (decodedData.length >= 1) {
                        const [activeFollowName] = decodedData;
                        if (activeHosts.has(activeFollowName)) {
                            const hostData = activeHosts.get(activeFollowName);
                            if (hostData.ws === ws) { // Ensure the message is from the correct client
                                activeHosts.delete(activeFollowName);
                                console.log(`[Host: ${activeFollowName} (Client ${clientId})] Deactivated and removed.`);
                                // TODO: Notify followers that this host is inactive
                            } else {
                                console.warn(`[Client ${clientId}] Attempted to deactivate host '${activeFollowName}' but WebSocket mismatch.`);
                            }
                        } else {
                             console.log(`[Client ${clientId}] Attempted to deactivate unknown host '${activeFollowName}'.`);
                        }
                    } else {
                        console.warn(`[Client ${clientId}] Malformed type 3 message.`);
                    }
                    break;

                default:
                    console.log(`[Client ${clientId}] Unhandled message type ${type}, Data:`, decodedData);
                    break;
            }
        } catch (e) {
            console.error(`[Client ${clientId}] Error processing message:`, e);
            // Log raw message for debugging if error occurs
            if (message instanceof Buffer) console.error("Raw message (Buffer hex):", message.toString('hex'));
            else if (message instanceof ArrayBuffer || ArrayBuffer.isView(message)) console.error("Raw message (ArrayBuffer/View):", new Uint8Array(message));
            else console.error("Raw message (unknown type):", message);
        }
    });

    ws.on('close', () => {
        console.log(`[Client ${clientId} - ${clientIp}] Disconnected.`);
        for (const [name, hostData] of activeHosts.entries()) {
            if (hostData.ws === ws) {
                activeHosts.delete(name);
                console.log(`[Host: ${name} (Client ${clientId})] Abrupt disconnect. Removed from active hosts.`);
                // TODO: Notify followers
                break;
            }
        }
    });

    ws.on('error', (error) => {
        console.error(`[Client ${clientId} - ${clientIp}] WebSocket error:`, error);
    });
});

// Optional: Periodically clean up stale hosts
setInterval(() => {
    const now = Date.now();
    const STALE_TIMEOUT = 30000; // 30 seconds
    for (const [name, hostData] of activeHosts.entries()) {
        if (now - hostData.lastUpdate > STALE_TIMEOUT) {
            console.log(`[Host: ${name} (Client ${hostData.id})] Stale, terminating and removing.`);
            if (hostData.ws.readyState === WebSocket.OPEN || hostData.ws.readyState === WebSocket.CONNECTING) {
                hostData.ws.terminate();
            }
            activeHosts.delete(name);
            // TODO: Notify followers
        }
    }
}, 15000);