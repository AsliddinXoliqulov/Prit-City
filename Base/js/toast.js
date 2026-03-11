export const showToast = (message, type = "success") => {
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`
  toast.textContent = message

  document.body.appendChild(toast)

  requestAnimationFrame(() => {
    toast.classList.add("toast-show")
  })

  setTimeout(() => {
    toast.classList.remove("toast-show")
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}

