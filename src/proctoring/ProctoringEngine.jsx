import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { defaultConfig } from "./config/defaultConfig";
import AIProctoringDetector from "./AIProctoringDetector";
import ProctoringOverlay from "./ui/ProctoringOverlay";
import { captureFrame } from "./utils/captureFrame";
import { evaluateFaceRules } from "./rules/faceRules";
import { evaluateHeadPose } from "./rules/headPoseRules";
import { evaluateGaze } from "./rules/gazeRules";
import { evaluateObjectRules } from "./rules/objectRules";
import { processViolation } from "./rules/ViolationEngine";
import { handleViolationAction } from "./actions/AutoActionEngine";
import { logViolation } from "./actions/ViolationLogger";
import { initTabDetector, destroyTabDetector } from "./tab/TabDetector";
import { detectPersons } from "./person/PersonDetector";
import { detectObjects } from "./object/ObjectDetector";
import { initAudioDetector, stopAudioDetector } from "./audio/AudioDetector";
import { initFullscreen, destroyFullscreen } from "./security/FullscreenManager";
import { initKeyboardBlocker, destroyKeyboardBlocker } from "./security/KeyboardBlocker";
import { initClipboardBlocker, destroyClipboardBlocker } from "./security/ClipboardBlocker";
import { initMultiMonitorDetector, destroyMultiMonitorDetector } from "./security/MultiMonitorDetector";
import { initDevToolsDetector, destroyDevToolsDetector } from "./security/DevToolsDetector";

