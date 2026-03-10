import { supabase } from "../Base/js/supabaseClient.js"

const resetForm = document.getElementById("resetForm")
const newPassword = document.getElementById("newPassword")
const newPassword2 = document.getElementById("newPassword2")
const resetStatus = document.getElementById("resetStatus")
const resetUserInfo = document.getElementById("resetUserInfo")

const togglePasswordInput = (inputId, button) => {
  const input = document.getElementById(inputId)
  if (!input) return

  const isPassword = input.type === "password"
  input.type = isPassword ? "text" : "password"

  button.innerHTML = isPassword
    ? `<i class="fa-regular fa-eye-slash"></i>`
    : `<i class="fa-regular fa-eye"></i>`
}

document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
  btn.addEventListener("click", () => {
    togglePasswordInput(btn.dataset.togglePassword, btn)
  })
})

const loadUserInfo = async () => {
  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (user?.email) {
    resetUserInfo.textContent = `Email: ${user.email}`
  } else {
    resetUserInfo.textContent = "Reset havolasi orqali kiring."
  }
}

resetForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  resetStatus.textContent = "Yangilanmoqda..."

  const pass1 = newPassword.value
  const pass2 = newPassword2.value

  if (pass1.length < 6) {
    resetStatus.textContent = "Parol kamida 6 ta belgidan iborat bo‘lsin."
    return
  }

  if (pass1 !== pass2) {
    resetStatus.textContent = "Parollar bir xil emas."
    return
  }

  const { error } = await supabase.auth.updateUser({
    password: pass1
  })

  if (error) {
    resetStatus.textContent = "Parolni yangilashda xatolik."
    return
  }

  resetStatus.textContent = "Parol muvaffaqiyatli yangilandi. Endi login qiling."
  resetForm.reset()

  setTimeout(() => {
    location.href = "../index.html"
  }, 1400)
})

loadUserInfo()