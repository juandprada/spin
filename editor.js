
const DEFAULT_PRESETS = {
    preset1: "beso, masaje ; cuello de karen acostados, cuello de juan acostados, cuello de juan sentados, cuello de karen sentados, amiga de perrito, amiga acostada, amiga sentada, boobies acostada, boca acostados, boca sentados ; 1 minuto, 2 minutos ; masaje - amiga sentada, masaje - amiga de perrito, beso - cuello de juan acostados, beso - cuello de juan sentados, masaje - boca sentados, masaje - boca acostados, masaje - boobies acostada",
    preset2: "torcida, juan encima, karen encima, perrito, sapito, sapito torcida, torcida pro, sentados ; 2 minutos, 3 minutos ; venirse boobies, venirse boca, venirse espalda, venirse ombligo ; torcida - venirse boobies, torcida - venirse ombligo, torcida pro - venirse boobies, torcida - venirse espalda, torcida pro - venirse espalda, torcida pro - venirse ombligo, juan encima - venirse espalda, encima - venirse espalda, sentados - venirse boca, sentados - venirse espalda, sentados - venirse boobies, perrito - venirse ombligo, karen encima - venirse boobies, karen encima - venirse ombligo, karen encima - venirse espalda"
};

// Load presets from localStorage
let presets = JSON.parse(localStorage.getItem("spinPresets"));
if (!presets) {
    presets = { ...DEFAULT_PRESETS };
    localStorage.setItem("spinPresets", JSON.stringify(presets));
}

// State
let currentPresetKey = "preset1";
let wheelsData = [[], [], []];
let exclusionsData = [];

// DOM Elements
const editorPreset = document.getElementById("editor-preset");
const inputW1 = document.getElementById("input-w1");
const inputW2 = document.getElementById("input-w2");
const inputW3 = document.getElementById("input-w3");
const chipsW1 = document.getElementById("chips-w1");
const chipsW2 = document.getElementById("chips-w2");
const chipsW3 = document.getElementById("chips-w3");

const excDropdown1 = document.getElementById("exc-dropdown-1");
const excDropdown2 = document.getElementById("exc-dropdown-2");
const addExclusionBtn = document.getElementById("add-exclusion-btn");
const chipsExc = document.getElementById("chips-exc");

const saveButton = document.getElementById("save-button");
const saveMessage = document.getElementById("save-message");

// Parse string to arrays
function parsePreset(presetString) {
    const sections = presetString.split(";").map(s => s.trim());
    wheelsData = [[], [], []];
    exclusionsData = [];
    
    if (sections.length >= 3) {
        wheelsData[0] = sections[0].split(",").map(s => s.trim()).filter(Boolean);
        wheelsData[1] = sections[1].split(",").map(s => s.trim()).filter(Boolean);
        wheelsData[2] = sections[2].split(",").map(s => s.trim()).filter(Boolean);
    }
    
    if (sections.length >= 4 && sections[3].length > 0) {
        const rules = sections[3].split(",").map(s => s.trim()).filter(Boolean);
        rules.forEach(rule => {
            const parts = rule.split("-").map(p => p.trim());
            if(parts.length === 2) exclusionsData.push([parts[0], parts[1]]);
        });
    }
}

// Serialize arrays back to string
function serializePreset() {
    const w1 = wheelsData[0].join(", ");
    const w2 = wheelsData[1].join(", ");
    const w3 = wheelsData[2].join(", ");
    const exc = exclusionsData.map(e => `${e[0]} - ${e[1]}`).join(", ");
    return `${w1} ; ${w2} ; ${w3} ; ${exc}`;
}

// Render UI
function renderAll() {
    renderChips(wheelsData[0], chipsW1, 0);
    renderChips(wheelsData[1], chipsW2, 1);
    renderChips(wheelsData[2], chipsW3, 2);
    renderExclusions();
    populateDropdowns();
}

function renderChips(dataArray, container, wheelIndex) {
    container.innerHTML = "";
    dataArray.forEach((word, idx) => {
        const chip = document.createElement("div");
        chip.className = `chip chip-w${wheelIndex + 1}`;
        chip.innerHTML = `
            <span>${word}</span>
            <span class="chip-delete" onclick="deleteWord(${wheelIndex}, ${idx})">×</span>
        `;
        container.appendChild(chip);
    });
}

function renderExclusions() {
    chipsExc.innerHTML = "";
    exclusionsData.forEach((exc, idx) => {
        const chip = document.createElement("div");
        chip.className = "chip chip-exc";
        chip.innerHTML = `
            <span>${exc[0]} <b>≠</b> ${exc[1]}</span>
            <span class="chip-delete" onclick="deleteExclusion(${idx})">×</span>
        `;
        chipsExc.appendChild(chip);
    });
}

function populateDropdowns() {
    const allWords = [...new Set([...wheelsData[0], ...wheelsData[1], ...wheelsData[2]])].sort();
    
    const fillDropdown = (dropdown) => {
        const currentVal = dropdown.value;
        dropdown.innerHTML = `<option value="">Select word...</option>`;
        allWords.forEach(word => {
            const opt = document.createElement("option");
            opt.value = word;
            opt.textContent = word;
            dropdown.appendChild(opt);
        });
        if(allWords.includes(currentVal)) dropdown.value = currentVal;
    };
    
    fillDropdown(excDropdown1);
    fillDropdown(excDropdown2);
}

// Actions
window.deleteWord = function(wheelIndex, wordIndex) {
    wheelsData[wheelIndex].splice(wordIndex, 1);
    renderAll();
};

window.deleteExclusion = function(idx) {
    exclusionsData.splice(idx, 1);
    renderExclusions();
};

function addWord(inputElement, wheelIndex) {
    const val = inputElement.value.trim();
    if (val) {
        wheelsData[wheelIndex].push(val);
        inputElement.value = "";
        renderAll();
    }
}

// Listeners
inputW1.addEventListener("keypress", e => { if(e.key === "Enter") addWord(inputW1, 0); });
inputW2.addEventListener("keypress", e => { if(e.key === "Enter") addWord(inputW2, 1); });
inputW3.addEventListener("keypress", e => { if(e.key === "Enter") addWord(inputW3, 2); });

addExclusionBtn.addEventListener("click", () => {
    const w1 = excDropdown1.value;
    const w2 = excDropdown2.value;
    if (w1 && w2) {
        exclusionsData.push([w1, w2]);
        excDropdown1.value = "";
        excDropdown2.value = "";
        renderExclusions();
    }
});

editorPreset.addEventListener("change", (e) => {
    currentPresetKey = e.target.value;
    parsePreset(presets[currentPresetKey]);
    renderAll();
    saveMessage.classList.add("hidden");
});

saveButton.addEventListener("click", () => {
    presets[currentPresetKey] = serializePreset();
    localStorage.setItem("spinPresets", JSON.stringify(presets));
    
    saveMessage.classList.remove("hidden");
    setTimeout(() => {
        saveMessage.classList.add("hidden");
    }, 3000);
});

// Init
parsePreset(presets[currentPresetKey]);
renderAll();
