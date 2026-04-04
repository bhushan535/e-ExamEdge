/**
 * CameraBlockedDetector — detects when camera feed goes black/blank.
 * 
 * Samples the video feed at a configurable interval (default 500ms),
 * computes average pixel brightness. If brightness stays below threshold
 * (default 15/255) continuously for the configured duration (default 3s),
 * fires a { type: "camera_blocked", severity: "high" } violation.
 * 
 * Has a 60s cooldown between repeat violations.
 */

let checkInterval = null;
let blackStartTime = null;
let lastViolationTime = 0;

/**
 * Computes the average pixel brightness from a video element.
 * Uses an offscreen canvas to sample the current frame.
 */
function getAverageBrightness(videoEl) {
  if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) return -1;

  try {
    const canvas = document.createElement("canvas");
    // Sample at reduced resolution for performance
    const sampleWidth = 64;
    const sampleHeight = 48;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, sampleWidth, sampleHeight);

    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;

    let totalBrightness = 0;
    const pixelCount = data.length / 4; // RGBA = 4 values per pixel

    for (let i = 0; i < data.length; i += 4) {
      // Luminance formula: 0.299*R + 0.587*G + 0.114*B
      totalBrightness += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    return totalBrightness / pixelCount;
  } catch {
    return -1;
  }
}

/**
 * Starts the camera blocked detector.
 * @param {React.RefObject} videoRef - ref to the video element
 * @param {Function} onViolation - callback to fire when violation is detected
 * @param {Object} config - merged proctoring config
 */
export function initCameraBlockedDetector(videoRef, onViolation, config) {
  if (checkInterval) return; // Already running

  const thresholdMs = config?.cameraBlocked?.thresholdMs || 3000;
  const intervalMs = config?.cameraBlocked?.checkIntervalMs || 500;
  const brightnessThreshold = config?.cameraBlocked?.brightnessThreshold || 15;
  const cooldownMs = config?.cameraBlocked?.cooldownMs || 60000;

  console.log("[CAMERA_BLOCKED] Detector initialized", { thresholdMs, intervalMs, brightnessThreshold });

  checkInterval = setInterval(() => {
    if (!videoRef?.current) return;

    const brightness = getAverageBrightness(videoRef.current);
    if (brightness < 0) return; // Video not ready

    if (brightness < brightnessThreshold) {
      // Frame is dark/black
      if (!blackStartTime) {
        blackStartTime = Date.now();
      }

      const duration = Date.now() - blackStartTime;
      if (duration >= thresholdMs) {
        const now = Date.now();
        // Check cooldown
        if (now - lastViolationTime >= cooldownMs) {
          lastViolationTime = now;
          blackStartTime = null; // Reset for next detection
          console.log(`[CAMERA_BLOCKED] Camera blocked for ${Math.round(duration / 1000)}s — firing violation`);
          onViolation({
            type: "camera_blocked",
            severity: "high",
            duration
          });
        }
      }
    } else {
      // Frame is visible — reset the timer
      blackStartTime = null;
    }
  }, intervalMs);
}

/**
 * Stops the camera blocked detector and resets state.
 */
export function destroyCameraBlockedDetector() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  blackStartTime = null;
  lastViolationTime = 0;
}
