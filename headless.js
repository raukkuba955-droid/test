const fs = require('fs');
const ws = require('ws');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { pack, unpack } = require("msgpackr");
const url = require('url');
const { fork } = require('child_process');
const fetchModule = require('node-fetch');
const realFetch = fetchModule.default || fetchModule;
const Response = fetchModule.Response || (fetchModule.default && fetchModule.default.Response) || require('node-fetch').Response;
const readline = require('readline');
const commandFile = 'launch.bat';

// ===== CHECK FOR COMMAND LINE ARGUMENTS =====
const args = process.argv.slice(2);
let autoStartCount = 0;
let autoStartMode = false;

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--count' && args[i + 1]) {
    autoStartCount = parseInt(args[i + 1]);
    autoStartMode = true;
    break;
  }
}

function checkBatchCommands() {
  try {
    if (fs.existsSync(commandFile)) {
      const command = fs.readFileSync(commandFile, 'utf8').trim();
      fs.unlinkSync(commandFile);
      console.log(`[BATCH] Received command: ${command}`);
    }
  } catch (e) { }
}

setInterval(checkBatchCommands, 2000);
process.on('uncaughtException', function (e) { console.log(e) });

if (!process.env.IS_WORKER) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const configFilePath = 'bot_config.json';

  const getPath = function (name, tree) {
    let p = '', o = tree[name];
    while (o) { p = o[0] + p; let n = o[1]; if (n === 'Basic') { break } o = tree[n] }
    return p;
  };

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

  let botConfig = {
    squadId: 'epb',
    name: '[SSS] tristam',
    tank: 'Booster',
    tankMode: 'single', // 'single' or 'preset'
    activePreset: 'Best AR Tanks',
    keys: [],
    autoFire: false,
    autoRespawn: true,
    target: 'player',
    aim: 'drone',
    chatSpam: '',
    stats: [2, 2, 2, 6, 6, 8, 8, 8, 0],
    launchDelay: 20000
  };

  let workers = [];
  let proxies = [];
  let paused = false;
  let currentProxyIndex = 0;

  function saveConfig() {
    try {
      const configToSave = { ...botConfig, currentProxyIndex };
      fs.writeFileSync(configFilePath, JSON.stringify(configToSave, null, 2), 'utf8');
    } catch (e) { }
  }

  function loadConfig() {
    try {
      if (fs.existsSync(configFilePath)) {
        const savedConfigData = fs.readFileSync(configFilePath, 'utf8');
        const savedConfig = JSON.parse(savedConfigData);
        botConfig = { ...botConfig, ...savedConfig };
        if (savedConfig.currentProxyIndex !== undefined) {
          currentProxyIndex = savedConfig.currentProxyIndex;
        }
      }
    } catch (e) { }
  }

  function loadProxies() {
    try {
      if (!fs.existsSync('proxies.txt')) {
        console.log('[PROXIES] proxies.txt not found.');
        return;
      }
      const proxyData = fs.readFileSync('proxies.txt', 'utf8');
      const lines = proxyData.split(/\r?\n/).filter(line => line.trim() !== '');
      proxies = [];
      for (const line of lines) {
        let text = line.trim();
        let protocol = 'http';

        // Support explicit protocol prefixes
        if (text.startsWith('socks5h://')) {
          protocol = 'socks5h';
          text = text.slice(10);
        } else if (text.startsWith('socks5://')) {
          protocol = 'socks5h'; // Force socks5h for remote DNS
          text = text.slice(9);
        } else if (text.startsWith('socks://')) {
          protocol = 'socks5h';
          text = text.slice(8);
        } else if (text.startsWith('http://')) {
          protocol = 'http';
          text = text.slice(7);
        } else if (text.startsWith('https://')) {
          protocol = 'http';
          text = text.slice(8);
        } else if (text.includes('lightningproxies') || text.includes('v6.')) {
          // LightningProxies/IPv6 proxies are usually SOCKS5 requiring remote DNS
          protocol = 'socks5h';
        }

        const parts = text.split(':');
        if (parts.length === 4) {
          const [ip, port, user, pass] = parts;
          const proxyUrl = `${protocol}://${user}:${pass}@${ip}:${port}`;
          proxies.push({ type: protocol.startsWith('socks') ? 'socks' : 'http', url: proxyUrl });
        } else if (parts.length === 2) {
          const [ip, port] = parts;
          const proxyUrl = `${protocol}://${ip}:${port}`;
          proxies.push({ type: protocol.startsWith('socks') ? 'socks' : 'http', url: proxyUrl });
        }
      }
      console.log(`[PROXIES] Loaded ${proxies.length} proxies.`);
    } catch (e) {
      console.log('[PROXIES] Error loading proxies.txt:', e.message);
    }
  }

  // === MAIN FUNCTION TO START BOTS ===
  function startBots(numBots) {
    let launchQueue = [];
    const hasProxies = proxies.length > 0;
    const botIdCounter = Date.now() % 10000;

    const indicesToKeys = (indices) => {
      const keys = ['Y', 'U', 'I', 'H', 'J', 'K', 'L', ';', "'"];
      return indices.map(idx => keys[idx] || '').join('');
    };

    const convertStats = (statsArr) => {
      let flat = new Array(10).fill(0);
      statsArr.forEach(([idx, val]) => {
        if (idx >= 0 && idx < 10) flat[idx] = val;
      });
      return flat;
    };

    if (botConfig.tankMode === 'preset' && PRESETS[botConfig.activePreset]) {
      const currentPreset = PRESETS[botConfig.activePreset];
      for (let i = 0; i < numBots; i++) {
        const entry = currentPreset[i % currentPreset.length];
        launchQueue.push({
          tank: indicesToKeys(entry.tanks),
          stats: convertStats(entry.stats),
          keys: []
        });
      }
    } else if (botConfig.tankMode === 'multi' && botConfig.multiTankConfig && Array.isArray(botConfig.multiTankConfig)) {
      // 1. Add explicitly configured groups
      botConfig.multiTankConfig.forEach(group => {
        const count = group.count || 1;
        for (let k = 0; k < count; k++) {
          if (launchQueue.length < numBots) {
            launchQueue.push({ tank: group.tank, keys: group.keys || [] });
          }
        }
      });

      // 2. Fill remainder with new random groups
      if (launchQueue.length < numBots) {
        // Determine group size from the last config entry, or default to 1
        let groupSize = 1;
        if (botConfig.multiTankConfig.length > 0) {
          groupSize = botConfig.multiTankConfig[botConfig.multiTankConfig.length - 1].count || 1;
        }

        const tankNames = Object.keys(tree);

        while (launchQueue.length < numBots) {
          // Pick a random tank for this new chunk
          const randomTank = tankNames[Math.floor(Math.random() * tankNames.length)];

          // Add up to groupSize bots with this tank
          for (let k = 0; k < groupSize && launchQueue.length < numBots; k++) {
            launchQueue.push({ tank: randomTank, keys: [] });
          }
        }
      }
    } else {
      for (let i = 0; i < numBots; i++) {
        launchQueue.push({
          tank: getPath(botConfig.tank, tree),
          stats: [...botConfig.stats],
          keys: botConfig.keys
        });
      }
    }
    launchQueue.forEach((botSpec, i) => {
      let selectedProxy = false;
      if (hasProxies) {
        const pInfo = proxies[currentProxyIndex % proxies.length];
        selectedProxy = { type: pInfo.type, url: pInfo.url };

        const displayUrl = pInfo.url.includes('@') ? pInfo.url.split('@')[1] : pInfo.url;
        console.log(`[PROXIES] Bot #${i + 1} assigned proxy #${currentProxyIndex % proxies.length + 1}: ${displayUrl}`);

        currentProxyIndex++;
        // Periodic save of the index to handle restarts smoothly
        if (currentProxyIndex % 5 === 0) saveConfig();
      }

      const config = {
        id: botIdCounter + i,
        proxy: selectedProxy,
        hash: '#' + botConfig.squadId,
        name: botConfig.name,
        stats: botSpec.stats || [...botConfig.stats],
        type: 'follow',
        token: 'follow-3c8f2e',
        autoFire: botConfig.autoFire,
        autoRespawn: botConfig.autoRespawn,
        target: botConfig.target,
        aim: botConfig.aim,
        keys: [...botSpec.keys],
        tank: botSpec.tank,
        chatSpam: botConfig.chatSpam,
        squadId: botConfig.squadId,
        loadFromCache: true,
        cache: false,
        arrasCache: './ah.txt',
      };

      setTimeout(() => {
        console.log(`Launching bot #${config.id} (${botSpec.tank})...`);
        const worker = fork(__filename, [], { env: { ...process.env, IS_WORKER: 'true' } });
        worker.send({ type: 'start', config: config });
        workers.push(worker);
      }, botConfig.launchDelay * i);
    });

    // Final save of the index after all bots setup
    saveConfig();

    setTimeout(() => {
      console.log(`\n✓ All ${numBots} bots launched!`);
      if (!autoStartMode) {
        setTimeout(displayMenu, 2000);
      }
    }, botConfig.launchDelay * numBots + 1000);
  }

  function disconnectBots() {
    console.log(`\nDisconnecting ${workers.length} bot(s)...`);
    workers.forEach(worker => worker.kill());
    workers = [];
    paused = false;
    if (!autoStartMode) {
      setTimeout(displayMenu, 1000);
    }
  }

  function togglePause() {
    paused = !paused;
    console.log(`\n${paused ? 'Pausing' : 'Resuming'} all bots...`);
    workers.forEach(worker => worker.send({ type: 'pause', paused: paused }));
    if (!autoStartMode) {
      setTimeout(displayMenu, 1000);
    }
  }

  // === MENU SYSTEM ===
  function displayMenu() {
    console.clear();
    console.log('═════════════════════════════════════');
    console.log('        ARRAS.IO BOT PANEL');
    console.log('═════════════════════════════════════');
    console.log(`Bots Running: ${workers.length}`);
    console.log(`Squad ID: ${botConfig.squadId}`);
    console.log(`Tank: ${botConfig.tank}`);
    console.log(`Bots Paused: ${paused ? 'Yes' : 'No'}`);
    console.log('');
    console.log('--- ACTIONS ---');
    console.log('[1] Start Bots');
    console.log('[2] Stop All Bots');
    console.log('[3] Pause/Resume Bots');
    console.log('[4] Settings');
    console.log('[5] Exit');
    console.log('[7] Simulate Key');
    console.log('═════════════════════════════════════');

    rl.question('Select option (1-5): ', handleMenuChoice);
  }

  function handleMenuChoice(choice) {
    choice = choice.trim();

    // Clear input buffer
    rl.pause();
    rl.resume();

    switch (choice) {
      case '1':
        askBotCount();
        break;
      case '2':
        disconnectBots();
        break;
      case '3':
        togglePause();
        break;
      case '4':
        showSettings();
        break;
      case '5':
        console.log('\nExiting...');
        disconnectBots();
        rl.close();
        process.exit();
        break;
      case '7':
        askKeyToSimulate();
        break;
      default:
        console.log('\nInvalid option. Please choose 1-5.');
        setTimeout(displayMenu, 1000);
        break;
    }
  }

  function askBotCount() {
    console.log('\n');
    rl.question('How many bots to start? ', (answer) => {
      const num = parseInt(answer.trim());

      if (isNaN(num) || num < 1) {
        console.log('\nInvalid number. Please enter a positive number.');
        setTimeout(askBotCount, 500);
        return;
      }

      console.log(`\nStarting ${num} bots...`);
      startBots(num);
    });
  }

  function showSettings() {
    console.clear();
    console.log('═════════════════════════════════════');
    console.log('           SETTINGS');
    console.log('═════════════════════════════════════');
    console.log(`[1] Squad ID: ${botConfig.squadId}`);
    console.log(`[2] Bot Name: ${botConfig.name}`);
    console.log(`[3] Tank Selection (Mode: ${botConfig.tankMode.toUpperCase()})`);
    if (botConfig.tankMode === 'single') {
      console.log(`    Current Tank: ${botConfig.tank}`);
    } else {
      console.log(`    Active Preset: ${botConfig.activePreset}`);
    }
    console.log(`[4] AutoFire: ${botConfig.autoFire ? 'ON' : 'OFF'}`);
    console.log(`[5] Launch Delay: ${botConfig.launchDelay}ms`);
    console.log(`[6] Back to Main Menu`);
    console.log('═════════════════════════════════════');

    rl.question('Select setting to change (1-6): ', handleSettingChoice);
  }

  function handleSettingChoice(choice) {
    choice = choice.trim();

    switch (choice) {
      case '1':
        rl.question(`New Squad ID (current: ${botConfig.squadId}): `, (val) => {
          botConfig.squadId = val || botConfig.squadId;
          saveConfig();
          console.log('Squad ID updated!');
          setTimeout(showSettings, 1000);
        });
        break;
      case '2':
        rl.question(`New Bot Name (current: ${botConfig.name}): `, (val) => {
          botConfig.name = val || botConfig.name;
          saveConfig();
          console.log('Bot name updated!');
          setTimeout(showSettings, 1000);
        });
        break;
      case '3':
        console.log('\n--- TANK SELECTION ---');
        console.log('[1] Single Tank Mode');
        console.log('[2] Preset Cycling Mode (from bots system)');
        rl.question('Select mode (1-2): ', (mode) => {
          if (mode === '2') {
            botConfig.tankMode = 'preset';
            console.log('\n--- AVAILABLE PRESETS ---');
            Object.keys(PRESETS).forEach((p, idx) => console.log(`[${idx + 1}] ${p}`));
            rl.question('Select preset: ', (pIdx) => {
              const keys = Object.keys(PRESETS);
              const selected = keys[parseInt(pIdx) - 1];
              if (selected) {
                botConfig.activePreset = selected;
                saveConfig();
                console.log(`Preset set to: ${selected}`);
              } else {
                console.log('Invalid selection.');
              }
              setTimeout(showSettings, 1000);
            });
          } else {
            botConfig.tankMode = 'single';
            // Determine tiers dynamically for display
            const tiers = { 'Tier 1': [], 'Tier 2': [], 'Tier 3': [], 'Tier 4': [], 'Special/Other': [] };

            const getDepth = (name) => {
              let depth = 1;
              let current = name;
              while (tree[current] && tree[current][1] !== 'Basic') {
                current = tree[current][1];
                if (!current) break;
                depth++;
              }
              return depth;
            };

            Object.keys(tree).forEach(tank => {
              if (tank === 'Basic') return;
              if (tree[tank] && tree[tank][1] === 'Basic') {
                tiers['Tier 2'].push(tank);
              } else {
                const d = getDepth(tank);
                if (d === 2) tiers['Tier 3'].push(tank);
                else if (d === 3) tiers['Tier 4'].push(tank);
                else tiers['Special/Other'].push(tank);
              }
            });

            // Basic is Tier 1
            tiers['Tier 1'].push('Basic');

            console.log('\n--- AVAILABLE TANKS ---');
            for (const [tier, tanks] of Object.entries(tiers)) {
              if (tanks.length > 0) {
                console.log(`\n[${tier}]:`);
                console.log(tanks.sort().join(', '));
              }
            }
            console.log('\n-----------------------');

            rl.question(`New Tank (current: ${botConfig.tank}): `, (val) => {
              val = val.trim();
              if (!val) {
                // Keep current tank, but we still need to save because mode changed to 'single'
                saveConfig();
                console.log(`Mode switched to Single. Tank kept as: ${botConfig.tank}`);
              } else if (tree[val] || val === 'Basic') {
                botConfig.tank = val;
                saveConfig();
                console.log('Tank updated!');
              } else {
                // Even if tank is invalid, the mode change was already set at line 442.
                // Should we save anyway? Probably best to just say invalid and keep old state if they want it perfect.
                // But the user said "nothing happens", so saving the mode change is important.
                console.log('Invalid tank name. Leaving tank as is but set to Single mode.');
                saveConfig();
              }
              setTimeout(showSettings, 1000);
            });
          }
        });
        break;
      case '4':
        rl.question('AutoFire (on/off): ', (val) => {
          botConfig.autoFire = val.toLowerCase() === 'on';
          saveConfig();
          console.log(`AutoFire ${botConfig.autoFire ? 'ENABLED' : 'DISABLED'}`);
          setTimeout(showSettings, 1000);
        });
        break;
      case '5':
        rl.question(`New Launch Delay in ms (current: ${botConfig.launchDelay}): `, (val) => {
          const delay = parseInt(val);
          if (!isNaN(delay) && delay >= 0) {
            botConfig.launchDelay = delay;
            saveConfig();
            console.log(`Launch delay set to ${delay}ms`);
          } else {
            console.log('Invalid number.');
          }
          setTimeout(showSettings, 1000);
        });
        break;
      case '6':
        displayMenu();
        break;
      default:
        console.log('\nInvalid choice.');
        setTimeout(showSettings, 1000);
        break;
    }
  }

  function askKeyToSimulate() {
    rl.question('\nEnter key to simulate (e.g. e, space, enter): ', (input) => {
      const code = mapInputToCode(input);
      if (code) {
        console.log(`\nSimulating key '${code}' on ${workers.length} workers...`);
        workers.forEach(w => w.send({ type: 'key_command', key: code }));
      } else {
        console.log(`\nInvalid key input: ${input}`);
      }
      setTimeout(displayMenu, 1500);
    });
  }

  function mapInputToCode(input) {
    if (!input) return null;
    input = input.trim();
    const lower = input.toLowerCase();

    if (lower.length === 1) {
      // Single letter/number
      if (lower >= 'a' && lower <= 'z') return 'Key' + lower.toUpperCase();
      if (lower >= '0' && lower <= '9') return 'Digit' + lower;
    }

    const map = {
      'space': 'Space',
      'enter': 'Enter',
      'shift': 'ShiftLeft',
      'ctrl': 'ControlLeft',
      'alt': 'AltLeft',
      'tab': 'Tab',
      'esc': 'Escape',
      'escape': 'Escape',
      'up': 'ArrowUp',
      'down': 'ArrowDown',
      'left': 'ArrowLeft',
      'right': 'ArrowRight',
      'backspace': 'Backspace'
    };

    return map[lower] || null;
  }

  // === INITIALIZE ===
  loadConfig();
  loadProxies();

  // If started with --count argument, auto-start bots
  if (autoStartMode && autoStartCount > 0) {
    console.log(`\nARRAS.IO BOT PANEL - Auto Start Mode`);
    console.log(`=====================================`);
    console.log(`Starting ${autoStartCount} bots automatically...`);
    startBots(autoStartCount);
  } else {
    // Otherwise show the menu
    setTimeout(displayMenu, 500);
  }

} else {
  // --- WORKER PROCESS (Bot logic) ---
  let isPaused = false;
  let currentBotInterface = {};

  process.on('message', (message) => {
    if (message.type === 'start') {
      const config = message.config;
      options.token = config.token;
      options.loadFromCache = config.loadFromCache;
      options.cache = config.cache;
      options.arrasCache = config.arrasCache;

      arras.then(function () {
        currentBotInterface = arras.create(config);
      });
    } else if (message.type === 'pause') {
      isPaused = message.paused;
      if (currentBotInterface.log) {
        currentBotInterface.log(`Bot state is now: ${isPaused ? 'PAUSED' : 'RESUMED'}`);
      }
    } else if (message.type === 'key_command') {
      const key = message.key;
      if (currentBotInterface.log) currentBotInterface.log(`CMD Key: ${key}`);

      // Find trigger functions in scope? No, they are inside run()...
      // We need 'run' scope to access 'trigger'.
      // Actually, trigger is not exposed globally. 
      // Wait, the message listener is currently OUTSIDE 'run'.
      // We need a way to pass this down.
      // currentBotInterface is the object returned by arras.create(config).
      // Does it expose trigger? No.

      // FIX: Reroute this message to the internal listeners if possible.
      // Or store a global reference to the trigger?
      // Since we are in the worker context, let's look at where 'run' is called.
      // 'arras.create(config)' calls 'run(app, config, ...)'
      // 'run' defines 'trigger' and 'listeners'.

      // We can expose an event handler on currentBotInterface.
      if (currentBotInterface.simulateKey) {
        currentBotInterface.simulateKey(key);
      }
    }
  });

  const options = { start: () => { } };

  const tree = {
    'Browser': ['Y', 'Surfer'], 'Strider': ['K', 'Fighter'], 'Automingler': ['J', 'Mingler'], 'Mingler': ['K', 'Hexa Tank'], 'Necromancer': ['Y', 'Necromancer'], 'Underseer': ['I', 'Director'], 'Firework': ['Y', 'Rocketeer'], 'Leviathan': ['H', 'Rocketeer'], 'Rocketeer': ['K', 'Launcher'], 'Annihilator': ['U', 'Destroyer'], 'Destroyer': ['Y', 'Pounder'], 'Swarmer': ['I', 'Launcher'], 'Twister': ['U', 'Launcher'], 'Launcher': ['H', 'Pounder'], 'Fighter': ['Y', 'TriAngle'], 'Surfer': ['K', 'TriAngle'], 'Sprayer': ['H', 'Machine Gun'], 'Redistributor': ['Y', 'Sprayer'], 'Spreadshot': ['U', 'Triple Shot'], 'Gale': ['I', 'Octo Tank'], 'Crackshot': ['J', 'Penta Shot'], 'Penta Shot': ['Y', 'Triple Shot'], 'Twin': ['Y', 'Basic'], 'Double Twin': ['Y', 'Twin'], 'Triple Shot': ['U', 'Twin'], 'Sniper': ['U', 'Basic'], 'Machine Gun': ['I', 'Basic'], 'Gunner': ['I', 'Machine Gun'], 'Machine Gunner': ['H', 'Gunner'], 'Nailgun': ['U', 'Gunner'], 'Pincer': ['K', 'Nailgun'], 'Flank Guard': ['H', 'Basic'], 'Hexa Tank': ['Y', 'Flank Guard'], 'Octo Tank': ['Y', 'Hexa Tank'], 'Cyclone': ['U', 'Hexa Tank'], 'HexaTrapper': ['I', 'Hexa Tank'], 'TriAngle': ['U', 'Flank Guard'], 'Fighter': ['Y', 'TriAngle'], 'Booster': ['U', 'TriAngle'], 'Falcon': ['I', 'TriAngle'], 'Bomber': ['H', 'TriAngle'], 'AutoTriAngle': ['J', 'TriAngle'], 'Surfer': ['K', 'TriAngle'], 'Auto3': ['I', 'Flank Guard'], 'Auto5': ['Y', 'Auto3'], 'Mega3': ['U', 'Auto3'], 'Auto4': ['I', 'Auto3'], 'Banshee': ['H', 'Auto3'], 'Trap Guard': ['H', 'Flank Guard'], 'Buchwhacker': ['Y', 'Trap Guard'], 'Gunner Trapper': ['U', 'Trap Guard'], 'Conqueror': ['J', 'Trap Guard'], 'Bulwark': ['K', 'Trap Guard'], 'TriTrapper': ['J', 'Flank Guard'], 'Fortress': ['Y', 'TriTrapper'], 'Septatrapper': ['I', 'TriTrapper'], 'Whirlwind': ['H', 'Septatrapper'], 'Nona': ['Y', 'Septatrapper'], 'SeptaMachine': ['U', 'Septatrapper'], 'Architect': ['H', 'TriTrapper'], 'TripleTwin': ['K', 'Flank Guard'], 'Director': ['J', 'Basic'], 'Pounder': ['K', 'Basic'], 'Healer': ['X', 'Basic'], 'Physician': ['Space', 'Healer'], 'Basic': [], 'Overseer': ['Y', 'Director'], 'Cruiser': ['U', 'Director'], 'Underseer': ['I', 'Director'], 'Spawner': ['H', 'Director'], 'Director Drive': ['J', 'Director'], 'Honcho': ['K', 'Director'], 'Manager': ['X', 'Director'], 'Foundry': ['Space', 'Spawner'], 'Top Banana': ['Space', 'Foundry'], 'Shopper': ['K', 'Foundry'], 'Mega Spawner': ['I', 'Spawner'], 'Ultra Spawner': ['Y', 'Mega Spawner'], 'Assassin': ['Y', 'Sniper'], 'Stalker': ['I', 'Assassin'], 'Pursuer': ['Y', 'Stalker'],
  }, getPath = function (name) {
    let p = '', o = tree[name]
    while (o) {
      p = o[0] + p
      let n = o[1]
      if (n === 'Basic') { break }
      o = tree[n]
    }
    return p
  }

  WebAssembly.instantiateStreaming = false
  const arras = (function () {
    const log = function () {
      global.console.log(`[headless]`, ...arguments)
    }
    let lastRecieve = 0
    let connect = function () {
      log('Connecting to leader/follower server...')
      socket = new ws(wu, {
        "headers": {
          "user-agent": "Mozilla/5.0 (X11; CrOS x86_64 14588.123.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "connection": "Upgrade",
          "origin": "https://arras.io",
          "pragma": "no-cache",
          "upgrade": "websocket"
        },
        "followRedirects": true,
        "origin": "https://arras.io",
        "localAddress": 0
      })
      socket.binaryType = 'arraybuffer'
      socket.addEventListener('open', function () {
        log('Connected to leader/follower server. Waiting for server name to subscribe.')
      })
      socket.addEventListener('message', function (e) {
        try {
          if (!currentBotInterface.target) return;

          let data = unpack(new Uint8Array(e.data));
          if (!data || !Array.isArray(data)) { return }

          const type = data.splice(0, 1)[0];
          switch (type) {
            case 101: {
              if (data.length >= 5) {
                currentBotInterface.target[0] = data[0] / 10;
                currentBotInterface.target[1] = data[1] / 10;
                currentBotInterface.target[2] = data[2] / 10;
                currentBotInterface.target[3] = data[3] / 10;
                currentBotInterface.target[4] = data[4];
                currentBotInterface.setActive(5);
                lastRecieve = performance.now();
              }
              break;
            }
            case 102: {
              log(`Leader ${data[0]} is now inactive.`);
              currentBotInterface.setActive(0);
              currentBotInterface.setSubscribed(false);
              break;
            }
            case 103: {
              log(`Error from server: ${data[0]}`);
              currentBotInterface.setActive(0);
              currentBotInterface.setSubscribed(false);
              break;
            }
            case 105: {
              if (data.length >= 1) {
                const key = data[0];
                log(`Received Global Key Command: ${key}`);
                if (currentBotInterface && trigger.keydown && trigger.keyup) {
                  // Attempt to map or just send raw if compatible
                  // headless.js 'trigger' expects 'code'
                  trigger.keydown(key);
                  setTimeout(() => {
                    trigger.keyup(key);
                  }, 50);
                }
              }
              break;
            }
          }
        } catch (e) { log('Error processing message from server:', e); }
      })
      socket.addEventListener('close', function () {
        log('Disconnected from leader/follower server.')
        socket = false
        subscribedToLeader = false;
        setTimeout(connect, 3000)
      })
    }, socket = false, send = function (p) {
      if (socket && socket.readyState === 1) {
        socket.send(pack(p))
      }
    }, wu = 'ws://localhost:8080', subscribedToLeader = false;
    connect();

    let app = false
    const wasm = function () {
      return {
        arrayBuffer: function () {
          return app
        }
      }
    }
    let lastStatus = 0, statusData = ''
    const getStatus = function (f, s) {
      let now = global.performance.now()
      if (statusData && now - lastStatus < 15000) {
        return {
          then: function () {
            return {
              then: function (f) {
                try {
                  let i = JSON.parse(statusData)
                  s(i)
                  f(i)
                } catch (e) { }
              }
            }
          }
        }
      }
      let then = function () { }
      realFetch(f).then(x => x.text()).then(x => {
        if (!x || x.trim() === '') return;
        statusData = x
        try {
          let i = JSON.parse(x)
          s(i)
          then(i)
        } catch (e) { }
      }).catch(e => { })
      return {
        then: function () {
          return {
            then: function (f) {
              then = f
            }
          }
        }
      }
    }

    let ready = false, script = false, o = [], then = function (f) {
      if (ready) {
        f();
      } else {
        o.push(f);
      }
    };

    const initializeAndRunQueue = function () {
      ready = true;
      log('Headless arras ready.');
      for (let i = 0, l = o.length; i < l; i++) {
        o[i]();
      }
      o = [];
      then = function (f) {
        f();
      };
    }

    let prerequisites = 0;
    const onPrerequisiteLoaded = function () {
      prerequisites++;
      if (prerequisites === 2) {
        initializeAndRunQueue();
      }
    }

    realFetch('https://arras.io/app.wasm').then(x => {
      x.arrayBuffer().then(x => {
        app = x;
        log('Prerequisite 1/2: app.wasm loaded.');
        onPrerequisiteLoaded();
      })
    });

    const loadScript = function () {
      const activateBot = (scriptContent) => {
        script = scriptContent;
        log('Prerequisite 2/2: Game script loaded.');
        onPrerequisiteLoaded();
      };

      const extractScriptFromHtml = (html) => {
        const scriptTagStart = html.indexOf('<script>');
        if (scriptTagStart === -1) {
          log('Error: Could not find <script> tag in content.');
          return null;
        }
        let scriptContent = html.slice(scriptTagStart + 8);
        const scriptTagEnd = scriptContent.indexOf('</script');
        if (scriptTagEnd === -1) {
          log('Error: Could not find closing </script> tag.');
          return null;
        }
        scriptContent = scriptContent.slice(0, scriptTagEnd);
        return scriptContent;
      };

      log('Fetching from https://arras.io to ensure correct script execution order...');
      realFetch('https://arras.io').then(x => x.text()).then(html => {
        const extractedScript = extractScriptFromHtml(html);
        if (extractedScript) {
          activateBot(extractedScript);
        }
      }).catch(err => {
        log('FATAL: Could not fetch from arras.io. Please check network or use a valid cache file.', err);
      });
    }
    loadScript();

    const run = function (x, config, oa) {
      const log = function () {
        global.console.log(`[headless ${config.id}]`, ...arguments)
      }

      const eventLog = [];

      let target = [0, 0, 0, 0, false],
        active = 0,
        subscribedToLeader = false;

      const internalBotInterface = {
        target: target,
        setActive: (val) => { active = val; },
        setSubscribed: (val) => { subscribedToLeader = val; },
        log: log,
        simulateKey: (code) => {
          if (trigger.keydown && trigger.keyup) {
            trigger.keydown(code);
            setTimeout(() => trigger.keyup(code), 50);
          }
        }
      };

      let destroy = function () {
        if (destroyed) { return }
        log('Destroying instance...')
        if (gameSocket && gameSocket.readyState < 3) {
          gameSocket.close()
          gameSocket = false
        }
        clearInterval(mainInterval)
        destroyed = true
      }, destroyed = false
      const setInterval = new Proxy(global.setInterval, {
        apply: function (a, b, c) {
          if (destroyed) { return }
          return Reflect.apply(a, b, c)
        }
      }), setTimeout = new Proxy(global.setTimeout, {
        apply: function (a, b, c) {
          if (destroyed) { return }
          return Reflect.apply(a, b, c)
        }
      })
      const h = function (o) {
        return new Proxy(o, {
          get: function (a, b, c) {
            let d = Reflect.get(a, b, c)
            return d
          }, set: function (a, b, c) {
            return Reflect.set(a, b, c)
          }
        })
      }
      const handleListener = function (type, f, target) {
        listeners[type] = f
      }
      const listeners = {}
      const trigger = {
        mousemove: function (clientX, clientY) {
          if (listeners.mousemove) {
            listeners.mousemove({
              isTrusted: true,
              clientX: clientX,
              clientY: clientY
            })
          }
        },
        mousedown: function (clientX, clientY, button) {
          if (listeners.mousedown) {
            listeners.mousedown({
              isTrusted: true,
              clientX: clientX,
              clientY: clientY,
              button: button
            })
          }
        },
        mouseup: function (clientX, clientY, button) {
          if (listeners.mouseup) {
            listeners.mouseup({
              isTrusted: true,
              clientX: clientX,
              clientY: clientY,
              button: button
            })
          }
        },
        keydown: function (code, repeat) {
          if (listeners.keydown) {
            listeners.keydown({
              isTrusted: true,
              code: code,
              key: '',
              repeat: repeat || false,
              preventDefault: function () { }
            })
          }
        },
        keyup: function (code, repeat) {
          if (listeners.keyup) {
            listeners.keyup({
              isTrusted: true,
              code: code,
              key: '',
              repeat: repeat || false,
              preventDefault: function () { }
            })
          }
        }
      }

      global.window = global.parent = global.top = {
        WebAssembly,
        googletag: {
          cmd: {
            push: function (f) { try { f(); } catch (e) { } }
          },
          defineSlot: function () { return this; },
          addService: function () { return this; },
          display: function () { return this; },
          pubads: function () { return this; },
          enableSingleRequest: function () { return this; },
          collapseEmptyDivs: function () { return this; },
          enableServices: function () { return this; }
        },
        arrasAdDone: true
      };

      global.crypto = global.window.crypto = {
        getRandomValues: function (a) { return a }
      };
      global.addEventListener = global.window.addEventListener = function (type, f) {
        handleListener(type, f, global.window)
      };
      global.removeEventListener = global.window.removeEventListener = function (type, f) {
      };
      global.Image = global.window.Image = function () {
        return {}
      };

      let inputs = [], setValue = function (str) {
        for (let i = 0, l = inputs.length; i < l; i++) {
          inputs[i].value = str
        }
      }
      let position = [0, 0, 5], died = false, ignore = false, disconnected = false, connected = false, inGame = false, upgrade = false;

      let innerWidth = global.window.innerWidth = 500
      let innerHeight = global.window.innerHeight = 500

      let st = 2, lx = 0, gd = 1, canvasRef = {}, sr = 1, s = 1;

      const g = function () {
        let w = innerWidth;
        let h = innerHeight;
        if (!canvasRef.width) canvasRef.width = w;
        if (w * 0.5625 > h) {
          s = 888.888888888 / w;
        } else {
          s = 500 / h;
        }
        sr = canvasRef.width / w;
      };
      g();

      global.document = global.window.document = (function () {
        const emptyFunc = () => { };
        const emptyStyle = { setProperty: emptyFunc };

        const simulatedContext2D = {
          isContextLost: () => false,

          fillText: function () {
            if (ignore) { return }
            let a = Array.from(arguments)
            if (this.font === 'bold 7px Ubuntu' && this.fillStyle === 'rgb(255,255,255)') {
              if (a[0] === `You have spawned! Welcome to the game.`) {
                hasJoined = firstJoin = true
              } else if (a[0] === 'You have traveled through a portal!') {
                hasJoined = true
              }
              if ((a[0].startsWith('The server was ') && a[0].endsWith('% active')) || a[0].startsWith('Survived for ') || a[0].startsWith('Succumbed to ') || a[0] === 'You have self-destructed.' || a[0] === `Vanished into thin air` || a[0].startsWith('You have been killed by ')) {
                died = true
              }
              if (!a[0].startsWith(`You're using an ad blocker.`) && a[0] !== 'Respawn' && a[0] !== 'Back' && a[0] !== 'Reconnect' && a[0].length > 2) {
                log('[arras]', a[0])
              }
            }
            if (this.font === 'bold 7.5px Ubuntu' && this.fillStyle === 'rgb(231,137,109)') {
              if (a[0] === 'You have been temporarily banned from the game.' || a[0] === 'Your IP address have been blacklisted due to suspicious activities.') {
                disconnected = true
                destroy()
                log('[arras]', a[0])
              } else if (a[0].startsWith('The connection closed due to ')) {
                disconnected = true
                destroy()
                log('[arras]', a[0])
              }
            }
            if (this.font === 'bold 5.1px Ubuntu' && this.fillStyle === 'rgb(255,255,255)') {
              if (a[0].startsWith('Coordinates: (')) {
                let b = a[0].slice(14), l = b.length
                if (b[l - 1] === ')') {
                  b = b.slice(0, l - 1).split(', ')
                  if (b.length === 2) {
                    let x = parseFloat(b[0])
                    let y = parseFloat(b[1])
                    position[0] = x
                    position[1] = y
                    position[2] = 5
                  }
                }
              }
            }
          },

          measureText: (text) => ({ width: text.length }),
          clearRect: emptyFunc, strokeRect: emptyFunc, fillRect: emptyFunc,
          save: emptyFunc, translate: emptyFunc, clip: emptyFunc, restore: emptyFunc,
          beginPath: emptyFunc,
          moveTo: function () {
            canvasRef = this.canvas;
            if (st > 0) {
              st--;
              let val = arguments[0];
              let diff = Math.abs(val - lx);
              if (lx !== 0 && diff !== 0 && sr !== 0) {
                const new_gd = sr / diff;
                // Reasonable Arras GD scale is typically between 0.1 and 2.5
                if (isFinite(new_gd) && new_gd > 0.1 && new_gd < 2.5) {
                  gd = new_gd;
                }
              }
              lx = val;
            }
          },
          lineTo: emptyFunc, rect: emptyFunc,
          arc: emptyFunc, ellipse: emptyFunc, roundRect: emptyFunc, closePath: emptyFunc,
          fill: emptyFunc, stroke: emptyFunc, strokeText: emptyFunc, drawImage: emptyFunc,
        };

        const createElement = function (tag, options) {
          const element = {
            tag: tag ? tag.toLowerCase() : '',
            appended: false,
            value: '',
            style: emptyStyle,
            addEventListener: (type, f) => handleListener(type, f, element),
            setAttribute: emptyFunc,
            appendChild: (e) => { e.appended = true },
            focus: emptyFunc,
            blur: emptyFunc,
            remove: emptyFunc,
            getBoundingClientRect: () => ({
              width: innerWidth, height: innerHeight, top: 0, left: 0, bottom: innerHeight, right: innerWidth,
            }),
          };

          if (element.tag === 'canvas') {
            element.toDataURL = () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAADElEQVQImWNgoBMAAABpAAFEI8ARAAAAAElFTkSuQmCC';
            element.getContext = (type) => {
              if (type === '2d') {
                simulatedContext2D.canvas = element;
                return simulatedContext2D;
              }
              return null;
            };
          }

          if (element.tag === 'input') {
            inputs.push(element);
          }

          if (options) {
            Object.assign(element, options);
          }

          return element;
        };

        const doc = createElement('document', {
          createElement: createElement,
          body: null,
          fonts: { load: () => true },
          referrer: '',
        });
        doc.body = createElement('body');

        return doc;
      })();

      global.location = global.window.location = {
        hostname: 'arras.io',
        hash: config.hash,
        query: ''
      }
      let lastHash = global.location.hash
      global.prompt = global.window.prompt = function () {
        console.log('prompt', ...arguments)
      }
      let devicePixelRatio = global.window.devicePixelRatio = 1
      let a = false
      global.requestAnimationFrame = global.window.requestAnimationFrame = function (f) {
        st = 10;
        g();
        a = f
      }
      global.performance = {
        time: 0,
        now: function () {
          return this.time
        }
      }
      const console = {
        log: new Proxy(global.console.log, {
          apply: function (a, b, c) {
            if (c[0] === '%cStop!' || (c[0] && c[0].startsWith && c[0].startsWith('%cHackers have been known'))) { return }
            return Reflect.apply(a, b, c)
          }
        })
      }
      let proxyAgent = null;
      if (config.proxy) {
        if (config.proxy.type === 'socks') {
          const displayUrl = config.proxy.url.includes('@') ? config.proxy.url.split('@')[1] : config.proxy.url;
          log(`Using SOCKS5 proxy: ${displayUrl} (credentials hidden)`);
          proxyAgent = new SocksProxyAgent(config.proxy.url);
        } else if (config.proxy.type === 'http') {
          const displayUrl = config.proxy.url.includes('@') ? config.proxy.url.split('@')[1] : config.proxy.url;
          log(`Using HTTP proxy: ${displayUrl} (credentials hidden)`);
          proxyAgent = new HttpsProxyAgent(config.proxy.url);
        }
      }

      let i = 0, controller = {
        x: 250,
        y: 250,
        mouseDown: function () {
          trigger.mousedown(controller.x, controller.y)
        },
        mouseUp: function () {
          trigger.mouseup(controller.x, controller.y)
        },
        click: function (x, y) {
          trigger.mousedown(x, y, 0)
          trigger.mouseup(x, y, 0)
        },
        press: function (code) {
          trigger.keydown(code)
          trigger.keyup(code)
        },
        chat: function (str) {
          log('Sent chat:', str)
          controller.press('Enter')
          global.performance.time += 90
          a()
          controller.press('Enter')
          global.performance.time += 90
          a()
          setValue(str)
          controller.press('Enter')
          global.performance.time += 90
          a()
          setValue(str)
          controller.press('Enter')
        },
        moveDirection: function (x, y) {
          trigger[x < 0 ? 'keydown' : 'keyup']('KeyA')
          trigger[y < 0 ? 'keydown' : 'keyup']('KeyW')
          trigger[x > 0 ? 'keydown' : 'keyup']('KeyD')
          trigger[y > 0 ? 'keydown' : 'keyup']('KeyS')
        },
        iv: 4 / Math.PI,
        dv: Math.PI / 4,
        ix: [1, 1, 0, -1, -1, -1, 0, 1],
        iy: [0, 1, 1, 1, 0, -1, -1, -1],
        moveVector: function (x, y, i) {
          let d = Math.atan2(y, x)
          let h = (Math.round(d * controller.iv) % 8 + 8) % 8
          let x2 = controller.ix[h]
          let y2 = controller.iy[h]
          controller.moveDirection(x2, y2)
          return h * controller.dv
        },
        stats: function (arr) {
          for (let i = 0; i < 10; i++) {
            let code = `Digit${(i + 1) % 10}`
            for (let u = 0; u < arr[i]; u++) {
              controller.press(code)
            }
          }
        }
      }, statusRecieved = false, status = [], firstJoin = false, hasJoined = false, timeouts = {}, timeout = function (f, t) {
        if (!(t >= 1)) { t = 1 }
        let n = i + t
        let a = timeouts[n]
        if (!a) {
          a = timeouts[n] = []
        }
        a.push(f)
      }, block = false, idleKeys = false, idleIndex = -1
      let idleAngle = 0, cIdleAngle = 0

      const mainInterval = setInterval(function () {
        if (block || isPaused) {
          return
        }

        if (a) {
          switch (i) {
            case 1: {
              setValue(config.name)
              controller.click(250, 190)
              log('Play button clicked!', config.name, global.location.hash)
              break
            }
          }
          if (lastHash !== global.location.hash) {
            log('hash =', global.location.hash)
            lastHash = global.location.hash
          }
          let at = timeouts[i]
          if (at) {
            delete timeouts[i]
            for (let i = 0, l = at.length; i < l; i++) {
              at[i]()
            }
          }
          position[2]--
          if (position[2] < 0) {
            controller.press('KeyL')
          }
          if (hasJoined) {
            if (ca.onJoin) {
              ca.onJoin()
            }
            hasJoined = false
            inGame = true
            upgrade = true
            let keys = []
            if (firstJoin) {
              firstJoin = false
              for (let i = 0, l = config.tank.length; i < l; i++) {
                keys.push(config.tank[i])
              }
            }
            controller.stats(config.stats)
            idleIndex = 0
            idleKeys = keys

            if (!fs.existsSync('./success_log.json')) {
              log('SUCCESSFUL CONNECTION! Saving this event sequence as the baseline.');
              fs.writeFileSync('./success_log.json', JSON.stringify(eventLog, null, 2));
            }
          }
          if (idleKeys) {
            if (idleIndex >= 0) {
              const k = idleKeys[idleIndex];
              const code = k.length === 1 ? (k >= '0' && k <= '9' ? 'Digit' + k : 'Key' + k) : k;
              controller.press(code)
              idleIndex++
              if (idleIndex >= idleKeys.length) {
                idleIndex = -1
                idleKeys = false
              }
            }
          } else if (idleIndex >= -10) {
            idleIndex--
          } else {
            idleIndex = -11
          }
          if (inGame && config.type === 'follow' && idleIndex < -10) {
            if (upgrade) {
              for (let i = 0, l = config.keys.length; i < l; i++) {
                const k = config.keys[i];
                const code = k.length === 1 ? (k >= '0' && k <= '9' ? 'Digit' + k : 'Key' + k) : k;
                controller.press(code)
              }
              upgrade = false
            }

            if (socket && socket.readyState === 1 && statusRecieved && !subscribedToLeader && config.squadId) {
              log(`Subscribing to leader using Squad ID: ${config.squadId}`);
              send([10, config.squadId]);
              subscribedToLeader = true;
            }

            active--
            if (i % 175 === 174 && config.chatSpam) {
              controller.chat(config.chatSpam)
            }

            let dx = target[0] - position[0], dy = target[1] - position[1]
            if (active > 0) {
              const targetMode = String(config.target || 'player').toLowerCase();
              const useMouseDirectionMode = targetMode === 'mouse';
              const useMousePositionMode = targetMode === 'mouse_position';
              const useAbsoluteMouseTarget = useMouseDirectionMode || useMousePositionMode;

              let move_dx, move_dy;

              if (useAbsoluteMouseTarget) {
                // Always move toward the leader's current mouse world position.
                let goalX = target[2];
                let goalY = target[3];

                if (useMousePositionMode) {
                  // Keep bots gathered around the same mouse point while avoiding hard overlap.
                  const botIdSeed = (config.id || 0);
                  const baseAngle = ((botIdSeed * 2.399963229728653) % (Math.PI * 2));
                  const gatherRadius = 0.6 + (botIdSeed % 6) * 0.2;

                  goalX += gatherRadius * Math.cos(baseAngle);
                  goalY += gatherRadius * Math.sin(baseAngle);

                  // Linger motion near the gather point so bots keep moving while idle.
                  let toGoalX = goalX - position[0];
                  let toGoalY = goalY - position[1];
                  const nearGoal = (toGoalX * toGoalX + toGoalY * toGoalY) < 9;
                  if (nearGoal) {
                    const lingerRadius = 0.7 + (botIdSeed % 5) * 0.12;
                    const lingerSpeed = 0.015 + (botIdSeed % 7) * 0.0015;
                    const lingerAngle = i * lingerSpeed + baseAngle;
                    goalX += lingerRadius * Math.cos(lingerAngle);
                    goalY += lingerRadius * Math.sin(lingerAngle);
                  }
                }

                move_dx = goalX - position[0];
                move_dy = goalY - position[1];
              } else {
                // Move to leader position
                move_dx = dx;
                move_dy = dy;
              }

              let d2 = move_dx * move_dx + move_dy * move_dy;
              let move_angle = Math.atan2(move_dy, move_dx);

              if (useAbsoluteMouseTarget) {
                // Close enough to cursor point: stay there and only do slight linger.
                if (d2 < 2.25) {
                  const botIdSeed = (config.id || 0);
                  const lingerTick = (i + botIdSeed * 3) % 36;
                  if (lingerTick < 4) {
                    const lingerAngle = i * 0.35 + botIdSeed * 1.7;
                    move_angle = controller.moveVector(Math.cos(lingerAngle), Math.sin(lingerAngle), i);
                  } else {
                    controller.moveDirection(0, 0);
                  }
                } else {
                  move_angle = controller.moveVector(move_dx, move_dy, i);
                }
              } else if (d2 < 4) {
                if (d2 < 1) {
                  move_angle = controller.moveVector(-move_dx, -move_dy, i) + Math.PI;
                } else {
                  controller.moveDirection(0, 0);
                }
              } else {
                move_angle = controller.moveVector(move_dx, move_dy, i);
              }

              let aimFollowsMovement = (config.aim === 'drone' && !target[4]);

              if (aimFollowsMovement) {
                let p2 = Math.PI * 2;
                let h = ((Math.round(move_angle * controller.iv) - 0.5) % 8 + 8) % 8 + 0.5;
                h = controller.dv * h;
                if (Math.abs(((h - idleAngle) % p2 + Math.PI) % p2 - Math.PI) > 0.75) {
                  idleAngle = h + 0.75 * (2 * Math.random() - 1);
                }
                cIdleAngle = averageAngle(cIdleAngle, idleAngle, 5) % p2;
                let dist = 20;
                trigger.mousemove(
                  controller.x = 250 + dist * Math.cos(cIdleAngle),
                  controller.y = 250 + dist * Math.sin(cIdleAngle)
                );
              } else {
                let aim_dx_game = target[2] - position[0];
                let aim_dy_game = target[3] - position[1];

                if (aim_dx_game !== 0 || aim_dy_game !== 0) {
                  const angle = Math.atan2(aim_dy_game, aim_dx_game);
                  const dist = 100;

                  trigger.mousemove(
                    controller.x = 250 + dist * Math.cos(angle),
                    controller.y = 250 + dist * Math.sin(angle)
                  );
                }
              }

              if (config.autoFire) {
                controller.mouseDown();
              } else {
                if (target[4]) {
                  controller.mouseDown();
                } else {
                  controller.mouseUp();
                }
              }

            } else {
              controller.moveDirection(0, 0)
              if (Math.random() < 0.01) {
                let dist = 20;
                let randomAngle = 2 * Math.PI * Math.random();
                trigger.mousemove(
                  controller.x = 250 + dist * Math.cos(randomAngle),
                  controller.y = 250 + dist * Math.sin(randomAngle)
                );
              }
              controller.mouseUp()
            }
          }
          if (died) {
            inGame = false
            log('Death detected. Clearing render cache...')
            block = true
            ignore = true
            let index = 0
            let interval = setInterval(function () {
              if (destroyed) {
                clearInterval(interval)
                return
              }
              // Reduced load: only 5 iterations instead of 30
              for (let i = 0; i < 5; i++) {
                let r = 100 + 900 * Math.random(), q = 100 + 900 * Math.random(), p = 0.5 + Math.random()
                innerWidth = global.window.innerWidth = r
                innerHeight = global.window.innerHeight = q
                devicePixelRatio = global.window.devicePixelRatio = p
                global.performance.time += 9000
                a()
              }
              index++
              if (index >= 10) { // Reduced total cycles from 30 to 10
                clearInterval(interval)
                end()
              }
            }, 50), end = function () { // Increased interval to 50ms
              innerWidth = global.window.innerWidth = 500
              innerHeight = global.window.innerHeight = 500
              devicePixelRatio = global.window.devicePixelRatio = 1
              if (config.autoRespawn) {
                log('Render cache cleared, respawning in 1.5s...')
                // Added 1.5s delay to prevent router flooding on mass respawn
                setTimeout(() => {
                  if (!destroyed) controller.press('Enter');
                }, 1500);
              } else {
                log('Render cache cleared.')
              }
              block = false
              ignore = false
              global.performance.time += 9000
              a()
              if (statusRecieved) { i++ }
            }
            died = false
            return
          }
          global.performance.time += 9000
          a()
          if (statusRecieved) {
            i++
          }
        }
      }, 45) // Increased from 20ms to 45ms to reduce packet frequency by ~50%
      const averageAngle = function (a, b, c) {
        let d = 2 * Math.PI;
        a = ((a % d) + d) % d;
        let e = (d + b - a) % d;
        if (e > Math.PI) {
          return (((a + (e - d) / (c + 1)) % d) + d) % d;
        } else {
          return (((a + e / (c + 1)) % d) + d) % d;
        }
      }
      global.localStorage = global.window.localStorage = {
        setItem: function (i, v) {
          this[i] = v
        },
        getItem: function (i) {
          return this[i]
        }
      }

      global.fetch = global.window.fetch = new Proxy(realFetch, {
        apply: function (a, b, c) {
          let f = c[0];
          eventLog.push({ type: 'fetch', url: f });

          if (f.startsWith('./')) {
            f = c[0] = 'https://arras.io' + f.slice(1)
          } else if (f.startsWith('/')) {
            f = c[0] = 'https://arras.io' + f
          }

          let options = c[1] || {};
          if (proxyAgent) {
            options.agent = proxyAgent;
          }
          c[1] = options;

          if (f.includes('app.wasm')) { return wasm() }

          const fetchPromise = Reflect.apply(a, b, c).catch(err => {
            // Silently catch network errors (ECONNRESET, etc.) to prevent console spam
            // Return a minimal response object that won't crash callers
            return new Response('{}', { status: 500, statusText: 'Network Error' });
          });

          if (f.includes('status')) {
            fetchPromise.then(response => {
              if (!response || !response.ok) return;

              // Use clone() so the original body remains available for the game script
              response.clone().text().then(text => {
                if (!text || text.trim() === '') return;
                try {
                  const i = JSON.parse(text);
                  if (i.ok && i.status) {
                    statusRecieved = true;
                    status = Object.values(i.status);
                  }
                } catch (e) { }
              }).catch(err => { });
            }).catch(err => { });
          }

          return fetchPromise;
        }
      });

      global.navigator = global.window.navigator = {}
      let gameSocket = false, host = false

      global.WebSocket = global.window.WebSocket = new Proxy(ws, {
        construct: function (a, b, c) {
          const fullUrl = b[0];
          eventLog.push({ type: 'websocket', url: fullUrl });
          host = new url.URL(fullUrl).host

          let h = {
            headers: {
              'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
              'accept-encoding': 'gzip, deflate, br',
              'accept-language': 'en-US,en;q=0.9',
              'cache-control': 'no-cache',
              'connection': 'Upgrade',
              'origin': 'https://arras.io',
              'pragma': 'no-cache',
              'upgrade': 'websocket',
              'Sec-WebSocket-Protocol': b[1] ? b[1].join(', ') : '',
              'host': host
            },
            followRedirects: true,
            origin: 'https://arras.io',
          }

          if (proxyAgent) { h.agent = proxyAgent; }

          const newArgs = [fullUrl, b[1], h];
          const d = Reflect.construct(a, newArgs, c)

          d.addEventListener('open', function () {
            log('WebSocket open.')
            connected = true
          })

          d.addEventListener('close', function (e) {
            if (gameSocket === d) { gameSocket = false; }
            log('WebSocket closed. wasClean =', e.wasClean, 'code =', e.code, 'reason =', e.reason)

            if (!inGame && e.code !== 1000) {
              try {
                if (fs.existsSync('./success_log.json')) {
                  const successfulLog = JSON.parse(fs.readFileSync('./success_log.json'));
                } else {
                  log('Failure occurred, but no successful log exists yet to compare against. The first bot to succeed will create one.');
                }
              } catch (err) {
                log('Error during log comparison:', err);
              }
            }
          })

          let closed = false
          d.addEventListener('message', function (e) { let u = Array.from(new Uint8Array(e.data)) })
          d.send = new Proxy(d.send, { apply: function (f, g, h) { return Reflect.apply(f, g, h) } })
          d.close = new Proxy(d.close, {
            apply: function (f, g, h) {
              if (closed) { return }
              log('WebSocket closed by client.')
              closed = true
              Reflect.apply(f, g, h)
            }
          })
          d.addEventListener = new Proxy(d.addEventListener, { apply: function (a, b, c) { return Reflect.apply(a, b, c) } })
          gameSocket = d
          return d
        }
      })
      eval(x)
      let ca = oa || {}
      ca.window = global.window
      ca.destroy = destroy
      ca.controller = controller
      ca.trigger = trigger
      return Object.assign(ca, internalBotInterface);
    }

    let id = 0
    let arras = {
      then: (cb) => {
        then(() => cb(arras));
      },
      create: function (o) {
        if (!ready) {
          log("Warning: 'create' called before arras was ready. It will be queued.");
        }
        o.id = o.id !== undefined ? o.id : id++;
        return run(script, o)
      }
    }
    if (options.start) {
      options.start(arras)
    }
    return arras
  })()
}
