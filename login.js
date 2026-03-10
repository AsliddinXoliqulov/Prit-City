import { supabase } from "./Base/js/supabaseClient.js"

const loginTabBtn = document.getElementById("loginTabBtn")
const registerTabBtn = document.getElementById("registerTabBtn")
const loginPanel = document.getElementById("loginPanel")
const registerPanel = document.getElementById("registerPanel")
const authStatus = document.getElementById("authStatus")

const loginForm = document.getElementById("loginForm")
const loginEmail = document.getElementById("loginEmail")
const loginPassword = document.getElementById("loginPassword")

const registerForm = document.getElementById("registerForm")
const registerFullName = document.getElementById("registerFullName")
const registerEmail = document.getElementById("registerEmail")
const registerPassword = document.getElementById("registerPassword")
const registerPassword2 = document.getElementById("registerPassword2")

const forgotModal = document.getElementById("forgotModal")
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn")
const forgotCloseBtn = document.getElementById("forgotCloseBtn")
const forgotForm = document.getElementById("forgotForm")
const forgotEmail = document.getElementById("forgotEmail")
const forgotStatus = document.getElementById("forgotStatus")

const RESET_REDIRECT_URL = `${location.origin}/Reset_Pasword/reset.html`
const showToast = (message, type = "success") => {
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`
  toast.textContent = message

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.classList.add("toast-show")
  }, 50)

  setTimeout(() => {
    toast.classList.remove("toast-show")
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}
const setStatus = (message = "") => {
  if (authStatus) authStatus.textContent = message
}

const setForgotStatus = (message = "") => {
  if (forgotStatus) forgotStatus.textContent = message
}

const openForgotModal = () => {
  forgotModal?.classList.remove("hidden")
}

const closeForgotModal = () => {
  forgotModal?.classList.add("hidden")
  setForgotStatus("")
}

const showLoginTab = () => {
  loginTabBtn?.classList.add("active")
  registerTabBtn?.classList.remove("active")
  loginPanel?.classList.remove("hidden")
  registerPanel?.classList.add("hidden")
  setStatus("")
}

const showRegisterTab = () => {
  registerTabBtn?.classList.add("active")
  loginTabBtn?.classList.remove("active")
  registerPanel?.classList.remove("hidden")
  loginPanel?.classList.add("hidden")
  setStatus("")
}

const togglePasswordInput = (inputId, button) => {
  const input = document.getElementById(inputId)
  if (!input || !button) return

  const isPassword = input.type === "password"
  input.type = isPassword ? "text" : "password"

  button.innerHTML = isPassword
    ? `<i class="fa-regular fa-eye-slash"></i>`
    : `<i class="fa-regular fa-eye"></i>`
}

const redirectByRole = (role) => {

  saveRoleToStorage(role)

  if (role === "admin" || role === "manager") {
    location.href = "/Print_Citiy_admin/html/orders.html"
    return
  }

  location.href = "/Print_Citiy_magazin/html/product.html"
}

const getProfileByUserId = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, is_active, full_name")
    .eq("id", userId)
    .maybeSingle()

  return { data, error }
}

const ensureProfileExists = async (user) => {
  const { data: existingProfile, error: existingError } = await getProfileByUserId(user.id)

  console.log("existingProfile:", existingProfile)
  console.log("existingError:", existingError)

  if (existingError) {
    return { data: null, error: existingError }
  }

  if (existingProfile) {
    return { data: existingProfile, error: null }
  }

  const fullName = user.user_metadata?.full_name || ""

  const { error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: fullName,
      email: user.email,
      role: "user",
      is_active: true
    })

  console.log("insert profile error:", insertError)

  if (insertError) {
    return { data: null, error: insertError }
  }

  return await getProfileByUserId(user.id)
}

const updateLastLogin = async (userId) => {
  const { error } = await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId)

  console.log("updateLastLogin error:", error)

  return error
}

const checkExistingSession = async () => {
  try {

    const { data: sessionData } = await supabase.auth.getSession()

    const user = sessionData.session?.user
    if (!user) return

    const { data: profile } = await getProfileByUserId(user.id)

    if (!profile) return

    if (profile.is_active === false) {
      await supabase.auth.signOut()
      setStatus("Sizning profilingiz faolsiz.")
      return
    }

    saveRoleToStorage(profile.role)

    redirectByRole(profile.role)

  } catch (err) {
    console.error("checkExistingSession error:", err)
  }
}

loginTabBtn?.addEventListener("click", showLoginTab)
registerTabBtn?.addEventListener("click", showRegisterTab)
forgotPasswordBtn?.addEventListener("click", openForgotModal)
forgotCloseBtn?.addEventListener("click", closeForgotModal)

forgotModal?.addEventListener("click", (e) => {
  const t = e.target
  if (t && t.dataset && t.dataset.close === "1") closeForgotModal()
})

document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
  btn.addEventListener("click", () => {
    togglePasswordInput(btn.dataset.togglePassword, btn)
  })
})

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  try {
    setStatus("Kirilmoqda...")

    const email = loginEmail.value.trim()
    const password = loginPassword.value

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log("signIn result:", { data, error })

    if (error) {
      setStatus(error.message || "Login yoki parol xato.")
      return
    }

    const user = data.user

    if (!user) {
      setStatus("Foydalanuvchi topilmadi.")
      return
    }

    const { data: profile, error: profileError } = await ensureProfileExists(user)

    console.log("profile result:", { profile, profileError })

    if (profileError) {
      setStatus(profileError.message || "Profilni o‘qishda xatolik.")
      return
    }

    if (!profile) {
      setStatus("Profil topilmadi.")
      return
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut()
      setStatus("Sizning profilingiz faolsiz (bloklangan).")
      return
    }

    const lastLoginError = await updateLastLogin(user.id)

    if (lastLoginError) {
      console.log("lastLoginError:", lastLoginError)
    }

    setStatus("Muvaffaqiyatli kirdingiz.")

    saveRoleToStorage(profile.role)

    setTimeout(() => {
      redirectByRole(profile.role)
    }, 300)
  } catch (err) {
    console.error("login submit error:", err)
    setStatus("Kutilmagan xatolik yuz berdi.")
  }
})

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  try {
    setStatus("Ro‘yxatdan o‘tilmoqda...")

    const fullName = registerFullName.value.trim()
    const email = registerEmail.value.trim()
    const password = registerPassword.value
    const password2 = registerPassword2.value

    if (password.length < 6) {
      setStatus("Parol kamida 6 ta belgidan iborat bo‘lsin.")
      showToast("Parol kamida 6 ta belgidan iborat bo‘lsin.", "error")
      return
    }

    if (password !== password2) {
      setStatus("Parollar bir xil emas.")
      showToast("Parollar bir xil emas.", "error")
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/index.html`,
        data: {
          full_name: fullName
        }
      }
    })

    console.log("signUp result:", { data, error })

    if (error) {
      setStatus(error.message || "Ro‘yxatdan o‘tishda xatolik.")
      showToast(error.message || "Ro‘yxatdan o‘tishda xatolik.", "error")
      return
    }

    if (data.user && data.session) {
      const { error: profileError } = await ensureProfileExists(data.user)
      console.log("register ensure profile error:", profileError)
    }

    registerForm.reset()
    showLoginTab()
    setStatus("")

    showToast("📧 Emailga tasdiqlash xati yuborildi.", "success")
  } catch (err) {
    console.error("register submit error:", err)
    setStatus("Kutilmagan xatolik yuz berdi.")
    showToast("Kutilmagan xatolik yuz berdi.", "error")
  }
})

const saveRoleToStorage = (role) => {
  localStorage.setItem("user_role", role)
}

forgotForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  try {
    setForgotStatus("Yuborilmoqda...")

    const email = forgotEmail.value.trim()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT_URL
    })

    console.log("forgot password error:", error)

    if (error) {
      setForgotStatus(error.message || "Xatolik yuz berdi.")
      return
    }

    setForgotStatus("Agar bu email ro‘yxatdan o‘tgan bo‘lsa, link yuborildi.")
    forgotForm.reset()
  } catch (err) {
    console.error("forgot submit error:", err)
    setForgotStatus("Kutilmagan xatolik yuz berdi.")
  }
})

checkExistingSession()
