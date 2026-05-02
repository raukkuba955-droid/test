const fs = require('fs');
const { spawn, exec } = require('child_process');
const readline = require('readline');
const os = require('os');

const CONFIG_FILE = 'bot_config.json';
const SERVER_JS = 'server.js';
const LAUNCHER_JS = 'launcher.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const tree = {
    'Browser': ['Y', 'Surfer'], 'Strider': ['K', 'Fighter'], 'Automingler': ['J', 'Mingler'], 'Mingler': ['K', 'Hexa Tank'], 'Necromancer': ['Y', 'Necromancer'], 'Underseer': ['I', 'Director'], 'Firework': ['Y', 'Rocketeer'], 'Leviathan': ['H', 'Rocketeer'], 'Rocketeer': ['K', 'Launcher'], 'Annihilator': ['U', 'Destroyer'], 'Destroyer': ['Y', 'Pounder'], 'Swarmer': ['I', 'Launcher'], 'Twister': ['U', 'Launcher'], 'Launcher': ['H', 'Pounder'], 'Fighter': ['Y', 'TriAngle'], 'Surfer': ['K', 'TriAngle'], 'Sprayer': ['H', 'Machine Gun'], 'Redistributor': ['Y', 'Sprayer'], 'Spreadshot': ['U', 'Triple Shot'], 'Gale': ['I', 'Octo Tank'], 'Crackshot': ['J', 'Penta Shot'], 'Penta Shot': ['Y', 'Triple Shot'], 'Twin': ['Y', 'Basic'], 'Double Twin': ['Y', 'Twin'], 'Triple Shot': ['U', 'Twin'], 'Sniper': ['U', 'Basic'], 'Machine Gun': ['I', 'Basic'], 'Gunner': ['I', 'Machine Gun'], 'Machine Gunner': ['H', 'Gunner'], 'Nailgun': ['U', 'Gunner'], 'Pincer': ['K', 'Nailgun'], 'Flank Guard': ['H', 'Basic'], 'Hexa Tank': ['Y', 'Flank Guard'], 'Octo Tank': ['Y', 'Hexa Tank'], 'Cyclone': ['U', 'Hexa Tank'], 'HexaTrapper': ['I', 'Hexa Tank'], 'TriAngle': ['U', 'Flank Guard'], 'Fighter': ['Y', 'TriAngle'], 'Booster': ['U', 'TriAngle'], 'Falcon': ['I', 'TriAngle'], 'Bomber': ['H', 'TriAngle'], 'AutoTriAngle': ['J', 'TriAngle'], 'Surfer': ['K', 'TriAngle'], 'Auto3': ['I', 'Flank Guard'], 'Auto5': ['Y', 'Auto3'], 'Mega3': ['U', 'Auto3'], 'Auto4': ['I', 'Auto3'], 'Banshee': ['H', 'Auto3'], 'Trap Guard': ['H', 'Flank Guard'], 'Buchwhacker': ['Y', 'Trap Guard'], 'Gunner Trapper': ['U', 'Trap Guard'], 'Conqueror': ['J', 'Trap Guard'], 'Bulwark': ['K', 'Trap Guard'], 'TriTrapper': ['J', 'Flank Guard'], 'Fortress': ['Y', 'TriTrapper'], 'Septatrapper': ['I', 'TriTrapper'], 'Whirlwind': ['H', 'Septatrapper'], 'Nona': ['Y', 'Septatrapper'], 'SeptaMachine': ['U', 'Septatrapper'], 'Architect': ['H', 'TriTrapper'], 'TripleTwin': ['K', 'Flank Guard'], 'Director': ['J', 'Basic'], 'Pounder': ['K', 'Basic'], 'Assassin': ['Y', 'Sniper'], 'Stalker': ['I', 'Assassin'], 'Pursuer': ['Y', 'Stalker'],
};

