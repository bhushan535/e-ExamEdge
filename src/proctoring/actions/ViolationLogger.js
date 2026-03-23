import { BASE_URL } from '../../config';

/**
 * Logs a proctoring violation to the backend.
 * Includes a retry mechanism for improved reliability.
 */
export async function logViolation({ event, examId, studentId, snapshot, config }) {
  // Only include snapshot if: high severity, OR (medium AND config.snapshotOnMedium)
  const includeSnapshot = event.severity === "high" || (event.severity === "medium" && config.snapshotOnMedium);

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
