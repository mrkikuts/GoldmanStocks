// Lets the floating camera button in the mobile layout trigger the
// photo-capture flow that the active screen has registered.
let handler: (() => void) | null = null;

export function setCaptureHandler(fn: (() => void) | null) {
  handler = fn;
}

export function requestCapture() {
  handler?.();
}
