/**
 * Sizes the canvas backing store to its CSS box times the device pixel ratio (capped).
 * Returns true when the size changed, so callers can resize their viewport.
 */
export function fitCanvasToDisplay(canvas: HTMLCanvasElement, maxPixelRatio = 2): boolean {
  const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width === width && canvas.height === height) {
    return false;
  }
  canvas.width = width;
  canvas.height = height;
  return true;
}
