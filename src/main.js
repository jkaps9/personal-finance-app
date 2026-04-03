const minimizeButton = document.querySelector("#minimize-btn");
const header = document.querySelector("header");

if (minimizeButton) {
  minimizeButton.addEventListener("click", (e) => {
    if (header) {
      header.classList.toggle("minimized");
    }
  });
}
