// server.js (Enhanced for Leader/Follower)
const WebSocket = require('ws');
const msgpack = require('msgpack-lite');

const PORT = 8080;
const EXPECTED_LEADER_TOKEN = 'follow-3c8f2e'; // Token for the leader client

const wss = new WebSocket.Server({ port: PORT });

// Store active leaders. Key: activeFollowName, Value: { ws, id (leader's clientID), x, y, mouseX, mouseY, isSpecialAction, lastUpdate, followers: Set<WebSocket> }
const activeLeaders = new Map();
// Store follower clients directly, perhaps mapping them to the leader they are following
// Key: follower WebSocket, Value: leaderName string
const followerSubscriptions = new Map();

let nextClientId = 1;

console.log(`WebSocket server (Leader/Follower) started on port ${PORT}`);

wss.on('connection', (ws, req) => {
    const clientId = nextClientId++;
    const clientIp = req.socket.remoteAddress;
    console.log(`[Client ${clientId} - ${clientIp}] Connected.`);

    ws.on('message', (message) => {
        try {
            const dataArray = (message instanceof Buffer) ? new Uint8Array(message) : new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
            let decodedData = msgpack.decode(dataArray);

            if (!decodedData || !Array.isArray(decodedData) || decodedData.length === 0) {
                console.warn(`[Client ${clientId}] Received empty/invalid msgpack.`);
                return;
            }
            const type = decodedData.splice(0, 1)[0];

            switch (type) {
                // --- Leader Messages ---
                case 0: // Leader Initialization: [token, clientType (2 for leader)]
                    if (decodedData.length >= 2) {
                        const [token, clientTypeCode] = decodedData;
                        if (token === EXPECTED_LEADER_TOKEN && clientTypeCode === 2) {
                            console.log(`[Client ${clientId}] Registered as a LEADER.`);
                            // Store this client's ws temporarily until they send their first type 1 update with their name
                            ws.isLeaderCandidate = true;
                            ws.leaderClientId = clientId;
                            ws.send(msgpack.encode([0, 0])); // Ack
                        } else {
                            console.warn(`[Client ${clientId}] Invalid leader init. Token: ${token}, TypeCode: ${clientTypeCode}. Terminating.`);
                            ws.terminate();
                        }
                    } else { ws.terminate(); }
                    break;

                case 1: // Leader Update: [worldX, worldY, activeFollowName, mouseX, mouseY, specialAction]
                    if (ws.isLeaderCandidate && decodedData.length >= 6) {
                        const [worldX, worldY, activeFollowName, mouseX, mouseY, specialAction] = decodedData;

                        let leaderData = activeLeaders.get(activeFollowName);
                        if (!leaderData) { // First update from this leader, or name changed
                            leaderData = { followers: new Set() }; // Initialize followers set
                            activeLeaders.set(activeFollowName, leaderData);
                            console.log(`[Leader: ${activeFollowName} (Client ${clientId})] Now ACTIVE.`);
                        }
                        // Update leader data
                        leaderData.ws = ws;
                        leaderData.id = clientId; // Ensure client ID is associated
                        leaderData.name = activeFollowName;
                        leaderData.x = worldX;
                        leaderData.y = worldY;
                        leaderData.mouseX = mouseX;
                        leaderData.mouseY = mouseY;
                        leaderData.isSpecialAction = specialAction;
                        leaderData.lastUpdate = Date.now();

                        // console.log(`[Leader: ${activeFollowName}] Update: Pos(${worldX},${worldY})`); // Less verbose

                        // Broadcast to this leader's followers
                        broadcastToFollowers(activeFollowName, leaderData);
                    } else if (!ws.isLeaderCandidate) {
                        console.warn(`[Client ${clientId}] Sent type 1 update but not registered as leader candidate.`);
                    } else { console.warn(`[Client ${clientId}] Malformed type 1 message.`); }
                    break;

                case 3: // Leader Deactivate: [activeFollowName]
                    if (decodedData.length >= 1) {
                        const [activeFollowName] = decodedData;
                        const leaderData = activeLeaders.get(activeFollowName);
                        if (leaderData && leaderData.ws === ws) {
                            notifyFollowersLeaderInactive(activeFollowName, leaderData.followers);
                            activeLeaders.delete(activeFollowName);
                            console.log(`[Leader: ${activeFollowName} (Client ${clientId})] Deactivated and removed.`);
                        }
                    } else { console.warn(`[Client ${clientId}] Malformed type 3 message.`); }
                    break;

                // --- Follower Messages ---
                case 10: // Follower Subscribe: [leaderName_to_follow]
                    if (decodedData.length >= 1) {
                        const leaderNameToFollow = decodedData[0];
                        if (activeLeaders.has(leaderNameToFollow)) {
                            const leaderData = activeLeaders.get(leaderNameToFollow);
                            leaderData.followers.add(ws); // Add this follower's WebSocket to the leader's set
                            followerSubscriptions.set(ws, leaderNameToFollow); // Track who this ws is following
                            ws.isFollower = true;
                            ws.followingLeaderName = leaderNameToFollow;
                            console.log(`[Client ${clientId}] Now following Leader: ${leaderNameToFollow}. Total followers for ${leaderNameToFollow}: ${leaderData.followers.size}`);
                            // Send current leader state to the new follower
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(msgpack.encode([101, leaderData.x, leaderData.y, leaderData.mouseX, leaderData.mouseY, leaderData.isSpecialAction]));
                            }
                        } else {
                            console.warn(`[Client ${clientId}] Tried to follow non-existent Leader: ${leaderNameToFollow}`);
                            if (ws.readyState === WebSocket.OPEN) ws.send(msgpack.encode([103, `Leader ${leaderNameToFollow} not found`])); // Error type 103
                        }
                    } else { console.warn(`[Client ${clientId}] Malformed type 10 (Follower Subscribe) message.`); }
                    break;

                case 50: // Broadcast Command (e.g. Key Press): [keyName]
                    if (decodedData.length >= 1) {
                        const commandPayload = msgpack.encode([105, ...decodedData]);
                        // Broadcast to ALL clients (leaders and followers)
                        wss.clients.forEach(client => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(commandPayload);
                            }
                        });
                        console.log(`[Client ${clientId}] Broadcasted command:`, decodedData);
                    }
                    break;

                default:
                    console.log(`[Client ${clientId}] Unhandled type ${type}, Data:`, decodedData);
                    break;
            }
        } catch (e) {
            console.error(`[Client ${clientId}] Error processing message:`, e);
        }
    });

    ws.on('close', () => {
        console.log(`[Client ${clientId} - ${clientIp}] Disconnected.`);
        // If it was a leader
        if (ws.isLeaderCandidate) {
            for (const [name, leaderData] of activeLeaders.entries()) {
                if (leaderData.ws === ws) {
                    notifyFollowersLeaderInactive(name, leaderData.followers);
                    activeLeaders.delete(name);
                    console.log(`[Leader: ${name} (Client ${clientId})] Abrupt disconnect. Removed.`);
                    break;
                }
            }
        }
        // If it was a follower
        if (ws.isFollower && followerSubscriptions.has(ws)) {
            const leaderName = followerSubscriptions.get(ws);
            const leaderData = activeLeaders.get(leaderName);
            if (leaderData && leaderData.followers) {
                leaderData.followers.delete(ws);
                console.log(`[Follower Client ${clientId}] Unsubscribed from ${leaderName} due to disconnect. Remaining followers for ${leaderName}: ${leaderData.followers.size}`);
            }
            followerSubscriptions.delete(ws);
        }
    });
    ws.on('error', (error) => { console.error(`[Client ${clientId}] WS error:`, error); });
});

