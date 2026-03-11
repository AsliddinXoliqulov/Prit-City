import { supabase } from "../../Base/js/supabaseClient.js"
import { showToast } from "../../Base/js/toast.js"

const productsGrid = document.getElementById("productsGrid")
const productsCount = document.getElementById("productsCount")
const productsInfo = document.getElementById("productsInfo")
const searchInput = document.getElementById("searchInput")
const categoryFilter = document.getElementById("categoryFilter")
const likedCountBadge = document.getElementById("likedCountBadge")
const cartCountBadge = document.getElementById("cartCountBadge")
const loadMoreBtn = document.getElementById("loadMoreBtn")

let visibleCount = 10
const step = 10

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

  if (cartCountBadge) {
    cartCountBadge.textContent = total
  }
}

const updateLikedBadge = () => {
  if (likedCountBadge) {
    likedCountBadge.textContent = likedIds.length
  }
}

const normalizeProducts = (rows) => {
  return rows.map((row) => {
    const images = Array.isArray(row.product_images)
      ? row.product_images
          .slice()
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((x) => x.path)
          .filter(Boolean)
      : []

    const comments = Array.isArray(row.product_comments) ? row.product_comments : []
    const commentsCount = comments.length
    const avgRating = commentsCount
      ? comments.reduce((sum, c) => sum + Number(c.rating || 0), 0) / commentsCount
      : 0

    return {
      id: row.id,
      product_code: row.product_code || "-",
      name: row.name || "-",
      about: row.about || "",
      price: Number(row.price || 0),
      category: row.category || "",
      images,
      commentsCount,
      avgRating
    }
  })
}

const getFilteredProducts = () => {
  const search = String(searchInput?.value || "").trim().toLowerCase()
  const category = String(categoryFilter?.value || "").trim().toLowerCase()

  return allProducts.filter((item) => {
    const name = String(item.name || "").toLowerCase()
    const code = String(item.product_code || "").toLowerCase()
    const itemCategory = String(item.category || "").toLowerCase()

    const matchSearch = !search || name.includes(search) || code.includes(search)
    const matchCategory = !category || itemCategory === category

    return matchSearch && matchCategory
  })
}

const renderProducts = () => {
  const filtered = getFilteredProducts()
  const visibleProducts = filtered.slice(0, visibleCount)

  if (productsCount) {
    productsCount.textContent = `${filtered.length} ta`
  }

  if (productsInfo) {
    productsInfo.textContent = filtered.length
      ? `${visibleProducts.length} tasi ko‘rsatildi`
      : "Mahsulot topilmadi"
  }

  if (!productsGrid) return

  productsGrid.innerHTML = visibleProducts.length
    ? visibleProducts.map((p) => {
        const liked = likedIds.includes(p.id)
        const img = p.images[0] || ""

        return `
          <div class="product-card">
            <div class="product-thumb-wrap">
              ${
                img
                  ? `<img class="product-thumb" src="${img}" alt="${p.name}" loading="lazy">`
                  : `<div class="product-thumb-empty"><i class="fa-regular fa-image"></i></div>`
              }
            </div>

            <div class="product-card-body">
              <div class="product-name">${p.name}</div>
              <div class="small">Kod: ${p.product_code || "-"}</div>
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
                  <i class="fa-regular fa-eye"></i>
                  Ko‘rish
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

  if (loadMoreBtn?.parentElement) {
    if (filtered.length > visibleCount) {
      loadMoreBtn.parentElement.classList.remove("hidden")
    } else {
      loadMoreBtn.parentElement.classList.add("hidden")
    }
  }
}

const loadProducts = async () => {
  if (productsInfo) {
    productsInfo.textContent = "Yuklanmoqda..."
  }

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      product_code,
      name,
      about,
      price,
      category,
      product_images(path, sort_order),
      product_comments(rating)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(error)
    if (productsInfo) {
      productsInfo.textContent = "Xatolik yuz berdi."
    }
    showToast("Mahsulotlarni yuklashda xatolik!", "error")
    return
  }

  allProducts = normalizeProducts(data || [])
  visibleCount = 10
  renderProducts()
}

const loadLikedIds = async () => {
  currentUser = await getSessionUser()

  if (!currentUser) {
    likedIds = []
    updateLikedBadge()
    return
  }

  const { data, error } = await supabase
    .from("liked_products")
    .select("product_id")
    .eq("user_id", currentUser.id)

  if (error) {
    console.error(error)
    likedIds = []
    updateLikedBadge()
    return
  }

  likedIds = (data || []).map((x) => x.product_id)
  updateLikedBadge()
}

const toggleLike = async (productId) => {
  const id = String(productId)

  if (!currentUser) {
    showToast("Liked qilish uchun login qiling.", "info")
    return
  }

  const numericId = isNaN(Number(id)) ? id : Number(id)
  const alreadyLiked = likedIds.includes(numericId)

  if (!alreadyLiked) {
    const { error } = await supabase
      .from("liked_products")
      .insert({
        user_id: currentUser.id,
        product_id: numericId
      })

    if (error) {
      console.error(error)
      showToast("Liked qilishda xatolik!", "error")
      return
    }

    likedIds.push(numericId)
    showToast("Liked qilindi.", "success")
  } else {
    const { error } = await supabase
      .from("liked_products")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("product_id", numericId)

    if (error) {
      console.error(error)
      showToast("Liked dan o‘chirishda xatolik!", "error")
      return
    }

    likedIds = likedIds.filter((itemId) => itemId !== numericId)
    showToast("Liked dan olib tashlandi.", "success")
  }

  updateLikedBadge()
  renderProducts()
}

const addToCart = (productId) => {
  const id = isNaN(Number(productId)) ? productId : Number(productId)
  const p = allProducts.find((x) => x.id === id)

  if (!p) return

  const cart = JSON.parse(localStorage.getItem("pc_cart") || "[]")
  const found = cart.find((x) => String(x.product_id) === String(p.id))

  if (found) {
    found.qty += 1
  } else {
    cart.push({
      product_id: p.id,
      product_code: p.product_code || "-",
      product_name: p.name,
      product_price: Number(p.price || 0),
      product_image: p.images[0] || "",
      qty: 1
    })
  }

  localStorage.setItem("pc_cart", JSON.stringify(cart))
  updateCartBadge()
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

loadMoreBtn?.addEventListener("click", () => {
  visibleCount += step
  renderProducts()
})

searchInput?.addEventListener("input", () => {
  visibleCount = 10
  renderProducts()
})

categoryFilter?.addEventListener("change", () => {
  visibleCount = 10
  renderProducts()
})

const init = async () => {
  updateCartBadge()
  await loadLikedIds()
  await loadProducts()
}

init()