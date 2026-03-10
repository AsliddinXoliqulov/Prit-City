import { supabase } from "../../Base/js/supabaseClient.js"
import { requireRoles } from "../../Base/js/auth.js"

let me = null
let initialProfile = null

const roleBadge = document.getElementById("roleBadge")
const profileInfo = document.getElementById("profileInfo")

const avatarPreview = document.getElementById("avatarPreview")
// const profileStatus = document.getElementById("profileStatus")
const profileName = document.getElementById("profileName")
const profileEmail = document.getElementById("profileEmail")
const profilePhone = document.getElementById("profilePhone")
const profileRole = document.getElementById("profileRole")
const profileLastLogin = document.getElementById("profileLastLogin")
const profileCreated = document.getElementById("profileCreated")
const logoutBtn = document.getElementById("logoutBtn")

const openEditModalBtn = document.getElementById("openEditModalBtn")
const closeEditModalBtn = document.getElementById("closeEditModalBtn")
const editProfileModal = document.getElementById("editProfileModal")

const profileEditForm = document.getElementById("profileEditForm")
const fullNameInput = document.getElementById("fullNameInput")
const phoneInput = document.getElementById("phoneInput")
const emailInput = document.getElementById("emailInput")
const avatarInput = document.getElementById("avatarInput")

const currentPasswordInput = document.getElementById("currentPasswordInput")
const newPasswordInput = document.getElementById("newPasswordInput")
const confirmPasswordInput = document.getElementById("confirmPasswordInput")

const profileFormStatus = document.getElementById("profileFormStatus")
const resetProfileBtn = document.getElementById("resetProfileBtn")

const togglePasswordFields = document.getElementById("togglePasswordFields")
const newPasswordFields = document.getElementById("newPasswordFields")

togglePasswordFields?.addEventListener("click", () => {

    if(newPasswordFields.style.display === "block"){
        newPasswordFields.style.display = "none"
        togglePasswordFields.textContent = "Parolni o‘zgartirish"
    }else{
        newPasswordFields.style.display = "block"
        togglePasswordFields.textContent = "Parolni bekor qilish"
    }

})

function setStatus(message, isError = false) {
    profileFormStatus.textContent = message
    profileFormStatus.style.color = isError ? "#dc2626" : ""
}

function formatDate(value) {
    if (!value) return "-"
    return new Date(value).toLocaleString("uz-UZ")
}

function getInitials(name = "") {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() || "")
        .join("") || "PC"
}

function renderAvatar(url, name) {
    if (url) {
        avatarPreview.innerHTML = `<img src="${url}" alt="Avatar">`
        return
    }

    avatarPreview.textContent = getInitials(name)
}

function fillProfile(profile, user) {
    const fullName = profile?.full_name || "Foydalanuvchi"
    const phone = profile?.phone || "-"
    const email = user?.email || "-"
    const role = profile?.role || "user"

    profileName.textContent = fullName
    profileEmail.textContent = email
    profilePhone.textContent = phone
    profileRole.textContent = role
    profileCreated.textContent = formatDate(user?.created_at)
    profileLastLogin.textContent = formatDate(user?.last_sign_in_at)
    // profileStatus.textContent = "Faol"
    roleBadge.textContent = role
    profileInfo.textContent = "Faol"

    renderAvatar(profile?.avatar_url, fullName)
}

function fillForm(profile, user) {
    fullNameInput.value = profile?.full_name || ""
    phoneInput.value = profile?.phone || ""
    emailInput.value = user?.email || ""
    currentPasswordInput.value = ""
    newPasswordInput.value = ""
    confirmPasswordInput.value = ""
    avatarInput.value = ""
}

function openModal() {
    editProfileModal.classList.add("show")
    document.body.style.overflow = "hidden"
}

function closeModal() {
    editProfileModal.classList.remove("show")
    document.body.style.overflow = ""
    setStatus("")
}

async function uploadAvatar(file, userId) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    const allowedExts = ["png", "jpg", "jpeg", "webp"]

    if (!allowedExts.includes(ext)) {
        throw new Error("Faqat png, jpg, jpeg, webp rasm yuklang")
    }

    const oldFiles = [
        `users/${userId}/avatar.png`,
        `users/${userId}/avatar.jpg`,
        `users/${userId}/avatar.jpeg`,
        `users/${userId}/avatar.webp`
    ]

    await supabase.storage
        .from("avatars")
        .remove(oldFiles)

    const filePath = `users/${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type
        })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

    return `${data.publicUrl}?t=${Date.now()}`
}

async function reAuthenticate(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) throw error
}

async function loadProfile() {
    await requireRoles(["admin", "manager", "user"])

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
        window.location.href = "../../index.html"
        return
    }

    me = authData.user

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", me.id)
        .single()

    if (profileError) {
        profileInfo.textContent = "Profil yuklanmadi"
        return
    }

    initialProfile = profile
    fillProfile(profile, me)
    fillForm(profile, me)
}

openEditModalBtn?.addEventListener("click", () => {
    fillForm(initialProfile, me)
    openModal()
})

closeEditModalBtn?.addEventListener("click", closeModal)

editProfileModal?.addEventListener("click", (e) => {
    if (e.target === editProfileModal) closeModal()
})

resetProfileBtn?.addEventListener("click", () => {
    fillForm(initialProfile, me)
    setStatus("")
})

logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut()
    window.location.href = "../../index.html"
})

profileEditForm?.addEventListener("submit", async (e) => {
    e.preventDefault()
    setStatus("Saqlanmoqda...")

    try {
        const fullName = fullNameInput.value.trim()
        const phone = phoneInput.value.trim()
        const email = emailInput.value.trim()
        const currentPassword = currentPasswordInput.value
        const newPassword = newPasswordInput.value
        const confirmPassword = confirmPasswordInput.value
        const avatarFile = avatarInput.files?.[0] || null

        if (!currentPassword) {
            setStatus("Tasdiqlash uchun eski parolni kiriting", true)
            return
        }

        if (newPassword || confirmPassword) {
            if (newPassword.length < 6) {
                setStatus("Yangi parol kamida 6 ta belgidan iborat bo‘lsin", true)
                return
            }

            if (newPassword !== confirmPassword) {
                setStatus("Yangi parollar bir xil emas", true)
                return
            }
        }

        await reAuthenticate(me.email, currentPassword)

        let avatarUrl = initialProfile?.avatar_url || null

        if (avatarFile) {
            avatarUrl = await uploadAvatar(avatarFile, me.id)
        }

        const profileUpdates = {
            full_name: fullName,
            phone,
            avatar_url: avatarUrl
        }

        const { error: profileUpdateError } = await supabase
            .from("profiles")
            .update(profileUpdates)
            .eq("id", me.id)

        if (profileUpdateError) throw profileUpdateError

        if (email && email !== me.email) {
            const { error: emailError } = await supabase.auth.updateUser({ email })
            if (emailError) throw emailError
        }

        if (newPassword) {
            const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
            if (passwordError) throw passwordError
        }

        const { data: newAuthData } = await supabase.auth.getUser()
        me = newAuthData.user

        const { data: updatedProfile, error: updatedProfileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", me.id)
            .single()

        if (updatedProfileError) throw updatedProfileError

        initialProfile = updatedProfile

        fillProfile(updatedProfile, me)
        fillForm(updatedProfile, me)

        setStatus("Profil muvaffaqiyatli yangilandi")
        setTimeout(() => {
            closeModal()
        }, 700)
    } catch (error) {
        setStatus(error.message || "Xatolik yuz berdi", true)
    }
})

loadProfile()