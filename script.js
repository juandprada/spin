
const DEFAULT_PRESETS = {
    default: "Un pirata, Un alien ; salta, corre ; 1 minuto, 30 segundos, un taco ; Un pirata - 30 segundos",
    preset1: "beso, masaje ; cuello de karen acostados, cuello de juan acostados, cuello de juan sentados, cuello de karen sentados, amiga de perrito, amiga acostada, amiga sentada, boobies acostada, boca acostados, boca sentados ; 1 minuto, 2 minutos ; masaje - amiga sentada, masaje - amiga de perrito, beso - cuello de juan acostados, beso - cuello de juan sentados, masaje - boca sentados, masaje - boca acostados, masaje - boobies acostada",
    preset2: "torcida, juan encima, karen encima, perrito, sapito, sapito torcida, torcida pro, sentados ; 2 minutos, 3 minutos ; venirse boobies, venirse boca, venirse espalda, venirse ombligo ; torcida - venirse boobies, torcida - venirse ombligo, torcida pro - venirse boobies, torcida - venirse espalda, torcida pro - venirse espalda, torcida pro - venirse ombligo, encima - venirse espalda, sentados - venirse boca, sentados - venirse espalda, sentados - venirse boobies, perrito - venirse ombligo, karen encima - venirse boobies, karen encima - venirse ombligo, karen encima - venirse espalda"
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
// Botón oculto por defecto. Si deseas acceder al editor, abre editor.html directamente.
const spinButton = document.getElementById("spin-button");
const timerDisplay = document.getElementById("timer-display");
const wheels = [
    document.querySelector("#wheel1 .wheel-content"),
    document.querySelector("#wheel2 .wheel-content"),
    document.querySelector("#wheel3 .wheel-content")
];

// State
let isSpinning = false;
let timeRemaining = 0;
let timerInterval = null;
let synthesisReady = false;
let speechSynth = window.speechSynthesis;

// Initialize
configInput.value = PRESETS.default;

// Force load voices to avoid lag later
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => { synthesisReady = true; };
}

// Preset Handler
presetSelector.addEventListener("change", (e) => {
    configInput.value = PRESETS[e.target.value];
    hideError();
});

// Time Extraction Logic (Spanish)
function extractTimeInSeconds(text) {
    let totalSeconds = 0;
    
    // Check for minutes
    const minMatch = text.match(/(\d+)\s*minuto/i);
    if (minMatch) {
        totalSeconds += parseInt(minMatch[1]) * 60;
    }
    
    // Check for seconds
    const secMatch = text.match(/(\d+)\s*segundo/i);
    if (secMatch) {
        totalSeconds += parseInt(minMatch[1]);
    }
    
    return totalSeconds;
}

// TTS Logic
function speakReady() {
    if (!speechSynth) return;
    
    const utterance = new SpeechSynthesisUtterance("Ready.");
    utterance.lang = "en-US";
    utterance.pitch = 0.75;
    utterance.rate = 0.85;
    
    // Try to find a specific sexy/deep US English voice if available
    const voices = speechSynth.getVoices();
    const usVoices = voices.filter(v => v.lang === "en-US");
    if (usVoices.length > 0) {
        utterance.voice = usVoices[0]; // fallback to first US voice
    }
    
    speechSynth.speak(utterance);
}

// Timer Logic
function startTimer(seconds) {
    timeRemaining = seconds;
    timerDisplay.classList.remove("hidden");
    timerDisplay.parentElement.classList.add("timer-running");
    updateTimerDisplay();
    
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerDisplay.parentElement.classList.remove("timer-running");
            speakReady();
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (timeRemaining <= 0) {
        timerDisplay.textContent = "⏱️ 00:00";
        return;
    }
    const mins = Math.floor(timeRemaining / 60);
    const secs = (timeRemaining % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `⏱️ ${mins}:${secs}`;
}

function stopTimer() {
    clearInterval(timerInterval);
    timeRemaining = 0;
    timerDisplay.classList.add("hidden");
    timerDisplay.parentElement.classList.remove("timer-running");
}

// Error Handling
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove("hidden");
}