function broadcastToFollowers(leaderName, leaderData) {
    if (leaderData.followers && leaderData.followers.size > 0) {
        const messageToFollower = msgpack.encode([
            101, // Type: Leader Update for Follower
            leaderData.x, leaderData.y,
            leaderData.mouseX, leaderData.mouseY,
            leaderData.isSpecialAction
        ]);
        leaderData.followers.forEach(followerWs => {
            if (followerWs.readyState === WebSocket.OPEN) {
                try {
                    followerWs.send(messageToFollower);
                } catch (e) {
                    console.error("Error sending update to follower:", e);
                }
            }
        });
    }
}

function notifyFollowersLeaderInactive(leaderName, followersSet) {
    if (followersSet && followersSet.size > 0) {
        console.log(`Notifying ${followersSet.size} followers that leader ${leaderName} is inactive.`);
        const messageToFollower = msgpack.encode([102, leaderName]); // Type: Leader Inactive
        followersSet.forEach(followerWs => {
            if (followerWs.readyState === WebSocket.OPEN) {
                try {
                    followerWs.send(messageToFollower);
                } catch (e) {
                    console.error("Error sending inactive notification to follower:", e);
                }
            }
        });
    }
}

const originalError = console.error;
console.error = (...args) => {
    if (args[0]?.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
    if (typeof args[0] === 'string' && args[0].includes('FetchError: Invalid response body')) return;
    originalError.apply(console, args);
};

const originalLog = console.log;
console.log = (...args) => {
    if (args[0]?.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
    if (typeof args[0] === 'string' && args[0].includes('FetchError: Invalid response body')) return;
    originalLog.apply(console, args);
};

// Stale leader cleanup (optional but good practice)
setInterval(() => {
    const now = Date.now();
    const STALE_TIMEOUT = 30000; // 30 seconds
    for (const [name, leaderData] of activeLeaders.entries()) {
        if (now - leaderData.lastUpdate > STALE_TIMEOUT) {
            console.log(`[Leader: ${name} (Client ${leaderData.id})] Stale, terminating and removing.`);
            if (leaderData.ws.readyState === WebSocket.OPEN || leaderData.ws.readyState === WebSocket.CONNECTING) {
                leaderData.ws.terminate(); // This will trigger its 'close' handler for proper cleanup
            } else { // If already closed but somehow still in map
                notifyFollowersLeaderInactive(name, leaderData.followers);
                activeLeaders.delete(name);
            }
        }
    }
}, 15000);
