/** Shakes the screen for an instant (feedback for a hit or a mistake). */
export function shake() {
  const main = document.querySelector("main");
  if (!main) return;
  main.classList.remove("shake");
  void (main as HTMLElement).offsetWidth;
  main.classList.add("shake");
  setTimeout(() => main.classList.remove("shake"), 400);
}
