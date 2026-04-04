import { BASE_URL } from '../../config';

/**
 * Logs a proctoring violation to the backend.
 * Includes a retry mechanism for improved reliability.
 * 
 * Snapshot rules (per-violation cooldown):
 * - NO_SNAPSHOT_TYPES (short_glance, short_noise) → never snapshot
 * - Low severity → no snapshot
 * - tab_switch → snapshot only from 2nd occurrence onwards
 * - All high + medium → snapshot, subject to 20s per-type cooldown
 * - Strike/log always fires regardless of snapshot cooldown
 */

// Types that should NEVER get a snapshot
const NO_SNAPSHOT_TYPES = new Set(["short_glance", "short_noise"]);

// Per-violation-type snapshot cooldown tracker
const lastSnapshotTime = {};

// Tab switch counter for snapshot gating (snapshot only from 2nd switch)
let tabSwitchSnapshotCount = 0;

/**
 * Determines whether a snapshot should be included for this violation.
 */
function shouldIncludeSnapshot(event, config) {
  const now = Date.now();
  const type = event.type;

  // 1. Never snapshot these types
  if (NO_SNAPSHOT_TYPES.has(type)) return false;

  // 2. Low severity → no snapshot
  if (event.severity === "low") return false;

  // 3. Heartbeat always gets a snapshot (it's a health check)
  if (type === "heartbeat") return true;

  // 4. tab_switch → snapshot only from 2nd occurrence onwards
  if (type === "tab_switch") {
    tabSwitchSnapshotCount++;
    if (tabSwitchSnapshotCount < 2) return false;
  }

  // 5. Per-type snapshot cooldown (20s default)
  const cooldownMs = config.snapshotCooldownMs || 20000;
  const lastTime = lastSnapshotTime[type] || 0;
  if (now - lastTime < cooldownMs) {
    console.log(`[VIOLATION_LOGGER] Snapshot suppressed for ${type} (cooldown: ${Math.round((cooldownMs - (now - lastTime)) / 1000)}s remaining)`);
    return false;
  }

  // 6. High or medium severity → snapshot allowed
  lastSnapshotTime[type] = now;
  return true;
}

export async function logViolation({ event, examId, studentId, snapshot, config }) {
  // Decide whether to include the snapshot using the new rules
  const includeSnapshot = shouldIncludeSnapshot(event, config);

  const payload = {
    examId,
    studentId,
    type: event.type,
    severity: event.severity,
    timestamp: Date.now(),
    snapshot: includeSnapshot ? snapshot : null,
    meta: {
      count: event.count || null,
      duration: event.duration || null,
      object: event.object || null,
      direction: event.direction || null,
      key: event.meta?.key || null,
      tabTitle: event.meta?.tabTitle || null,
      dB: event.dB || null,
    }
  };

  const endpoint = `${BASE_URL}/violations`;
  console.log(`[VIOLATION_LOGGER] Attempting to log ${event.type} to ${endpoint}...`, { severity: event.severity, hasSnapshot: !!payload.snapshot });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[VIOLATION_LOGGER] Server error (${res.status}): ${errorText}`);
      throw new Error(`HTTP Error ${res.status}`);
    }

    console.log(`[VIOLATION_LOGGER] Successfully saved violation: ${event.type}`);
    return true;
  } catch (err) {
    console.error(`[VIOLATION_LOGGER] Primary attempt failed for ${event.type}: ${err.message}`);

    // Simple one-time retry after 3 seconds
    setTimeout(async () => {
      try {
        console.log(`[VIOLATION_LOGGER] Retrying log for ${event.type}...`);
        const retryRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (retryRes.ok) {
          console.log(`[VIOLATION_LOGGER] Successfully saved on retry: ${event.type}`);
        } else {
          console.error(`[VIOLATION_LOGGER] Retry failed with status: ${retryRes.status}`);
        }
      } catch (retryErr) {
        console.error(`[VIOLATION_LOGGER] Retry attempt error for ${event.type}:`, retryErr);
      }
    }, 3000);

    return false;
  }
}
