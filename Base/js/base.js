const root = document.documentElement
const themeToggle = document.getElementById("themeToggle")

const savedTheme = localStorage.getItem("theme-mode")
if (savedTheme) {
  root.setAttribute("data-theme", savedTheme)
}

const setThemeIcon = () => {
  if (!themeToggle) return
  const dark = root.getAttribute("data-theme") === "dark"
  themeToggle.innerHTML = dark
    ? `<i class="fa-solid fa-sun"></i>`
    : `<i class="fa-solid fa-moon"></i>`
}

setThemeIcon()

themeToggle?.addEventListener("click", () => {
  const current = root.getAttribute("data-theme") === "dark" ? "light" : "dark"
  root.setAttribute("data-theme", current)
  localStorage.setItem("theme-mode", current)
  setThemeIcon()
})