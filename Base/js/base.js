import { supabase } from "./supabaseClient.js"

const root = document.documentElement
const themeToggle = document.getElementById("themeToggle")

const profileLink = document.getElementById("profileLink")
const cartCountBadge = document.getElementById("cartCountBadge")
const likedCountBadge = document.getElementById("likedCountBadge")



/* ---------------- THEME ---------------- */

const setThemeIcon = () => {
  if (!themeToggle) return

  const dark = root.dataset.theme === "dark"

  themeToggle.innerHTML = dark
    ? `<i class="fa-solid fa-sun"></i>`
    : `<i class="fa-solid fa-moon"></i>`
}

const initTheme = () => {
  const savedTheme = localStorage.getItem("theme-mode")

  if (savedTheme) {
    root.dataset.theme = savedTheme
  }

  setThemeIcon()

  themeToggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark"

    root.dataset.theme = next
    localStorage.setItem("theme-mode", next)

    setThemeIcon()
  })
}



/* ---------------- AUTH ---------------- */

const getUser = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.user || null
}

const updateProfileLink = async () => {
  if (!profileLink) return

  const user = await getUser()

  if (!user) {
    profileLink.href = "/index.html"
    profileLink.innerHTML = `
      <i class="fa-solid fa-right-to-bracket"></i>
      Login
    `
  } else {
    profileLink.href = "/Print Citiy magazin/html/profile.html"
    profileLink.innerHTML = `
      <i class="fa-regular fa-user"></i>
      Profil
    `
  }
}



/* ---------------- CART ---------------- */

const updateCartBadge = () => {
  if (!cartCountBadge) return

  const cart = JSON.parse(localStorage.getItem("pc_cart") || "[]")

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.qty || 0)
  }, 0)

  cartCountBadge.textContent = total
}



/* ---------------- LIKED ---------------- */

const updateLikedBadge = async () => {
  if (!likedCountBadge) return

  const user = await getUser()

  if (!user) {
    likedCountBadge.textContent = "0"
    return
  }

  const { data } = await supabase
    .from("liked_products")
    .select("id")
    .eq("user_id", user.id)

  likedCountBadge.textContent = (data || []).length
}




/* ---------------- INIT ---------------- */

const init = async () => {
  initTheme()

  await updateProfileLink()

  updateCartBadge()

  await updateLikedBadge()
}

init()

/* ---------------- OPEN MOBIL BAR ---------------- */


const menuToggle = document.getElementById("menuToggle")
const headerActions = document.getElementById("headerActions")

menuToggle.addEventListener("click",()=>{
    headerActions.classList.toggle("active")
})
