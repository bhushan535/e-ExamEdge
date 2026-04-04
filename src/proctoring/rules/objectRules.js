const PHONE_LABELS = ["cell phone", "cellphone", "mobile phone", "phone", "remote", "telephone", "mobile"];
const BOOK_LABELS = ["book", "notebook", "magazine"];

let objectStartTime = {};

export function evaluateObjectRules(objects, config) {
  const currentObjectTypes = new Set(objects.map(obj => obj.class));
  const violations = [];
  const now = Date.now();

  objects.forEach(obj => {
    const isPhone = PHONE_LABELS.includes(obj.class);
    const isBook = BOOK_LABELS.includes(obj.class);
    
    if (isPhone || isBook) {
      if (!objectStartTime[obj.class]) {
        objectStartTime[obj.class] = now;
      }

      const duration = now - objectStartTime[obj.class];
      const sustainedMs = config?.objects?.sustainedDetectionMs || 3000;

      if (duration >= sustainedMs) {
        violations.push({
          type: "object_detected",
          severity: "high",
          object: obj.class,
          duration
        });
      }
    }
  });

  // Clean up objects no longer visible
  Object.keys(objectStartTime).forEach(key => {
    if (!currentObjectTypes.has(key)) {
      delete objectStartTime[key];
    }
  });

  return violations;
}
