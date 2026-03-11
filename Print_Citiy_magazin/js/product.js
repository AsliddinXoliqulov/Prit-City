import { supabase } from "../../Base/js/supabaseClient.js"
import { showToast } from "../../Base/js/toast.js"

const productsGrid = document.getElementById("productsGrid")
const productsCount = document.getElementById("productsCount")
const productsInfo = document.getElementById("productsInfo")
const searchInput = document.getElementById("searchInput")
const categoryFilter = document.getElementById("categoryFilter")
const likedCountBadge = document.getElementById("likedCountBadge")
const cartCountBadge = document.getElementById("cartCountBadge")

let allProducts = []
let currentUser = null
let likedIds = []

const money = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n || 0)) + " so'm"

const cutText = (s, max = 80) => {
  const t = String(s || "")
  return t.length > max ? t.slice(0, max) + "..." : t
}

const getStars = (rating) => {
  const n = Math.round(Number(rating || 0))
  return "★".repeat(n) + "☆".repeat(5 - n)
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

const updateLikedBadge = () => {
  likedCountBadge.textContent = likedIds.length
}

const normalizeProducts = (rows) => {
  return rows.map((row) => {
    const images = (row.product_images || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((x) => x.path)
      .filter(Boolean)

    const comments = Array.isArray(row.product_comments) ? row.product_comments : []
    const commentsCount = comments.length
    const avgRating = commentsCount
      ? comments.reduce((sum, c) => sum + Number(c.rating || 0), 0) / commentsCount
      : 0

    return {
      id: row.id,
      name: row.name,
      about: row.about,
      price: row.price,
      category: row.category,
      images,
      commentsCount,
      avgRating
    }
  })
}

const renderProducts = () => {
  const q = String(searchInput.value || "").trim().toLowerCase()
  const category = categoryFilter.value

  const filtered = allProducts.filter((p) => {
    const bySearch = !q || String(p.name || "").toLowerCase().includes(q)
    const byCategory = !category || p.category === category
    return bySearch && byCategory
  })

  productsCount.textContent = `${filtered.length} ta`

  productsGrid.innerHTML = filtered.length
    ? filtered.map((p) => {
        const liked = likedIds.includes(p.id)
        const img = p.images[0] || ""

        return `
          <div class="product-card">
            <div class="product-thumb-wrap">
              ${
                img
                  ? `<img class="product-thumb" src="${img}" alt="${p.name || ""}" loading="lazy">`
                  : `<div class="product-thumb-empty"><i class="fa-regular fa-image"></i></div>`
              }
            </div>

            <div class="product-card-body">
              <div class="product-name">${p.name || "-"}</div>
              <div class="product-about">${cutText(p.about, 84) || "-"}</div>

              <div class="product-meta">
                <div class="price">${money(p.price)}</div>
                <div class="product-rating">
                  <span class="product-rating-stars">${getStars(p.avgRating)}</span>
                  <span>${p.avgRating ? p.avgRating.toFixed(1) : "0.0"}</span>
                </div>
              </div>

              <div class="small">${p.commentsCount} ta fikr</div>

              <div class="product-actions">
                <a class="btn-secondary" href="./product-detail.html?id=${p.id}">
                <i class="fa-regular fa-eye"></i> Ko‘rish
                </a>
                <button class="btn-secondary like-btn ${liked ? "active" : ""}" data-id="${p.id}" type="button">
                  <i class="${liked ? "fa-solid" : "fa-regular"} fa-heart"></i>
                  Liked
                </button>

                <button class="btn-primary cart-btn" data-id="${p.id}" type="button">
                  <i class="fa-solid fa-cart-plus"></i>
                  Savat
                </button>
              </div>
            </div>
          </div>
        `
      }).join("")
    : `<div class="empty-row">Mahsulot topilmadi.</div>`
}

const loadProducts = async () => {
  productsInfo.textContent = "Yuklanmoqda..."

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      about,
      price,
      category,
      product_images(path, sort_order),
      product_comments(rating)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    productsInfo.textContent = "Xatolik!"
    return
  }

  allProducts = normalizeProducts(data || [])
  renderProducts()
  productsInfo.textContent = ""
}

const loadLikedIds = async () => {
  currentUser = await getSessionUser()

  if (!currentUser) {
    likedIds = []
    updateLikedBadge()
    return
  }

  const { data } = await supabase
    .from("liked_products")
    .select("product_id")
    .eq("user_id", currentUser.id)

  likedIds = (data || []).map((x) => x.product_id)
  updateLikedBadge()
}

const toggleLike = async (productId) => {
  if (!currentUser) {
    productsInfo.textContent = ""
    showToast("Liked qilish uchun login qiling.", "info")
    return
  }

  const alreadyLiked = likedIds.includes(productId)

  if (!alreadyLiked) {
    const { error } = await supabase.from("liked_products").insert({
      user_id: currentUser.id,
      product_id: productId
    })

    if (error) {
      productsInfo.textContent = ""
      showToast("Liked qilishda xatolik!", "error")
      return
    }

    likedIds.push(productId)
  } else {
    const { error } = await supabase
      .from("liked_products")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("product_id", productId)

    if (error) {
      productsInfo.textContent = ""
      showToast("Liked dan o‘chirishda xatolik!", "error")
      return
    }

    likedIds = likedIds.filter((id) => id !== productId)
  }

  updateLikedBadge()
  renderProducts()
}

const addToCart = (productId) => {
  const p = allProducts.find((x) => x.id === productId)
  if (!p) return

  const cart = JSON.parse(localStorage.getItem("pc_cart") || "[]")
  const found = cart.find((x) => x.product_id === p.id)

  if (found) {
    found.qty += 1
  } else {
    cart.push({
      product_id: p.id,
      product_name: p.name,
      product_price: Number(p.price || 0),
      product_image: p.images[0] || "",
      qty: 1
    })
  }

  localStorage.setItem("pc_cart", JSON.stringify(cart))
  updateCartBadge()
  productsInfo.textContent = ""
  showToast("Savatga qo‘shildi.", "success")
}

productsGrid?.addEventListener("click", (e) => {
  const likeBtn = e.target.closest(".like-btn")
  const cartBtn = e.target.closest(".cart-btn")

  if (likeBtn) {
    toggleLike(likeBtn.dataset.id)
  }

  if (cartBtn) {
    addToCart(cartBtn.dataset.id)
  }
})

searchInput?.addEventListener("input", renderProducts)
categoryFilter?.addEventListener("change", renderProducts)

const init = async () => {
  updateCartBadge()
  await loadLikedIds()
  await loadProducts()
}

init()