const PRESETS = {
    'Testing & Classic': [
        { tanks: [0, 3, 0], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [0, 3, 1], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [0, 3, 2], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [6, 1, 2], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [0, 1, 0], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [3, 1, 1], stats: [[8, 6], [0, 9], [1, 9], [6, 9], [7, 9]] }
    ],
    'Best AR Tanks': [
        { tanks: [5, 3, 5, 3], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [0, 1, 5, 1], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [3, 0, 0, 2], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [3, 2, 2, 0], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [5, 3, 5, 0], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [0, 2, 1, 5], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] },
        { tanks: [3, 0, 5, 4], stats: [[2, 6], [3, 9], [4, 9], [5, 9], [6, 9]] }
    ],
    'Tri-branch Hell': [
        { tanks: [3, 1, 0, 0], stats: [[0, 2], [1, 2], [2, 2], [3, 8], [4, 6], [5, 8], [6, 9], [7, 5]] },
        { tanks: [3, 1, 3, 8], stats: [[0, 2], [1, 2], [2, 2], [3, 8], [4, 6], [5, 8], [6, 9], [7, 5]] },
        { tanks: [3, 1, 5, 4], stats: [[0, 2], [1, 2], [2, 2], [3, 8], [4, 6], [5, 8], [6, 9], [7, 5]] },
        { tanks: [3, 1, 4, 0], stats: [[0, 2], [1, 2], [2, 2], [3, 8], [4, 6], [5, 8], [6, 9], [7, 5]] }
    ],
    'ADG Advanced': [
        { tanks: [4, 5], stats: [[2, 9], [3, 9], [4, 9], [5, 9], [6, 3], [7, 3]] },
        { tanks: [0, 0, 2], stats: [[0, 1], [1, 2], [2, 3], [3, 8], [4, 7], [5, 9], [6, 9], [7, 3]] },
        { tanks: [0, 0, 3], stats: [[0, 1], [1, 2], [2, 3], [3, 8], [4, 7], [5, 9], [6, 9], [7, 3]] },
        { tanks: [1, 2, 1], stats: [[0, 1], [1, 2], [2, 5], [3, 8], [4, 7], [5, 9], [6, 7], [7, 3]] }
    ]
};

// Load config
let botConfig = {};
if (fs.existsSync(CONFIG_FILE)) {
    botConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
} else {
    console.log('\x1b[32mERROR: bot_config.json not found!\x1b[0m');
    process.exit(1);
}

// Display functions - FIXED clearScreen to work on all terminals
function clearScreen() {
    // Try different methods to clear the screen
    try {
        // Method 1: ANSI escape codes (works on most terminals)
        process.stdout.write('\x1Bc');
        process.stdout.write('\x1B[2J\x1B[0f');
        process.stdout.write('\x1B[3J\x1B[2J\x1B[H');

        // Method 2: Platform specific
        if (os.platform() === 'win32') {
            // For Windows CMD/PowerShell
            exec('cls', () => { });
        } else {
            // For Unix/Linux/Mac
            exec('clear', () => { });
        }

        // Method 3: Print many newlines as fallback
        console.log('\n'.repeat(50));
    } catch (e) {
        // If all else fails, print many newlines
        console.log('\n'.repeat(50));
    }
}

// Green color helper
function green(text) {
    return `\x1b[94m${text}\x1b[0m`;
}

function showHeader() {
    clearScreen();
    console.log(green('╔══════════════════════════════════════════════════════════╗'));
    console.log(green('║                                                          ║'));
    console.log(green('║           ██╗  ██╗███████╗ █████╗ ██████╗                ║'));
    console.log(green('║           ██║  ██║██╔════╝██╔══██╗██╔══██╗               ║'));
    console.log(green('║           ███████║█████╗  ███████║██║  ██║               ║'));
    console.log(green('║           ██╔══██║██╔══╝  ██╔══██║██║  ██║               ║'));
    console.log(green('║           ██║  ██║███████╗██║  ██║██████╔╝               ║'));
    console.log(green('║                                                          ║'));
    console.log(green('║          ██╗     ███████╗███████╗███████╗                ║'));
    console.log(green('║          ██║     ██╔════╝██╔════╝██╔════╝                ║'));
    console.log(green('║          ██║     █████╗  ███████╗███████╗                ║'));
    console.log(green('║          ██║     ██╔══╝  ╚════██║╚════██║                ║'));
    console.log(green('║          ███████╗███████║███████║███████║                ║'));
    console.log(green('║          ╚══════╝╚══════╝╚══════╝╚══════╝                ║'));
    console.log(green('║                                                          ║'));
    console.log(green('║               made by 11nm1                              ║'));
    console.log(green('║               Modified by Levymaze                       ║'));
    console.log(green('║                                                          ║'));
    console.log(green('╚══════════════════════════════════════════════════════════╝'));
    console.log(green(''));
}

