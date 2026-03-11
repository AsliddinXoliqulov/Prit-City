import { supabase } from "../../Base/js/supabaseClient.js"
import { showToast } from "../../Base/js/toast.js"

const likedGrid = document.getElementById("likedGrid")
const likedCount = document.getElementById("likedCount")
const likedInfo = document.getElementById("likedInfo")
const searchInput = document.getElementById("searchInput")

let currentUser = null
let likedProducts = []

const money = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n || 0)) + " so'm"

const cutText = (s, max = 80) => {
  const t = String(s || "")
  return t.length > max ? t.slice(0, max) + "..." : t
}

const getSessionUser = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.user || null
}

const normalizeRows = (rows) => {
  return rows.map((row) => {
    const product = row.products || {}
    const images = (product.product_images || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((x) => x.path)
      .filter(Boolean)

    return {
      like_id: row.id,
      product_id: product.id,
      name: product.name,
      about: product.about,
      price: product.price,
      category: product.category,
      image: images[0] || ""
    }
  }).filter((x) => x.product_id)
}

const renderLiked = () => {
  const q = String(searchInput.value || "").trim().toLowerCase()

  const filtered = likedProducts.filter((p) => {
    return !q || String(p.name || "").toLowerCase().includes(q)
  })

  likedCount.textContent = `${filtered.length} ta`

  likedGrid.innerHTML = filtered.length
    ? filtered.map((p) => `
        <div class="liked-card">
          ${
            p.image
              ? `<img class="liked-thumb" src="${p.image}" alt="${p.name || ""}" loading="lazy">`
              : `<div class="liked-thumb-empty"><i class="fa-regular fa-image"></i></div>`
          }

          <div class="liked-body">
            <div class="liked-name">${p.name || "-"}</div>
            <div class="liked-about">${cutText(p.about, 84) || "-"}</div>

            <div class="liked-meta">
              <div class="price">${money(p.price)}</div>
              <div class="small">${p.category || "-"}</div>
            </div>

            <div class="liked-actions">
              <a class="btn-secondary" href="./product.html?id=${p.product_id}">
                <i class="fa-regular fa-eye"></i> Ko‘rish
              </a>
              <button class="btn-danger unlike-btn" data-id="${p.product_id}" type="button">
                <i class="fa-solid fa-heart-crack"></i> O‘chirish
              </button>
            </div>
          </div>
        </div>
      `).join("")
    : `<div class="empty-row">Liked mahsulotlar yo‘q.</div>`
}

const loadLiked = async () => {
  currentUser = await getSessionUser()

  if (!currentUser) {
    likedInfo.textContent = ""
    likedGrid.innerHTML = `<div class="empty-row">Login bo‘lmagansiz.</div>`
    showToast("Liked sahifani ko‘rish uchun login qiling.", "info")
    return
  }

  likedInfo.textContent = "Yuklanmoqda..."

  const { data, error } = await supabase
    .from("liked_products")
    .select(`
      id,
      product_id,
      products(
        id,
        name,
        about,
        price,
        category,
        product_images(path, sort_order)
      )
    `)
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })

  if (error) {
    likedInfo.textContent = ""
    showToast("Liked mahsulotlarni yuklashda xatolik.", "error")
    return
  }

  likedProducts = normalizeRows(data || [])
  renderLiked()
  likedInfo.textContent = ""
}

likedGrid?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".unlike-btn")
  if (!btn || !currentUser) return

  const productId = btn.dataset.id

  const { error } = await supabase
    .from("liked_products")
    .delete()
    .eq("user_id", currentUser.id)
    .eq("product_id", productId)

  if (error) {
    likedInfo.textContent = ""
    showToast("Liked’dan o‘chirishda xatolik!", "error")
    return
  }

  await loadLiked()
  showToast("Liked’dan o‘chirildi.", "success")
})

searchInput?.addEventListener("input", renderLiked)

loadLiked()