// ==UserScript==
// @name         Follow v2
// @namespace    http://tampermonkey.net/
// @version      1.0.6_esc_toggle
// @description  Leader script. Uses a manual input for Squad ID. Press ESC to toggle GUI.
// @author       Damocles, CX & You
// @match        https://arras.io/
// @match        http://arras.io/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=arras.io
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';
    const LOG_PREFIX = '[FollowMe_ServerNameSquad]';
    const FOLLOW_SERVER_TOKEN = 'follow-3c8f2e';
    const FOLLOW_SERVER_WS_URL = 'ws://localhost:8080'; // Your Node.js server

    // --- UI Elements & State ---
    let uiPanel, uiCheckboxFollow, uiCheckboxAction, uiCheckboxPause,
        uiSpawnStatus, uiCoordsStatus, uiFollowWsStatus, uiGdStatus, uiGameHostStatus, uiBroadcastingNameStatus,
        uiSquadNameInput; // ADDED: Manual input for squad name

    let position = [0, 0, 0]; // [worldX, worldY, lastUpdateTimeMs]
    let displayCoords = { x: null, y: null };
    let hasSpawned = false;
    let gameActualKeydownHandler = null;
    let firstSpawnLKeyPressDone = false;
    let followSocket = null;
    let followSocketConnected = false;
    // lastSentData stores [sentWorldX, sentWorldY, sentMouseX, sentMouseY, sentActionState]
    let lastSentData = [null, null, 0, 0, false]; // Initialize to a state that will trigger first send
    let mouseGameCoords = [0, 0]; // [mouseX, mouseY] for sending (scaled by gd*10)
    let gd = 0;
    let gameServerHost = 'N/A';
    let currentArrasStatusObjects = {};
    let activeFollowName = null;
    let isBroadcastingPaused = false;
    let isGuiVisible = true; // ADDED: Track GUI visibility state

    function normalizeFollowName(value) {
        return String(value || '').trim().replace(/^#+/, '').toLowerCase();
    }

    function createUIPanel() {
        if (document.getElementById('followme-sns-panel')) return;
        uiPanel = document.createElement('div');
        uiPanel.id = 'followme-sns-panel';
        Object.assign(uiPanel.style, {
            position: 'fixed', top: '10px', right: '10px', width: '240px',
            background: 'rgba(0, 0, 0, 0.8)', color: 'white', fontFamily: 'Arial, sans-serif',
            fontSize: '12px', padding: '10px', borderRadius: '5px', border: '1px solid #444',
            zIndex: '10001', userSelect: 'none'
        });
        // MODIFIED: Added a manual input field for the squad ID.
        let htmlContent = `
            <h3 style="margin-top:0; margin-bottom:8px; text-align:center; font-size:14px;">FollowMe Control (Server Squad)</h3>
            <div style="margin-bottom:5px;">
                <label for="fm-sns-squad-name" style="display:block; margin-bottom:3px;">Broadcasting As (Squad ID):</label>
                <input type="text" id="fm-sns-squad-name" placeholder="Enter Squad ID here" style="width: 95%; background: #333; color: white; border: 1px solid #555; padding: 3px;">
            </div>
            <div style="margin-bottom:5px;">
                <input type="checkbox" id="fm-sns-chkbx-follow" style="vertical-align:middle; accent-color:rgb(255,155,0);">
                <label for="fm-sns-chkbx-follow" style="vertical-align:middle;">Enable Follow (F)</label>
            </div>
            <div style="margin-bottom:5px;">
                <input type="checkbox" id="fm-sns-chkbx-pause" style="vertical-align:middle; accent-color:rgb(0,155,255);">
                <label for="fm-sns-chkbx-pause" style="vertical-align:middle;">Pause Broadcast (P)</label>
            </div>
            <div style="margin-bottom:8px;">
                <input type="checkbox" id="fm-sns-chkbx-action" style="vertical-align:middle; accent-color:rgb(255,155,0);">
                <label for="fm-sns-chkbx-action" style="vertical-align:middle;">Alt Action (RMB)</label>
            </div>
            <p id="fm-sns-spawn-status" style="margin:3px 0;">Spawned: Waiting...</p>
            <p id="fm-sns-coords-status" style="margin:3px 0;">Coords: Waiting...</p>
            <p id="fm-sns-follow-ws-status" style="margin:3px 0;">Follow WS: Disconnected</p>
            <p id="fm-sns-gd-status" style="margin:3px 0;">GD Scale: Calculating...</p>
            <p style="margin:3px 0; font-size:10px; color:#888; text-align:center;">Press ESC to toggle GUI</p>
        `;
        uiPanel.innerHTML = htmlContent;
        if (document.body) document.body.appendChild(uiPanel);
        else window.addEventListener('DOMContentLoaded', () => document.body.appendChild(uiPanel));

        uiSquadNameInput = document.getElementById('fm-sns-squad-name'); // ADDED
        uiCheckboxFollow = document.getElementById('fm-sns-chkbx-follow');
        uiCheckboxPause = document.getElementById('fm-sns-chkbx-pause');
        uiCheckboxAction = document.getElementById('fm-sns-chkbx-action');
        uiSpawnStatus = document.getElementById('fm-sns-spawn-status');
        uiCoordsStatus = document.getElementById('fm-sns-coords-status');
        uiFollowWsStatus = document.getElementById('fm-sns-follow-ws-status');
        uiGdStatus = document.getElementById('fm-sns-gd-status');

        // Note: The original fields for auto-detection are gone from UI, but their variables are kept to prevent errors.
        uiGameHostStatus = null;
        uiBroadcastingNameStatus = null;

        uiCheckboxPause.disabled = !uiCheckboxFollow.checked;
        uiCheckboxAction.disabled = !uiCheckboxFollow.checked || isBroadcastingPaused;

        uiCheckboxFollow.addEventListener('input', handleFollowToggle);
        uiCheckboxPause.addEventListener('input', handlePauseToggle);

        window.addEventListener('keydown', (e) => {
            if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // ADDED: ESC key to toggle GUI visibility
            if (e.code === 'Escape') {
                toggleGuiVisibility();
                e.preventDefault();
                return;
            }

            if (e.code === 'KeyF') {
                uiCheckboxFollow.checked = !uiCheckboxFollow.checked;
                handleFollowToggle();
            } else if (e.code === 'KeyP' && !uiCheckboxPause.disabled) {
                uiCheckboxPause.checked = !uiCheckboxPause.checked;
                handlePauseToggle();
            }
        });
        window.addEventListener('mousedown', (e) => {
            if (e.button === 2 && uiCheckboxFollow.checked && !isBroadcastingPaused) {
                uiCheckboxAction.checked = true;
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                uiCheckboxAction.checked = false;
            }
        });
    }

    // ADDED: Function to toggle GUI visibility
    function toggleGuiVisibility() {
        if (!uiPanel) return;

        isGuiVisible = !isGuiVisible;
        uiPanel.style.display = isGuiVisible ? 'block' : 'none';

        console.log(LOG_PREFIX, `GUI ${isGuiVisible ? 'shown' : 'hidden'}`);
    }

    function handleFollowToggle() {
        if (uiCheckboxFollow.checked) {
            uiCheckboxPause.disabled = false;
            // MODIFIED: The automatic name detection is no longer used.
            // We get the name from the input field instead.
            activeFollowName = normalizeFollowName(uiSquadNameInput.value);
            connectToFollowServer();
        } else {
            isBroadcastingPaused = false;
            uiCheckboxPause.checked = false;
            uiCheckboxPause.disabled = true;
            uiCheckboxAction.checked = false;
            uiCheckboxAction.disabled = true;

            if (activeFollowName && followSocketConnected) {
                sendToFollowServer([3, activeFollowName]); // Send leader inactive
            }
        }
        uiCheckboxAction.disabled = !uiCheckboxFollow.checked || isBroadcastingPaused;
    }



    function handlePauseToggle() {
        if (uiCheckboxPause.checked) {
            isBroadcastingPaused = true;
            if (uiCheckboxFollow.checked && followSocketConnected && activeFollowName) {
                const nullWorldX = null;
                const nullWorldY = null;
                const neutralMouseX = 0;
                const neutralMouseY = 0;
                const neutralAction = false;

                sendToFollowServer([1, nullWorldX, nullWorldY, activeFollowName, neutralMouseX, neutralMouseY, neutralAction]);
                console.log(LOG_PREFIX, "Sent NULL COORDINATE packet to pause followers.");
                lastSentData = [nullWorldX, nullWorldY, neutralMouseX, neutralMouseY, neutralAction];
                lastSendTime = performance.now(); // Update time for this specific send
            }
            console.log(LOG_PREFIX, "Broadcasting Paused.");
        } else {
            isBroadcastingPaused = false;
            console.log(LOG_PREFIX, "Broadcasting Resumed.");
            // Immediately send the current state upon unpausing
            // This ensures the follower gets valid coordinates right away.
            sendCurrentState();
        }
        uiCheckboxAction.disabled = !uiCheckboxFollow.checked || isBroadcastingPaused;
    }


    function updateUIField(element, text, color = 'lime') {
        if (element) { element.textContent = text; element.style.color = color; }
    }

    const msgpackScript = document.createElement('script');
    msgpackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/msgpack-lite/0.1.26/msgpack.min.js';
    msgpackScript.onload = () => { console.log(LOG_PREFIX, 'msgpack-lite loaded.'); };
    document.documentElement.appendChild(msgpackScript);

    // --- Core functionality (Untouched from original) ---
    // All the original proxy methods for getting coordinates, spawn status,
    // and GD scale are preserved to ensure aiming and following work.

    try {
        const originalAddEventListener = window.EventTarget.prototype.addEventListener;
        window.EventTarget.prototype.addEventListener = new Proxy(originalAddEventListener, {
            apply: (target, thisArg, args) => {
                if (args[0] === 'keydown' && typeof args[1] === 'function' && !gameActualKeydownHandler &&
                    args[1].toString().includes(`.isTrusted`) && args[1].toString().includes(`return`)) {
                    gameActualKeydownHandler = args[1];
                    console.log(LOG_PREFIX, 'Game Keydown Handler Found.');
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
    } catch (e) { console.error(LOG_PREFIX, 'Error proxying addEventListener for keydown:', e); }

    try {
        const originalFillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = new Proxy(originalFillText, {
            apply: (target, thisArg, args) => {
                const text = args[0];
                if (typeof text === 'string') {
                    if (text === 'You have spawned! Welcome to the game.') {
                        if (!hasSpawned) {
                            hasSpawned = true;
                            updateUIField(uiSpawnStatus, 'Spawned: YES');
                            console.log(LOG_PREFIX, 'Spawn Detected.');
                            if (gameActualKeydownHandler && !firstSpawnLKeyPressDone) {
                                console.log(LOG_PREFIX, "Simulating 'L' key press...");
                                try {
                                    gameActualKeydownHandler({
                                        isTrusted: true, key: 'l', code: 'KeyL', keyCode: 76, which: 76,
                                        preventDefault: () => { }, bubbles: true, cancelable: true, composed: true,
                                        target: thisArg.canvas || document.body
                                    });
                                    firstSpawnLKeyPressDone = true;
                                } catch (e) { console.error(LOG_PREFIX, "Error simulating 'L' key:", e); }
                            }
                        }
                    } else if (text.startsWith('Coordinates: (')) {
                        let coordsStr = text.slice(14);
                        let endIndex = coordsStr.indexOf(')');
                        if (endIndex !== -1) {
                            coordsStr = coordsStr.slice(0, endIndex);
                            const parts = coordsStr.split(', ');
                            if (parts.length === 2) {
                                const x = parseFloat(parts[0]);
                                const y = parseFloat(parts[1]);
                                if (!isNaN(x) && !isNaN(y)) {
                                    displayCoords.x = x; displayCoords.y = y;
                                    position[0] = x; position[1] = y; position[2] = performance.now() + 5000;
                                    updateUIField(uiCoordsStatus, `Coords: (${x.toFixed(1)}, ${y.toFixed(1)})`);
                                }
                            }
                        }
                    }
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
    } catch (e) { console.error(LOG_PREFIX, 'Error proxying fillText:', e); }


    let st = 5, lx = 0, ca = {}, sr = 1, s_canvas_scale = 0;
    function calculateG() {
        let w = window.innerWidth; let h = window.innerHeight;
        if (ca.width) {
            if (w * 0.5625 > h) s_canvas_scale = 888.888888888 / w; else s_canvas_scale = 500 / h;
            sr = ca.width / w;
        }
    }
    try {
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = new Proxy(originalRAF, {
            apply: (t, ta, a) => {
                st = 10; // Reset st with more attempts per frame
                calculateG();
                return Reflect.apply(t, ta, a);
            }
        });
        const originalMoveTo = CanvasRenderingContext2D.prototype.moveTo;
        CanvasRenderingContext2D.prototype.moveTo = new Proxy(originalMoveTo, {
            apply: (t, ta, a) => {
                ca = ta.canvas; calculateG();
                if (st > 0) {
                    st--;
                    // Grid lines in Arras are usually drawn first and have a consistent spacing
                    let diff = Math.abs(a[0] - lx);
                    if (lx !== 0 && diff !== 0 && sr !== 0) {
                        const new_gd = sr / diff;
                        // Reasonable Arras GD scale is typically between 0.1 and 2.5
                        if (isFinite(new_gd) && new_gd > 0.1 && new_gd < 2.5) {
                            if (Math.abs(new_gd - gd) > 0.0001) {
                                gd = new_gd;
                                updateUIField(uiGdStatus, `GD Scale: ${gd.toFixed(4)}`);
                            }
                        }
                    }
                    lx = a[0];
                }
                return Reflect.apply(t, ta, a);
            }
        });
    } catch (e) { console.error(LOG_PREFIX, 'Error proxying for GD Scale:', e); }

    let mouseScreenDelta = [0, 0];
    window.addEventListener('mousemove', (e) => {
        let w = window.innerWidth; let h = window.innerHeight;
        mouseScreenDelta[0] = (e.clientX - w * 0.5);
        mouseScreenDelta[1] = (e.clientY - h * 0.5);
        updateMouseCoords();
    }, true);

    function updateMouseCoords() {
        const scale = (Number.isFinite(gd) && gd > 0) ? gd : 1;
        // The headless follower expects absolute world coordinates for aiming.
        // Formula: World Position + (Screen Delta * GD Scale)
        mouseGameCoords[0] = Math.round((position[0] + mouseScreenDelta[0] * scale) * 10);
        mouseGameCoords[1] = Math.round((position[1] + mouseScreenDelta[1] * scale) * 10);
    }

    function sendCurrentState() {
        activeFollowName = normalizeFollowName(uiSquadNameInput && uiSquadNameInput.value);
        if (!uiCheckboxFollow || !uiCheckboxFollow.checked ||
            !followSocketConnected || !activeFollowName ||
            (position[0] === 0 && position[1] === 0 && displayCoords.x === null)) {
            return;
        }

        updateMouseCoords(); // Ensure latest position is accounted for

        const worldX = Math.round(position[0] * 10);
        const worldY = Math.round(position[1] * 10);
        const mouseX = mouseGameCoords[0];
        const mouseY = mouseGameCoords[1];
        const currentActionState = uiCheckboxAction.checked;

        sendToFollowServer([1, worldX, worldY, activeFollowName, mouseX, mouseY, currentActionState]);
        lastSentData = [worldX, worldY, mouseX, mouseY, currentActionState];
        lastSendTime = performance.now();
    }

    function connectToFollowServer() {
        if (followSocket && (followSocket.readyState === WebSocket.OPEN || followSocket.readyState === WebSocket.CONNECTING)) return;
        if (!window.msgpack) {
            updateUIField(uiFollowWsStatus, 'Follow WS: msgpack N/A', 'orange'); return;
        }
        updateUIField(uiFollowWsStatus, 'Follow WS: Connecting...', 'yellow');
        followSocket = new WebSocket(FOLLOW_SERVER_WS_URL);
        followSocket.binaryType = 'arraybuffer';
        followSocket.onopen = () => {
            followSocketConnected = true;
            updateUIField(uiFollowWsStatus, 'Follow WS: Connected');
            sendToFollowServer([0, FOLLOW_SERVER_TOKEN, 2]); // Type 2 for LEADER
            // Send initial state once connected if follow is enabled and not paused
            if (uiCheckboxFollow.checked && !isBroadcastingPaused) {
                sendCurrentState();
            }
        };
        followSocket.onmessage = (event) => {
            try {
                let data = window.msgpack.decode(new Uint8Array(event.data));
                if (!data || !Array.isArray(data)) return;
                const type = data.splice(0, 1)[0];
                if (type === 0 && data[0] === 0) console.log(LOG_PREFIX, 'Follow server ack host mode.');
            } catch (e) { console.error(LOG_PREFIX, 'Error processing msg from follow server:', e); }
        };
        followSocket.onclose = () => {
            followSocketConnected = false; followSocket = null;
            updateUIField(uiFollowWsStatus, 'Follow WS: Disconnected', 'red');
            if (uiCheckboxFollow && uiCheckboxFollow.checked) setTimeout(connectToFollowServer, 3000);
        };
        followSocket.onerror = (error) => {
            updateUIField(uiFollowWsStatus, 'Follow WS: Error', 'red');
            console.error(LOG_PREFIX, 'Follow server WS error:', error);
        };
    }

    function sendToFollowServer(payload) {
        if (followSocket && followSocket.readyState === WebSocket.OPEN && window.msgpack) {
            followSocket.send(window.msgpack.encode(payload));
        }
    }

    let lastSendTime = 0;
    setInterval(() => {
        if (!uiCheckboxFollow) createUIPanel();

        if (position[2] < performance.now() && displayCoords.x !== null && uiCoordsStatus) {
            updateUIField(uiCoordsStatus, `Coords: (${displayCoords.x.toFixed(1)}, ${displayCoords.y.toFixed(1)}) [STALE]`, 'orange');
        }

        if (uiCheckboxFollow && uiCheckboxFollow.checked && !followSocketConnected && (!followSocket || followSocket.readyState === WebSocket.CLOSED)) {
            connectToFollowServer();
        }

        if (!uiCheckboxFollow || !uiCheckboxFollow.checked || isBroadcastingPaused) {
            return;
        }

        // MODIFIED: Always get the latest squad ID from the input field before sending.
        // This is the critical change. The script now depends on this input.
        activeFollowName = normalizeFollowName(uiSquadNameInput.value);
        if (!activeFollowName) {
            // If the squad ID is empty, we cannot send data.
            return;
        }


        if (!followSocketConnected ||
            (position[0] === 0 && position[1] === 0 && displayCoords.x === null)) {
            return;
        }

        const worldX = Math.round(position[0] * 10);
        const worldY = Math.round(position[1] * 10);
        const mouseX = mouseGameCoords[0];
        const mouseY = mouseGameCoords[1];
        const currentActionState = uiCheckboxAction.checked;
        const now = performance.now();

        if (worldX !== lastSentData[0] || worldY !== lastSentData[1] ||
            mouseX !== lastSentData[2] || mouseY !== lastSentData[3] ||
            currentActionState !== lastSentData[4] ||
            now - lastSendTime > 250) { // Send if data changed OR if it's been >250ms (heartbeat)

            sendCurrentState(); // Use the dedicated function to send and update lastSentData
        }
    }, 40);

    createUIPanel();
    console.log(LOG_PREFIX, 'Leader Script (v1.0.6_esc_toggle) Initialized.');
})();
