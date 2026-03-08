import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"

const SUPABASE_URL = "https://zsyzaautgrcllkdlzwvu.supabase.co"
const SUPABASE_KEY = "sb_publishable_5GBbI9rD6lgy_K6XIHXBUw_TY0pP48B"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const form = document.querySelector("#loginForm")
const emailInput = document.querySelector("#emailInput")
const passwordInput = document.querySelector("#passwordInput")
const statusText = document.querySelector("#statusText")

const toggleBtn = document.querySelector("#togglePassword")
// const pwIcon = document.querySelector("#pwIcon")

// if (toggleBtn) {
//   toggleBtn.addEventListener("click", () => {
//     passwordInput.type = passwordInput.type === "password" ? "text" : "password"
//     pwIcon.className = passwordInput.type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"
//     passwordInput.focus()
//   })
// }

form.addEventListener("submit", async (e) => {
  e.preventDefault()

  statusText.textContent = "Tekshirilmoqda..."

  const email = emailInput.value.trim()
  const password = passwordInput.value

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    statusText.textContent = "Login yoki parol xato"
    return
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_active")
    .single()

  if (profileError || !profile) {
    statusText.textContent = "Profil topilmadi"
    await supabase.auth.signOut()
    return
  }

  if (!profile.is_active) {
    statusText.textContent = "Account faollashtirilmagan"
    await supabase.auth.signOut()
    return
  }

  if (profile.role !== "admin" && profile.role !== "manager") {
    statusText.textContent = "Ruxsat yo‘q"
    await supabase.auth.signOut()
    return
  }

  statusText.textContent = "Kirish muvaffaqiyatli..."
  setTimeout(() => (location.href = "./products.html"), 500)
})