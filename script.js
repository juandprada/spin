
const DEFAULT_PRESETS = {
    preset1: "beso, masaje ; cuello de karen acostados, cuello de juan acostados, cuello de juan sentados, cuello de karen sentados, amiga de perrito, amiga acostada, amiga sentada, boobies acostada, boca acostados, boca sentados ; 1 minuto, 2 minutos ; masaje - amiga sentada, masaje - amiga de perrito, beso - cuello de juan acostados, beso - cuello de juan sentados, masaje - boca sentados, masaje - boca acostados, masaje - boobies acostada",
    preset2: "torcida, juan encima, karen encima, perrito, sapito, sapito torcida, torcida pro, sentados ; 2 minutos, 3 minutos ; venirse boobies, venirse boca, venirse espalda, venirse ombligo ; torcida - venirse boobies, torcida - venirse ombligo, torcida pro - venirse boobies, torcida - venirse espalda, torcida pro - venirse espalda, torcida pro - venirse ombligo, juan encima - venirse espalda, encima - venirse espalda, sentados - venirse boca, sentados - venirse espalda, sentados - venirse boobies, perrito - venirse ombligo, karen encima - venirse boobies, karen encima - venirse ombligo, karen encima - venirse espalda"
};

// Load presets from localStorage or use defaults
let PRESETS = JSON.parse(localStorage.getItem("spinPresets"));
if (!PRESETS) {
    PRESETS = { ...DEFAULT_PRESETS };
    localStorage.setItem("spinPresets", JSON.stringify(PRESETS));
}

// DOM Elements
const configInput = document.getElementById("config-input");
const presetSelector = document.getElementById("preset");
const errorMessage = document.getElementById("error-message");
const editLinkBtn = document.getElementById("edit-link-btn");
const spinButton = document.getElementById("spin-button");
const comboCounter = document.getElementById("combo-counter");
const resetHistoryBtn = document.getElementById("reset-history-btn");
const statusToast = document.getElementById("status-toast");
const wheels = [
    document.querySelector("#wheel1 .wheel-content"),
    document.querySelector("#wheel2 .wheel-content"),
    document.querySelector("#wheel3 .wheel-content")
];

// State
let isSpinning = false;
let usedCombinations = new Set();
let toastTimeout = null;

// Initialize
configInput.value = PRESETS[presetSelector.value] || PRESETS.preset1;

function getComboKey(combo) {
    return combo.map(w => w.trim().toLowerCase()).join(" ||| ");
}

function parseConfiguration(inputText) {
    const sections = inputText.split(";").map(s => s.trim());
    
    if (sections.length < 3) {
        return { valid: false, error: "You need at least 3 parts separated by semicolons (;)" };
    }
    
    const list1 = sections[0].split(",").map(s => s.trim()).filter(s => s.length > 0);
    const list2 = sections[1].split(",").map(s => s.trim()).filter(s => s.length > 0);
    const list3 = sections[2].split(",").map(s => s.trim()).filter(s => s.length > 0);
    
    if (list1.length === 0 || list2.length === 0 || list3.length === 0) {
        return { valid: false, error: "Please make sure wheels 1, 2, and 3 have words in them." };
    }
    
    const allAvailableWords = [...list1, ...list2, ...list3].map(w => w.toLowerCase());
    const exclusions = [];
    
    if (sections.length >= 4 && sections[3].trim().length > 0) {
        const rules = sections[3].split(",");
        for (let rule of rules) {
            if (rule.trim().length === 0) continue;
            
            const parts = rule.split("-").map(p => p.trim().toLowerCase());
            if (parts.length !== 2) {
                return { valid: false, error: `Error: The rule "${rule}" must have exactly one hyphen (-)` };
            }
            if (!allAvailableWords.some(w => w === parts[0] || w.includes(parts[0]) || parts[0].includes(w))) {
                return { valid: false, error: `Error: "${parts[0]}" in rules not found in wheels!` };
            }
            if (!allAvailableWords.some(w => w === parts[1] || w.includes(parts[1]) || parts[1].includes(w))) {
                return { valid: false, error: `Error: "${parts[1]}" in rules not found in wheels!` };
            }
            exclusions.push([parts[0], parts[1]]);
        }
    }
    
    // Generate all valid combinations
    const allValidCombos = [];
    for (const w1 of list1) {
        for (const w2 of list2) {
            for (const w3 of list3) {
                const currentCombo = [w1.toLowerCase(), w2.toLowerCase(), w3.toLowerCase()];
                const isInvalid = exclusions.some(([bad1, bad2]) => {
                    const match1 = currentCombo.some(w => w === bad1 || w.includes(bad1));
                    const match2 = currentCombo.some(w => w === bad2 || w.includes(bad2));
                    return match1 && match2;
                });
                if (!isInvalid) {
                    allValidCombos.push([w1, w2, w3]);
                }
            }
        }
    }
    
    return {
        valid: true,
        list1,
        list2,
        list3,
        exclusions,
        allValidCombos
    };
}