function hideError() {
    errorMessage.classList.add("hidden");
}

// Spin Logic
spinButton.addEventListener("click", async () => {
    if (isSpinning) return;
    
    hideError();
    stopTimer();
    
    const inputText = configInput.value;
    const sections = inputText.split(";").map(s => s.trim());
    
    if (sections.length < 3) {
        showError("You need at least 3 parts separated by semicolons (;)");
        return;
    }
    
    const list1 = sections[0].split(",").map(s => s.trim()).filter(s => s.length > 0);
    const list2 = sections[1].split(",").map(s => s.trim()).filter(s => s.length > 0);
    const list3 = sections[2].split(",").map(s => s.trim()).filter(s => s.length > 0);
    
    if (list1.length === 0 || list2.length === 0 || list3.length === 0) {
        showError("Please make sure wheels 1, 2, and 3 have words in them.");
        return;
    }
    
    // Parse Exclusions
    const allAvailableWords = [...list1, ...list2, ...list3].map(w => w.toLowerCase());
    const exclusions = [];
    
    if (sections.length >= 4 && sections[3].trim().length > 0) {
        const rules = sections[3].split(",");
        for (let rule of rules) {
            if (rule.trim().length === 0) continue;
            
            const parts = rule.split("-").map(p => p.trim().toLowerCase());
            if (parts.length !== 2) {
                showError(`Error: The rule "${rule}" must have exactly one hyphen (-)`);
                return;
            }
            if (!allAvailableWords.includes(parts[0])) {
                showError(`Error: "${parts[0]}" in rules not found in wheels!`);
                return;
            }
            if (!allAvailableWords.includes(parts[1])) {
                showError(`Error: "${parts[1]}" in rules not found in wheels!`);
                return;
            }
            exclusions.push([parts[0], parts[1]]);
        }
    }
    
    // Start Spinning Animation
    isSpinning = true;
    spinButton.disabled = true;
    spinButton.querySelector(".btn-text").textContent = "Spinning...";
    
    wheels.forEach(w => w.classList.add("blur"));
    
    let delayTime = 20;
    let finalW1, finalW2, finalW3;
    
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    for (let i = 1; i <= 30; i++) {
        let attempts = 0;
        let isInvalid = true;
        
        while (isInvalid && attempts < 50) {
            finalW1 = list1[Math.floor(Math.random() * list1.length)];
            finalW2 = list2[Math.floor(Math.random() * list2.length)];
            finalW3 = list3[Math.floor(Math.random() * list3.length)];
            
            const currentCombo = [finalW1.toLowerCase(), finalW2.toLowerCase(), finalW3.toLowerCase()];
            
            isInvalid = exclusions.some(([bad1, bad2]) => 
                currentCombo.includes(bad1) && currentCombo.includes(bad2)
            );
            attempts++;
        }
        
        wheels[0].textContent = finalW1;
        wheels[1].textContent = finalW2;
        wheels[2].textContent = finalW3;
        
        // Random slight vertical bounce for visual effect
        wheels.forEach(w => {
            w.style.transform = `translateY(${(Math.random() - 0.5) * 10}px)`;
        });
        
        await sleep(delayTime);
        delayTime += (i * 2); 
    }
    
    // End Spin
    wheels.forEach(w => {
        w.classList.remove("blur");
        w.style.transform = "translateY(0)";
    });
    
    isSpinning = false;
    spinButton.disabled = false;
    spinButton.querySelector(".btn-text").textContent = "SPIN";
    
    // Check for timers
    const timeFound = extractTimeInSeconds(finalW1) + 
                      extractTimeInSeconds(finalW2) + 
                      extractTimeInSeconds(finalW3);
                      
    if (timeFound > 0) {
        // According to original android logic: + 10 seconds
        startTimer(timeFound + 10);
    }
});