export default function ProctoringEngine({ examId, studentId, config = {}, onAutoSubmit, onWarning, onReady }) {
  const videoRef = useRef(null);
  const examStartRef = useRef(Date.now());
  const [warningCount, setWarningCount] = useState(0);
  const [lastViolation, setLastViolation] = useState(null);

  const mergedConfig = useMemo(() => {
    const base = {
      ...defaultConfig,
      ...config,
      face: { ...defaultConfig.face, ...config.face },
      headPose: { ...defaultConfig.headPose, ...config.headPose },
      gaze: { ...defaultConfig.gaze, ...config.gaze },
      audio: { ...defaultConfig.audio, ...config.audio },
      fullscreen: { ...defaultConfig.fullscreen, ...config.fullscreen },
      strikes: { ...defaultConfig.strikes, ...config.strikes },
      violations: { ...defaultConfig.violations, ...config.violations },
      objects: { 
        ...defaultConfig.objects, 
        ...config.objects,
        checkIntervalMs: 2000, 
        sustainedDetectionMs: 3000 
      },
      persons: { ...defaultConfig.persons, ...config.persons },
    };

    // Override with granular proctoring configuration if present
    if (config) {
      if (config.autoSubmitLimit > 0) {
        base.strikes.autoSubmitAt = config.autoSubmitLimit;
      } else if (config.autoSubmitLimit === 0) {
        base.strikes.autoSubmitAt = 999; // Effectively disabled
      }
      
      if (config.requireFullScreen !== undefined) {
        base.fullscreen.enforced = config.requireFullScreen;
      }
      
      // We'll use warningLimit to control some internal logic if needed
      // For now mapping autoSubmitLimit to autoSubmitAt is the primary 
    }

    return base;
  }, [config]);

  const submitExam = useCallback(() => onAutoSubmit?.(), [onAutoSubmit]);
  const warnStudent = useCallback((msg) => onWarning?.(msg), [onWarning]);

  const handleFinalViolation = useCallback(async (event) => {
    if (!event) return;
    console.log(`[PROCTOR_ENGINE] Processing final violation: ${event.type}`);

    // 1. GRACE PERIOD check (Skip for critical security events like fullscreen_exit)
    if (event.type !== "fullscreen_exit" && (Date.now() - examStartRef.current < mergedConfig.gracePeriodMs)) {
      console.log(`[PROCTOR_ENGINE] Violation ${event.type} ignored during grace period.`);
      return;
    }

    // 2. DEDUPLICATION check (Min 5 seconds between same type)
    const now = Date.now();
    const lastTime = lastLogTimeRef.current[event.type] || 0;
    if (now - lastTime < 5000) return;
    lastLogTimeRef.current[event.type] = now;

    // 3. Snapshot
    const snapshot = captureFrame(videoRef.current);

    // 4. Log to backend
    console.log(`[PROCTOR_ENGINE] Logging violation:`, { type: event.type, severity: event.severity, examId, studentId });
    await logViolation({
      event,
      examId,
      studentId,
      snapshot,
      config: mergedConfig
    });

    // 5. Action Engine (Strikes & UI Events)
    handleViolationAction(event, { warnStudent, submitExam }, mergedConfig);

    // 6 & 7. Update local UI state
    if (event.severity === "medium" || event.severity === "high") {
      setLastViolation(event);
      if (event.severity === "medium") {
        setWarningCount(prev => prev + 1);
      } else if (event.severity === "high") {
        setWarningCount(prev => prev + 2); // High equals 2 strikes roughly in count display 
      }
    }

    // 8. Parent callback
    onWarning?.(event);
  }, [examId, studentId, mergedConfig, warnStudent, submitExam, onWarning]);

  const processRawEvent = useCallback((rawEvents) => {
    if (!rawEvents) return;
    const events = Array.isArray(rawEvents) ? rawEvents : [rawEvents];

    events.forEach(event => {
      const finalEvent = processViolation(event, mergedConfig);
      if (finalEvent) handleFinalViolation(finalEvent);
    });
  }, [mergedConfig, handleFinalViolation]);

  // Status Handlers
  const handleFaceStatus = useCallback((status) => {
    const rules = evaluateFaceRules(status);
    processRawEvent(rules);
  }, [processRawEvent]);

  const handleHeadPose = useCallback((direction) => {
    const rule = evaluateHeadPose(direction, mergedConfig);
    processRawEvent(rule);
  }, [processRawEvent, mergedConfig]);

  const handleGaze = useCallback((direction) => {
    const rule = evaluateGaze(direction, mergedConfig);
    processRawEvent(rule);
  }, [processRawEvent, mergedConfig]);

  const handleSecurityViolation = useCallback((event) => {
    console.log(`[PROCTOR_ENGINE] Security violation received: ${event.type}`);
    processRawEvent(event);
  }, [processRawEvent]);

  const isReadyRef = useRef(false);
  const heartbeatRef = useRef(null);

  const handleReady = useCallback(() => {
    if (!isReadyRef.current) {
      isReadyRef.current = true;
      onReady?.();
    }
  }, [onReady]);

  const lastLogTimeRef = useRef({});

  // Heartbeat Effect
  useEffect(() => {
    if (config?.enabled === false) return;
    
    console.log(`[PROCTOR_HEALTH] Monitoring active for Student: ${studentId}`);
    
    // Log a "heartbeat" snapshot every 60 seconds to ensure monitoring is visible in DB
    heartbeatRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      console.log("[PROCTOR_HEALTH] Capturing heartbeat frame...");
      const snapshot = captureFrame(videoRef.current);
      await logViolation({
        event: { type: "heartbeat", severity: "low" },
        examId,
        studentId,
        snapshot,
        config: mergedConfig
      });
    }, 60000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [examId, studentId, mergedConfig, config?.enabled]);

  // Mount/Unmount effect for security detectors
  useEffect(() => {
    if (config?.enabled === false) return;

    let active = true;

    if (config?.disableTabSwitching !== false) {
      initTabDetector(handleSecurityViolation);
    }
    
    // Always init fullscreen detection if proctoring is enabled to ensure logging
    initFullscreen(handleSecurityViolation, mergedConfig);

    initKeyboardBlocker(handleSecurityViolation);
    initClipboardBlocker(handleSecurityViolation);
    initMultiMonitorDetector(handleSecurityViolation);
    initDevToolsDetector(handleSecurityViolation);

    if (mergedConfig.audio.enabled) {
      initAudioDetector(handleSecurityViolation, mergedConfig);
    }

    // Interval detectors
    const personInterval = setInterval(async () => {
      if (!active || !videoRef.current) return;
      const count = await detectPersons(videoRef.current);
      if (count > 1) {
        processRawEvent({ type: "multi_face", severity: "high", count });
      }
    }, mergedConfig.persons.checkIntervalMs);

    const objectInterval = setInterval(async () => {
      if (!active || !videoRef.current) return;
      const objects = await detectObjects(videoRef.current, mergedConfig);
      if (objects && objects.length > 0) {
        const violation = evaluateObjectRules(objects, mergedConfig);
        processRawEvent(violation);
      }
    }, mergedConfig.objects.checkIntervalMs);

    return () => {
      active = false;
      clearInterval(personInterval);
      clearInterval(objectInterval);

      destroyTabDetector();
      destroyFullscreen();
      destroyKeyboardBlocker();
      destroyClipboardBlocker();
      destroyMultiMonitorDetector();
      destroyDevToolsDetector();
      stopAudioDetector();
    };
  }, [handleSecurityViolation, mergedConfig, config?.enabled, config?.disableTabSwitching, processRawEvent]);

  if (config && config.enabled === false) {
    return null;
  }

  return (
    <>
      <AIProctoringDetector 
        videoRef={videoRef} 
        onFaceStatus={handleFaceStatus}
        onPose={handleHeadPose} 
        onGaze={handleGaze} 
        config={mergedConfig} 
        onReady={handleReady}
      />

      <ProctoringOverlay
        videoRef={videoRef}
        warningCount={warningCount}
        maxStrikes={mergedConfig.strikes.autoSubmitAt}
        lastViolation={lastViolation}
      />
    </>
  );
}