function updateComboCounter() {
    const config = parseConfiguration(configInput.value);
    if (!config.valid || config.allValidCombos.length === 0) {
        comboCounter.textContent = "Combinations left: --";
        return;
    }
    
    const total = config.allValidCombos.length;
    const remaining = config.allValidCombos.filter(c => !usedCombinations.has(getComboKey(c))).length;
    comboCounter.textContent = `🎯 Combinations left: ${remaining} / ${total}`;
}

function showToast(msg) {
    if (!statusToast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    
    statusToast.textContent = msg;
    statusToast.classList.remove("hidden");
    
    toastTimeout = setTimeout(() => {
        statusToast.classList.add("hidden");
    }, 3500);
}

function resetCombinationHistory() {
    usedCombinations.clear();
    updateComboCounter();
    showToast("Combination pool reset! ✨");
}

// Error Handling
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove("hidden");
}

function hideError() {
    errorMessage.classList.add("hidden");
}

// Preset and Config Handlers
presetSelector.addEventListener("change", (e) => {
    configInput.value = PRESETS[e.target.value] || "";
    usedCombinations.clear();
    hideError();
    updateComboCounter();
});

configInput.addEventListener("input", () => {
    usedCombinations.clear();
    hideError();
    updateComboCounter();
});

if (resetHistoryBtn) {
    resetHistoryBtn.addEventListener("click", resetCombinationHistory);
}

// Initial counter update
updateComboCounter();

// Spin Logic
spinButton.addEventListener("click", async () => {
    if (isSpinning) return;
    
    hideError();
    
    const config = parseConfiguration(configInput.value);
    if (!config.valid) {
        showError(config.error);
        return;
    }
    
    const { allValidCombos } = config;
    if (allValidCombos.length === 0) {
        showError("No valid combinations possible with the current rules!");
        return;
    }
    
    // Check available unseen combinations
    let availableCombos = allValidCombos.filter(c => !usedCombinations.has(getComboKey(c)));
    
    // If all combinations have been seen, auto-reset the pool
    if (availableCombos.length === 0) {
        usedCombinations.clear();
        availableCombos = [...allValidCombos];
        showToast("All combinations played! Starting fresh round 🔄");
    }
    
    // Pick target combination randomly from available unseen combinations
    const targetIndex = Math.floor(Math.random() * availableCombos.length);
    const targetCombo = availableCombos[targetIndex];
    usedCombinations.add(getComboKey(targetCombo));
    
    // Start Spinning Animation
    isSpinning = true;
    spinButton.disabled = true;
    spinButton.querySelector(".btn-text").textContent = "Spinning...";
    
    wheels.forEach(w => w.classList.add("blur"));
    
    let delayTime = 10;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    for (let i = 1; i <= 25; i++) {
        let displayW1, displayW2, displayW3;
        
        if (i === 25) {
            // Final step: land firmly on the chosen unique combination
            [displayW1, displayW2, displayW3] = targetCombo;
        } else {
            // Random valid combination during visual roll
            const randomCombo = allValidCombos[Math.floor(Math.random() * allValidCombos.length)];
            [displayW1, displayW2, displayW3] = randomCombo;
        }
        
        wheels[0].textContent = displayW1;
        wheels[1].textContent = displayW2;
        wheels[2].textContent = displayW3;
        
        // Random slight vertical bounce for visual slot effect
        wheels.forEach(w => {
            w.style.transform = `translateY(${(Math.random() - 0.5) * 10}px)`;
        });
        
        await sleep(delayTime);
        // Exponential decay curve for realistic slot machine effect (~3 seconds total)
        delayTime = 10 + (i * i * 0.8);
    }
    
    // End Spin
    wheels.forEach(w => {
        w.classList.remove("blur");
        w.style.transform = "translateY(0)";
    });
    
    isSpinning = false;
    spinButton.disabled = false;
    spinButton.querySelector(".btn-text").textContent = "SPIN";
    
    // Update counter display
    updateComboCounter();
});
