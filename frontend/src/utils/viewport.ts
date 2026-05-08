export function isNarrowViewport(): boolean {
  return Math.min(window.innerWidth, window.innerHeight) < 640
}
