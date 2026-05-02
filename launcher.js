// launcher.js - Fixed to pass bot count to headless.js
const { spawn, exec } = require('child_process');
const fs = require('fs');
const readline = require('readline');

let wsServerProcess = null;
let botControllerProcess = null;
let isServerRunning = false;

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

// Function to check if server is already running
function checkServerStatus() {
    return new Promise((resolve) => {
        exec('netstat -an | find "8080"', (error, stdout) => {
            if (error || !stdout.includes('8080')) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Start WebSocket server
function startWebSocketServer() {
    console.log('\nStarting WebSocket server...');

    // Check if server.js exists
    if (!fs.existsSync('server.js')) {
        console.log('Error: server.js not found!');
        return false;
    }

    // Start server in background (detached)
    wsServerProcess = spawn('node', ['server.js'], {
        detached: true,
        stdio: 'ignore'
    });

    // Unreference the process so it can run independently
    wsServerProcess.unref();

    // Save PID to file for later cleanup
    fs.writeFileSync('websocket-server.pid', wsServerProcess.pid.toString());

    console.log(`✓ WebSocket server started (PID: ${wsServerProcess.pid})`);
    console.log('  Port: 8080');
    console.log('  Token: follow-8fe6ca');
    console.log('  Server will continue running even if you exit launcher.\n');

    isServerRunning = true;
    return true;
}

// Stop WebSocket server
function stopWebSocketServer() {
    console.log('\nStopping WebSocket server...');

    try {
        if (fs.existsSync('websocket-server.pid')) {
            const pid = parseInt(fs.readFileSync('websocket-server.pid', 'utf8'));
            try {
                process.kill(pid);
                console.log(`✓ Stopped server (PID: ${pid})`);
            } catch (e) {
                console.log('✗ Server not running or already stopped');
            }
            fs.unlinkSync('websocket-server.pid');
        } else {
            console.log('✗ No server PID found. Trying to kill by port...');
            exec('taskkill /F /IM node.exe /FI "WINDOWTITLE eq server*"', () => { });
        }
    } catch (e) {
        console.log('Error stopping server:', e.message);
    }

    isServerRunning = false;
    return true;
}

// Start bot controller
function startBotController() {
    console.log('\nStarting bot controller...');

    // Check if headless.js exists
    if (!fs.existsSync('headless.js')) {
        console.log('Error: headless.js not found!');
        showMainMenu();
        return;
    }

    // Ask how many bots to start
    rl.question('How many bots to start? ', (botCount) => {
        const count = parseInt(botCount.trim());

        if (isNaN(count) || count <= 0) {
            console.log('Invalid number! Using default (1).');
            spawnBotProcess(1);
        } else {
            spawnBotProcess(count);
        }
    });

    function spawnBotProcess(count) {
        console.log(`\nStarting ${count} bots...`);
        console.log('=== BOT CONTROLLER ===\n');

        // Start bot controller with the bot count as argument
        botControllerProcess = spawn('node', ['headless.js', '--count', count.toString()], {
            stdio: 'inherit',
            shell: true
        });

        botControllerProcess.on('exit', (code) => {
            console.log(`\nBot controller exited (code: ${code || 0})`);
            botControllerProcess = null;
            showMainMenu();
        });

        botControllerProcess.on('error', (err) => {
            console.log(`Failed to start bot controller: ${err.message}`);
            botControllerProcess = null;
            showMainMenu();
        });
    }
}

// Show main menu
function showMainMenu() {
    console.clear();
    console.log('╔══════════════════════════════════════════╗');
    console.log('║      ARRAS.IO BOT LAUNCHER v2.0          ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log(`WebSocket Server: ${isServerRunning ? '✓ RUNNING' : '✗ STOPPED'}`);
    console.log('Port: 8080');
    console.log('');
    console.log('--- MAIN MENU ---');
    console.log('[1] Start WebSocket Server');
    console.log('[2] Start Bot Controller');
    console.log('[3] Start Both (Server + Bots)');
    console.log('[4] Stop WebSocket Server');
    console.log('[5] Check Server Status');
    console.log('[6] Exit Launcher (Keep Server Running)');
    console.log('[7] Exit & Stop Everything & Close Window');
    console.log('');

    rl.question('Select option: ', handleMainMenuChoice);
}

// Handle main menu choice
async function handleMainMenuChoice(choice) {
    choice = choice.trim();

    switch (choice) {
        case '1':
            if (isServerRunning) {
                console.log('\n✗ Server already running!');
                setTimeout(showMainMenu, 1000);
            } else {
                if (startWebSocketServer()) {
                    setTimeout(showMainMenu, 2000);
                }
            }
            break;

        case '2':
            if (!isServerRunning) {
                console.log('\n⚠ Warning: WebSocket server not running!');
                console.log('Bots need server to connect to leader.');
                rl.question('Start server now? (y/n): ', (answer) => {
                    if (answer.toLowerCase() === 'y') {
                        startWebSocketServer();
                        setTimeout(() => {
                            startBotController();
                        }, 3000);
                    } else {
                        showMainMenu();
                    }
                });
            } else {
                startBotController();
            }
            break;

        case '3':
            if (!isServerRunning) {
                startWebSocketServer();
                setTimeout(() => {
                    startBotController();
                }, 3000);
            } else {
                console.log('\n✓ Server already running.');
                setTimeout(() => {
                    startBotController();
                }, 1000);
            }
            break;

        case '4':
            if (isServerRunning) {
                stopWebSocketServer();
                setTimeout(showMainMenu, 1500);
            } else {
                console.log('\n✗ Server not running.');
                setTimeout(showMainMenu, 1000);
            }
            break;

        case '5':
            console.log('\nChecking server status...');
            const status = await checkServerStatus();
            console.log(status ? '✓ Server is running on port 8080' : '✗ Server not running');
            setTimeout(showMainMenu, 2000);
            break;

        case '6':
            console.log('\nExiting launcher...');
            console.log('✓ WebSocket server will continue running.');
            console.log('\nTo stop server later:');
            console.log('  - Run this launcher again and choose option 4');
            console.log('  - Or restart your computer');

            // Clean up bot controller if running
            if (botControllerProcess) {
                botControllerProcess.kill();
            }

            rl.close();
            process.exit(0);
            break;

        case '7':
            console.log('\n🛑 Stopping everything and closing window...');

            // Stop bot controller
            if (botControllerProcess) {
                console.log('Stopping bot controller...');
                botControllerProcess.kill();
            }

            // Stop server
            if (isServerRunning) {
                console.log('Stopping WebSocket server...');
                stopWebSocketServer();
            }

            console.log('\n✓ All processes stopped.');
            console.log('Closing window in 3 seconds...');

            // Countdown before closing
            setTimeout(() => {
                console.log('Closing in 2...');
                setTimeout(() => {
                    console.log('Closing in 1...');
                    setTimeout(() => {
                        console.log('Goodbye! 👋');

                        // Close everything and exit
                        rl.close();

                        // Use Windows command to close CMD window
                        if (process.platform === 'win32') {
                            exec('timeout /t 1 /nobreak > nul && exit', () => {
                                process.exit(0);
                            });
                        } else {
                            process.exit(0);
                        }
                    }, 1000);
                }, 1000);
            }, 1000);
            break;

        default:
            console.log('\nInvalid option. Please choose 1-7.');
            setTimeout(showMainMenu, 1000);
            break;
    }
}

// Cleanup on Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n⚠ Ctrl+C detected!');

    if (botControllerProcess) {
        console.log('Stopping bot controller...');
        botControllerProcess.kill();
    }

    console.log('\n✓ Launcher stopped.');
    console.log('✓ WebSocket server continues running.');
    console.log('To stop server, run this launcher again and choose option 4.\n');

    rl.close();
    process.exit(0);
});

// Check if server is already running on startup
async function initialize() {
    console.log('Loading ARRAS.IO Bot Launcher...\n');

    // Check if WebSocket server is already running
    isServerRunning = await checkServerStatus();

    if (isServerRunning) {
        console.log('✓ Detected WebSocket server already running on port 8080');
    }

    setTimeout(showMainMenu, 1000);
}

// Start the launcher
initialize();