function showConfigSummary() {
    console.log(green('════════════════════════════════════════════════'));
    console.log(green('        CURRENT CONFIGURATION'));
    console.log(green('════════════════════════════════════════════════'));
    console.log(green(`Squad ID: ${botConfig.squadId || 'Not set'}`));
    console.log(green(`Region: ${botConfig.region || 'Not set'}`));
    if (botConfig.tankMode === 'multi') {
        console.log(green(`Tank: Multi-Config ([${botConfig.multiTankConfig ? botConfig.multiTankConfig.length : 0} groups])`));
    } else if (botConfig.tankMode === 'preset') {
        console.log(green(`Tank: Preset (${botConfig.activePreset})`));
    } else {
        console.log(green(`Tank: ${botConfig.tank || 'Not set'}`));
    }
    console.log(green(`Tank Mode: ${botConfig.tankMode || 'single'}`));
    console.log(green(`AutoFire: ${botConfig.autoFire ? 'ON' : 'OFF'}`));

    // Count proxies
    let proxyCount = 0;
    if (fs.existsSync('proxies.txt')) {
        const proxyContent = fs.readFileSync('proxies.txt', 'utf8');
        const proxyLines = proxyContent.split('\n').filter(line => line.trim().length > 0);
        proxyCount = proxyLines.length;
    }
    console.log(green(`Available Proxies: ${proxyCount}`));

    console.log(green('════════════════════════════════════════════════'));
    console.log(green(''));
}




// Main Menu
function showMainMenu() {
    showHeader();
    showConfigSummary();

    console.log(green('════════════════════════════════════════════════'));
    console.log(green('             SELECT ACTION'));
    console.log(green('════════════════════════════════════════════════'));
    console.log(green(''));
    console.log(green('1. Spawn bots'));
    console.log(green('2. Configuration'));
    console.log(green('3. Files'));
    console.log(green('4. Nodejs Dependencies'));
    console.log(green('5. Exit'));
    console.log(green(''));
    console.log(green('════════════════════════════════════════════════'));

    rl.question(green('Select option [1-5]: '), handleMainMenu);
}

function handleMainMenu(choice) {
    switch (choice) {
        case '1':
            launchSystem();
            break;
        case '2':
            showConfigMenu();
            break;
        case '3':
            showLogsMenu();
            break;
        case '4':
            showToolsMenu();
            break;
        case '5':
            rl.close();
            process.exit(0);
            break;
        default:
            console.log(green('Invalid choice!'));
            setTimeout(showMainMenu, 1000);
            break;
    }
}

// Launch System
function launchSystem() {
    clearScreen();
    console.log(green('════════════════════════════════════════════════'));
    console.log(green('          LAUNCHING SYSTEM'));
    console.log(green('════════════════════════════════════════════════'));
    console.log(green(''));

    // Check files
    if (!fs.existsSync(SERVER_JS)) {
        console.log(green(`❌ ERROR: ${SERVER_JS} not found!`));
        setTimeout(showMainMenu, 2000);
        return;
    }

    if (!fs.existsSync(LAUNCHER_JS)) {
        console.log(green(`❌ ERROR: ${LAUNCHER_JS} not found!`));
        setTimeout(showMainMenu, 2000);
        return;
    }

    // Start WebSocket Server in background
    console.log(green('Starting WebSocket Server...'));
    console.log(green('   Port: 8080'));
    console.log(green('   Token: follow-3c8f2e'));

    const server = spawn('node', [SERVER_JS], {
        detached: true,
        stdio: 'ignore'
    });
    server.unref();

    console.log(green('Server started in background'));
    console.log(green(''));

    // Wait for server to start
    setTimeout(() => {
        console.log(green('Starting Bot Launcher...'));
        console.log(green(''));

        // Launch headless.js directly
        if (os.platform() === 'win32') {
            spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `node headless.js`], {
                detached: true,
                stdio: 'ignore'
            });
        } else {
            spawn('xterm', ['-e', `node headless.js`], {
                detached: true,
                stdio: 'ignore'
            });
        }

        console.log(green('Bot Logic (headless.js) opened in new window!'));
        console.log(green(''));
        console.log(green('The launcher will:'));
        console.log(green('   • Check WebSocket server connection'));
        console.log(green('   • Show available proxies'));
        console.log(green('   • Select tank preset or single tank'));
        console.log(green('   • Ask for bot count'));
        console.log(green('   • Show instructions for bot control'));
        console.log(green(''));
        console.log(green('In the headless.js window, press [1] to start bots'));
        console.log(green(''));
        console.log(green('Press Enter to return to menu...'));
        rl.question(green(''), () => {
            showMainMenu();
        });
    }, 2000);
}

