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
const lastLoginInput = document.getElementById("lastLoginInput")
const createdAtInput = document.getElementById("createdAtInput")
const profileForm = document.getElementById("profileForm")
const profileStatus = document.getElementById("profileStatus")

const avatarInput = document.getElementById("avatarInput")
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
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.log("getSession error:", error)
    return null
  }

  return data.session?.user || null
}

const updateCartBadge = () => {
  if (!cartCountBadge) return

  const cart = JSON.parse(localStorage.getItem("pc_cart") || "[]")
  const total = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  cartCountBadge.textContent = String(total)
}

const updateLikedBadge = async () => {
  if (!likedCountBadge) return

  const user = await getSessionUser()

  if (!user) {
    likedCountBadge.textContent = "0"
    return
  }

  const { data, error } = await supabase
    .from("liked_products")
    .select("id")
    .eq("user_id", user.id)

  if (error) {
    console.log("liked_products error:", error)
    likedCountBadge.textContent = "0"
    return
  }

  likedCountBadge.textContent = String((data || []).length)
}

const renderAvatar = (profile) => {
  if (!profileAvatar) return

  if (profile?.avatar_url) {
    profileAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" />`
    return
  }

  profileAvatar.textContent = initials(profile?.full_name)
}

const fillProfile = (profile) => {
  currentProfile = profile

  const emailValue = currentUser?.email || "-"

  renderAvatar(profile)
  profileNameText.textContent = profile.full_name || "Foydalanuvchi"
  profileEmailText.textContent = emailValue
  profileRoleBadge.textContent = profile.role || "user"

  fullNameInput.value = profile.full_name || ""
  phoneInput.value = profile.phone || ""
  emailInput.value = emailValue
  lastLoginInput.value = fmtDate(profile.last_login_at)
  createdAtInput.value = fmtDate(profile.created_at)
}

const showState = (message) => {
  if (profileState) {
    profileState.textContent = message
    profileState.classList.remove("hidden")
  }

  profileContent?.classList.add("hidden")
}

const showProfile = () => {
  profileState?.classList.add("hidden")
  profileContent?.classList.remove("hidden")
}

const loadProfile = async () => {
  try {
    showState("Yuklanmoqda...")

    currentUser = await getSessionUser()

    if (!currentUser) {
      showState("Profilni ko‘rish uchun login qiling.")
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, last_login_at, created_at, is_active, avatar_url")
      .eq("id", currentUser.id)
      .maybeSingle()

    console.log("profile query:", { data, error })

    if (error) {
      showState("Profilni yuklashda xatolik yuz berdi.")
      return
    }

    if (!data) {
      showState("Profil topilmadi.")
      return
    }

    if (data.is_active === false) {
      showState("Profilingiz faolsiz.")
      return
    }

    fillProfile(data)
    showProfile()

    const time = new Date().toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })

    if (profileInfo) {
      profileInfo.textContent = "Oxirgi yangilanish · " + time
    }
  } catch (err) {
    console.log("loadProfile catch error:", err)
    showState("Kutilmagan xatolik yuz berdi.")
  }
}

const validateAvatarFile = (file) => {
  if (!file) return { ok: true }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
  const maxSize = 5 * 1024 * 1024

  if (!allowedTypes.includes(file.type)) {
    return { ok: false, message: "Faqat png, jpg, jpeg yoki webp rasm yuklang." }
  }

  if (file.size > maxSize) {
    return { ok: false, message: "Avatar hajmi 5 MB dan oshmasligi kerak." }
  }

  return { ok: true }
}

const uploadAvatar = async (file) => {
  if (!currentUser || !file) return currentProfile?.avatar_url || null

  const ext = file.name.split(".").pop()?.toLowerCase() || "png"
  const filePath = `${currentUser.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    console.log("avatar upload error:", uploadError)
    throw new Error("Avatar yuklashda xatolik yuz berdi.")
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath)

  return data.publicUrl
}

avatarInput?.addEventListener("change", () => {
  const file = avatarInput.files?.[0]
  if (!file || !profileAvatar) return

  const check = validateAvatarFile(file)

  if (!check.ok) {
    profileStatus.textContent = check.message
    avatarInput.value = ""
    return
  }

  const reader = new FileReader()

  reader.onload = () => {
    profileAvatar.innerHTML = `<img src="${reader.result}" alt="Avatar preview">`
  }

  reader.readAsDataURL(file)
})

profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  if (!currentUser) return

  profileStatus.textContent = "Saqlanmoqda..."

  try {
    const fullName = fullNameInput.value.trim()
    const phone = phoneInput.value.trim()
    const avatarFile = avatarInput?.files?.[0] || null

    let avatarUrl = currentProfile?.avatar_url || null

    if (avatarFile) {
      const check = validateAvatarFile(avatarFile)

      if (!check.ok) {
        profileStatus.textContent = check.message
        return
      }

      avatarUrl = await uploadAvatar(avatarFile)
    }

    const payload = {
      full_name: fullName,
      phone,
      avatar_url: avatarUrl
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", currentUser.id)

    if (error) {
      console.log("update profile error:", error)
      profileStatus.textContent = "Xatolik yuz berdi."
      return
    }

    profileStatus.textContent = "Saqlandi"
    await loadProfile()
  } catch (err) {
    console.log("submit catch error:", err)
    profileStatus.textContent = err.message || "Xatolik yuz berdi."
  }
})

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut()
  location.href = "../html/product.html"
})

const init = async () => {
  updateCartBadge()
  await updateLikedBadge()
  await loadProfile()
}

init()