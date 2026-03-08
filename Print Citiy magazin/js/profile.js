import { supabase } from "../../Base/js/supabaseClient.js"

const profileState = document.getElementById("profileState")
const profileContent = document.getElementById("profileContent")
const profileInfo = document.getElementById("profileInfo")

const profileAvatar = document.getElementById("profileAvatar")
const profileNameText = document.getElementById("profileNameText")
const profileEmailText = document.getElementById("profileEmailText")
const profileRoleBadge = document.getElementById("profileRoleBadge")

const fullNameInput = document.getElementById("fullNameInput")
const phoneInput = document.getElementById("phoneInput")
const emailInput = document.getElementById("emailInput")
const roleInput = document.getElementById("roleInput")
const lastLoginInput = document.getElementById("lastLoginInput")
const createdAtInput = document.getElementById("createdAtInput")
const profileForm = document.getElementById("profileForm")
const profileStatus = document.getElementById("profileStatus")

const summaryRole = document.getElementById("summaryRole")
const summaryEmail = document.getElementById("summaryEmail")
const summaryPhone = document.getElementById("summaryPhone")
const summaryBlocked = document.getElementById("summaryBlocked")

const logoutBtn = document.getElementById("logoutBtn")
const likedCountBadge = document.getElementById("likedCountBadge")
const cartCountBadge = document.getElementById("cartCountBadge")

let currentUser = null
let currentProfile = null

const fmtDate = (iso) => {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("uz-UZ")
  } catch {
    return iso
  }
}

const initials = (name) => {
  const parts = String(name || "User").trim().split(" ").filter(Boolean)
  if (!parts.length) return "U"
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const getSessionUser = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.user || null
}

const updateCartBadge = () => {
  const cart = JSON.parse(localStorage.getItem("pc_cart") || "[]")
  const total = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  cartCountBadge.textContent = total
}

const updateLikedBadge = async () => {
  const user = await getSessionUser()
  if (!user) {
    likedCountBadge.textContent = 0
    return
  }

  const { data } = await supabase
    .from("liked_products")
    .select("id")
    .eq("user_id", user.id)

  likedCountBadge.textContent = (data || []).length
}

const fillProfile = (profile) => {
  currentProfile = profile

  profileAvatar.textContent = initials(profile.full_name)
  profileNameText.textContent = profile.full_name || "Foydalanuvchi"
  profileEmailText.textContent = profile.email || "-"
  profileRoleBadge.textContent = profile.role || "user"

  fullNameInput.value = profile.full_name || ""
  phoneInput.value = profile.phone || ""
  emailInput.value = profile.email || ""
  roleInput.value = profile.role || ""
  lastLoginInput.value = fmtDate(profile.last_login_at)
  createdAtInput.value = fmtDate(profile.created_at)

  summaryRole.textContent = profile.role || "-"
  summaryEmail.textContent = profile.email || "-"
  summaryPhone.textContent = profile.phone || "-"
  summaryBlocked.textContent = profile.is_blocked ? "Blocked" : "Active"
}

const loadProfile = async () => {
  currentUser = await getSessionUser()

  if (!currentUser) {
    profileState.textContent = "Profilni ko‘rish uchun login qiling."
    return
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, email, last_login_at, created_at, is_blocked")
    .eq("id", currentUser.id)
    .single()

  if (error || !data) {
    profileState.textContent = "Profil topilmadi."
    return
  }

  if (data.is_blocked) {
    profileState.textContent = "Profilingiz bloklangan."
    return
  }

  fillProfile(data)

  profileState.classList.add("hidden")
  profileContent.classList.remove("hidden")

  const time = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  profileInfo.textContent = "Oxirgi yangilanish · " + time
}

profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  if (!currentUser) return

  profileStatus.textContent = "Saqlanmoqda..."

  const payload = {
    full_name: fullNameInput.value.trim(),
    phone: phoneInput.value.trim()
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", currentUser.id)

  if (error) {
    profileStatus.textContent = "Xatolik!"
    return
  }

  profileStatus.textContent = "Saqlandi"
  await loadProfile()
})

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut()
  location.href = "../index.html"
})

const init = async () => {
  updateCartBadge()
  await updateLikedBadge()
  await loadProfile()
}

init()