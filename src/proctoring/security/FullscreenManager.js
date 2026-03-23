let initialized = false;
let exitCount = 0;
let violationCallback = null;
let currentConfig = null;
let forceBackTimer = null;

async function attemptFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch (err) {
    // Browsers require a user gesture to enter fullscreen.
    // In a real app, the exam start button click serves as that gesture.
  }
}

function handleFullscreenChange() {
  const isFull = !!document.fullscreenElement;
  console.log(`[FULLSCREEN_MANAGER] Change detected. IsFull: ${isFull}`);

  if (!isFull) {
    // User exited fullscreen
    exitCount++;
    console.log(`[FULLSCREEN_MANAGER] Exit detected. Total exits: ${exitCount}`);
    
    if (currentConfig.fullscreen.enforced && exitCount >= currentConfig.fullscreen.maxExitsBeforeViolation) {
      console.log(`[FULLSCREEN_MANAGER] Escalating to HIGH violation`);
      if (violationCallback) {
        violationCallback({ type: "fullscreen_exit", severity: "high", count: exitCount });
      }
    } else {
      console.log(`[FULLSCREEN_MANAGER] Triggering violation (Severity: ${currentConfig.fullscreen.enforced ? 'medium' : 'low'})`);
      if (violationCallback) {
        violationCallback({
          type: "fullscreen_exit",
          severity: currentConfig.fullscreen.enforced ? "medium" : "low",
          count: exitCount
        });
      }

      // Only force them back if enforced
      if (currentConfig.fullscreen.enforced) {
        if (forceBackTimer) clearTimeout(forceBackTimer);
        forceBackTimer = setTimeout(() => {
          attemptFullscreen();
        }, currentConfig.fullscreen.forceBackDelayMs);
      }
    }
  }
}

export function initFullscreen(onViolation, config) {
  if (initialized) return;
  violationCallback = onViolation;
  currentConfig = config;
  
  document.addEventListener("fullscreenchange", handleFullscreenChange);

  if (config.fullscreen.enforced) {
    attemptFullscreen();
  }
  
  initialized = true;
}

export function destroyFullscreen() {
  if (!initialized) return;
  
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  if (forceBackTimer) clearTimeout(forceBackTimer);
  
  violationCallback = null;
  currentConfig = null;
  exitCount = 0;
  initialized = false;
}