// 2. Configuration Menu
function showConfigMenu() {
    showHeader();
    console.log(green('════════════════════════════════════════════════'));
    console.log(green('          EDIT BOT CONFIGURATION'));
    console.log(green('════════════════════════════════════════════════'));
    console.log(green(''));
    console.log(green('1. Squad ID'));
    console.log(green('2. Region'));
    console.log(green('3. Name'));
    console.log(green('4. Tank'));
    console.log(green('5. Tank Mode'));
    console.log(green('6. AutoFire'));
    console.log(green('7. Target'));
    console.log(green('8. Aim'));
    console.log(green('9. Chat Spam'));
    console.log(green('10. Stats'));
    console.log(green('11. Launch Delay'));
    console.log(green('12. Reconnect Attempts'));
    console.log(green('13. Reconnect Delay'));
    console.log(green('14. Back to Main Menu'));
    console.log(green(''));
    console.log(green('════════════════════════════════════════════════'));

    rl.question(green('Select setting to change [1-14]: '), handleConfigMenu);
}

function handleConfigMenu(choice) {
    switch (choice) {
        case '1':
            rl.question(green(`Enter new Squad ID (current: ${botConfig.squadId}): `), (val) => {
                if (val) botConfig.squadId = val;
                saveConfig();
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '2':
            rl.question(green(`Enter new Region (current: ${botConfig.region}): `), (val) => {
                if (val) botConfig.region = val;
                saveConfig();
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '3':
            rl.question(green(`Enter new Name (current: ${botConfig.name}): `), (val) => {
                if (val) botConfig.name = val;
                saveConfig();
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '4':
            console.log(green('\nAvailable Tanks:\n'));
            const tankList = Object.keys(tree);
            // Format tank list in columns
            const columns = 4;
            for (let i = 0; i < tankList.length; i += columns) {
                const row = tankList.slice(i, i + columns).map(t => t.padEnd(20));
                console.log(green('  ' + row.join('')));
            }
            console.log('');

            rl.question(green(`Enter TANK NAME (current: ${botConfig.tank}): `), (val) => {
                if (val && tree[val]) {
                    botConfig.tank = val;
                    saveConfig();
                } else if (val) {
                    console.log(green('Invalid tank name! Please choose one from the list.'));
                }
                setTimeout(() => showConfigMenu(), 1500);
            });
            break;
        case '5':
            console.log(green('\n--- TANK SELECTION ---'));
            console.log(green('1. Single Tank Mode'));
            console.log(green('2. Preset Cycling Mode (New System)'));
            console.log(green('3. Multi-Tank Group Mode (Old System)'));

            rl.question(green('Select mode [1-3]: '), (modeChoice) => {
                if (modeChoice === '1') {
                    botConfig.tankMode = 'single';
                    saveConfig();

                    console.log(green('\nAvailable Tanks:\n'));
                    const tankList = Object.keys(tree);
                    for (let i = 0; i < tankList.length; i += 4) {
                        console.log(green('  ' + tankList.slice(i, i + 4).map(t => t.padEnd(20)).join('')));
                    }

                    rl.question(green(`\nEnter TANK NAME (leave empty to keep current ${botConfig.tank}): `), (val) => {
                        val = val.trim();
                        if (val && tree[val]) {
                            botConfig.tank = val;
                        } else if (val) {
                            console.log(green('Invalid tank name! Tank unchanged.'));
                        }
                        saveConfig();
                        setTimeout(() => showConfigMenu(), 1000);
                    });
                } else if (modeChoice === '2') {
                    botConfig.tankMode = 'preset';
                    console.log(green('\nSelect Preset Category:'));
                    const presetNames = Object.keys(PRESETS);
                    presetNames.forEach((name, idx) => {
                        console.log(green(`${idx + 1}. ${name}`));
                    });

                    rl.question(green(`Choose [1-${presetNames.length}]: `), (pIdx) => {
                        const selected = presetNames[parseInt(pIdx) - 1];
                        if (selected) {
                            botConfig.activePreset = selected;
                            saveConfig();
                            console.log(green(`Preset set to: ${selected}`));
                        } else {
                            console.log(green('Invalid selection! Mode set to preset but no preset selected.'));
                        }
                        saveConfig();
                        setTimeout(() => showConfigMenu(), 1000);
                    });
                } else if (modeChoice === '3') {
                    botConfig.tankMode = 'multi';
                    saveConfig();
                    console.log(green('Entering Multi-Group Mode...'));
                    rl.question(green('Continue? (y/n): '), () => showConfigMenu());
                } else {
                    showConfigMenu();
                }
            });
            break;
        case '6':
            rl.question(green('Set AutoFire (true/false): '), (val) => {
                botConfig.autoFire = val.toLowerCase() === 'true';
                saveConfig();
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '7':
            rl.question(green('Set Target Mode (player/mouse/mouse_position): '), (val) => {
                if (val === 'player' || val === 'mouse' || val === 'mouse_position') {
                    botConfig.target = val;
                    saveConfig();
                }
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '8':
            rl.question(green('Set Aim Mode (movement/drone): '), (val) => {
                if (val === 'movement' || val === 'drone') {
                    botConfig.aim = val;
                    saveConfig();
                }
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '9':
            rl.question(green('Enter new Chat Spam message: '), (val) => {
                botConfig.chatSpam = val;
                saveConfig();
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '10':
            console.log(green('Enter 10 stat points, comma-separated (e.g., 3,3,1,9,9,9,9,0,3,0)'));
            rl.question(green(`Current: [${botConfig.stats.join(',')}]: `), (val) => {
                if (val) {
                    const stats = val.split(',').map(s => parseInt(s.trim()));
                    if (stats.length === 10) {
                        botConfig.stats = stats;
                        saveConfig();
                    }
                }
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '11':
            rl.question(green(`Enter Launch Delay in ms (current: ${botConfig.launchDelay}): `), (val) => {
                const delay = parseInt(val);
                if (!isNaN(delay)) {
                    botConfig.launchDelay = delay;
                    saveConfig();
                }
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '12':
            rl.question(green(`Enter Reconnect Attempts (current: ${botConfig.reconnectAttempts}): `), (val) => {
                const attempts = parseInt(val);
                if (!isNaN(attempts)) {
                    botConfig.reconnectAttempts = attempts;
                    saveConfig();
                }
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '13':
            rl.question(green(`Enter Reconnect Delay in ms (current: ${botConfig.reconnectDelay}): `), (val) => {
                const delay = parseInt(val);
                if (!isNaN(delay)) {
                    botConfig.reconnectDelay = delay;
                    saveConfig();
                }
                setTimeout(() => showConfigMenu(), 100);
            });
            break;
        case '14':
            showMainMenu();
            break;
        default:
            console.log(green('Invalid choice!'));
            setTimeout(showConfigMenu, 1000);
            break;
    }
}

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2));
    console.log(green('Configuration saved!'));
}

// 3. Logs Menu
function showLogsMenu() {
    showHeader();
    console.log(green('════════════════════════════════════════════════'));
    console.log(green('               VIEW LOGS'));
    console.log(green('════════════════════════════════════════════════'));
    console.log(green(''));
    console.log(green('1. success_log.json'));
    console.log(green('2. status_cache.json'));
    console.log(green('3. names.txt'));
    console.log(green('4. proxies.txt'));
    console.log(green('5. Back to Main Menu'));
    console.log(green(''));

    rl.question(green('Select log to view [1-5]: '), handleLogsMenu);
}

function handleLogsMenu(choice) {
    showHeader();
    console.log(green('════════════════════════════════════════════════'));

    switch (choice) {
        case '1':
            console.log(green('              success_log.json'));
            console.log(green('════════════════════════════════════════════════\n'));
            if (fs.existsSync('success_log.json')) {
                console.log(green(fs.readFileSync('success_log.json', 'utf8')));
            } else {
                console.log(green('No success_log.json found'));
            }
            break;
        case '2':
            console.log(green('              status_cache.json'));
            console.log(green('════════════════════════════════════════════════\n'));
            if (fs.existsSync('status_cache.json')) {
                console.log(green(fs.readFileSync('status_cache.json', 'utf8')));
            } else {
                console.log(green('No status_cache.json found'));
            }
            break;
        case '3':
            console.log(green('                   names.txt'));
            console.log(green('════════════════════════════════════════════════\n'));
            if (fs.existsSync('names.txt')) {
                console.log(green(fs.readFileSync('names.txt', 'utf8')));
            } else {
                console.log(green('names.txt not found'));
            }
            break;
        case '4':
            console.log(green('                  proxies.txt'));
            console.log(green('════════════════════════════════════════════════\n'));
            if (fs.existsSync('proxies.txt')) {
                console.log(green(fs.readFileSync('proxies.txt', 'utf8')));
            } else {
                console.log(green('proxies.txt not found'));
            }
            break;
        case '5':
            showMainMenu();
            return;
        default:
            console.log(green('Invalid choice!'));
            setTimeout(showLogsMenu, 1000);
            return;
    }

    console.log(green('\n════════════════════════════════════════════════'));
    console.log(green('Press Enter to continue...'));
    rl.question(green(''), showLogsMenu);
}

// 4. Tools Menu
function showToolsMenu() {
    showHeader();
    console.log(green('════════════════════════════════════════════════'));
    console.log(green('                TOOLS'));
    console.log(green('════════════════════════════════════════════════'));
    console.log(green(''));
    console.log(green('1. Check Node.js version'));
    console.log(green('2. Install dependencies'));
    console.log(green('3. Test server connection'));
    console.log(green('4. Clear logs'));
    console.log(green('5. View all files'));
    console.log(green('6. Back to Main Menu'));
    console.log(green(''));

    rl.question(green('Select tool [1-6]: '), handleToolsMenu);
}

function handleToolsMenu(choice) {
    showHeader();
    console.log(green('════════════════════════════════════════════════'));
    console.log(green('                TOOLS'));
    console.log(green('════════════════════════════════════════════════\n'));

    switch (choice) {
        case '1':
            console.log(green(`Node.js Version: ${process.version}\n`));
            break;
        case '2':
            console.log(green('Installing dependencies...\n'));
            exec('npm install ws msgpack-lite https-proxy-agent socks-proxy-agent msgpackr node-fetch', (err) => {
                showHeader();
                console.log(green('════════════════════════════════════════════════'));
                console.log(green('                TOOLS'));
                console.log(green('════════════════════════════════════════════════\n'));
                if (err) {
                    console.log(green(`Error: ${err.message}\n`));
                } else {
                    console.log(green('Dependencies installed successfully!\n'));
                }
                console.log(green('Press Enter to continue...'));
                rl.question(green(''), showToolsMenu);
            });
            return;
        case '3':
            console.log(green('Testing connection to localhost:8080...\n'));
            const net = require('net');
            const client = new net.Socket();
            client.setTimeout(1000);

            client.on('connect', () => {
                showHeader();
                console.log(green('════════════════════════════════════════════════'));
                console.log(green('                TOOLS'));
                console.log(green('════════════════════════════════════════════════\n'));
                console.log(green('Server is running on port 8080\n'));
                client.destroy();
                console.log(green('Press Enter to continue...'));
                rl.question(green(''), showToolsMenu);
            });

            client.on('timeout', () => {
                showHeader();
                console.log(green('════════════════════════════════════════════════'));
                console.log(green('                TOOLS'));
                console.log(green('════════════════════════════════════════════════\n'));
                console.log(green('Server not responding on port 8080\n'));
                client.destroy();
                console.log(green('Press Enter to continue...'));
                rl.question(green(''), showToolsMenu);
            });

            client.on('error', () => {
                showHeader();
                console.log(green('════════════════════════════════════════════════'));
                console.log(green('                TOOLS'));
                console.log(green('════════════════════════════════════════════════\n'));
                console.log(green('Server not found on port 8080\n'));
                console.log(green('Press Enter to continue...'));
                rl.question(green(''), showToolsMenu);
            });

            client.connect(8080, 'localhost');
            return;
        case '4':
            let cleared = 0;
            if (fs.existsSync('success_log.json')) {
                fs.unlinkSync('success_log.json');
                cleared++;
            }
            if (fs.existsSync('status_cache.json')) {
                fs.unlinkSync('status_cache.json');
                cleared++;
            }
            console.log(green(`Cleared ${cleared} log file(s)\n`));
            break;
        case '5':
            console.log(green('Files in current directory:\n'));
            const files = fs.readdirSync('.');
            files.forEach(file => {
                console.log(green(`  ${file}`));
            });
            console.log(green(`\nTotal: ${files.length} files\n`));
            break;
        case '6':
            showMainMenu();
            return;
        default:
            console.log(green('Invalid choice!\n'));
    }

    console.log(green('════════════════════════════════════════════════'));
    console.log(green('Press Enter to continue...'));
    rl.question(green(''), showToolsMenu);
}

// Start the menu
showMainMenu();
