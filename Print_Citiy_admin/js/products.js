import { supabase } from "../../Base/js/supabaseClient.js"
import { requireRoles } from "../../Base/js/auth.js"

const productsGrid = document.getElementById("productsGrid")
const productsTableWrap = document.getElementById("productsTableWrap")
const productsTableBody = document.getElementById("productsTableBody")
const productsEmpty = document.getElementById("productsEmpty")

const totalCount = document.getElementById("totalCount")
const statInfo = document.getElementById("statInfo")

const searchInput = document.getElementById("searchInput")
const categoryFilter = document.getElementById("categoryFilter")

const btnReloadProducts = document.getElementById("btnReloadProducts")
const btnNewProduct = document.getElementById("btnNewProduct")
const viewToggleBtn = document.getElementById("viewToggleBtn")
const viewToggleText = document.getElementById("viewToggleText")

const productFormModal = document.getElementById("productFormModal")

let me = null
let allProducts = []
let currentView = "card"

const STATE_KEY = "admin_products_page_state"

const openModal = (el) => {
  if (!el) return
  el.classList.remove("hidden")
  document.body.classList.add("modal-open")
}

const closeModal = (el) => {
  if (!el) return
  el.classList.add("hidden")

  if (productFormModal?.classList.contains("hidden")) {
    document.body.classList.remove("modal-open")
  }
}

const money = (n) => {
  return new Intl.NumberFormat("uz-UZ").format(Number(n || 0)) + " so'm"
}

const cutText = (s, max = 90) => {
  const text = String(s || "")
  return text.length > max ? text.slice(0, max) + "..." : text
}

const getStars = (rating) => {
  const n = Math.round(Number(rating || 0))
  return "★".repeat(n) + "☆".repeat(5 - n)
}

const setLastUpdated = () => {
  const time = new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

  if (statInfo) statInfo.textContent = "Oxirgi yangilanish: " + time
}

const firstImg = (p) => {
  const imgs = Array.isArray(p.images) ? p.images : []
  return imgs[0] || ""
}

const normalizeProduct = (row) => {
  const images = (row.product_images || [])
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((x) => x.path)
    .filter(Boolean)

  return {
    id: row.id,
    name: row.name || "",
    about: row.about || "",
    price: row.price || 0,
    category: row.category || "",
    sale: row.sale || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images,
    commentsCount: 0,
    avgRating: 0
  }
}

const savePageState = () => {
  const state = {
    search: searchInput?.value || "",
    category: categoryFilter?.value || "",
    scrollY: window.scrollY || 0,
    view: currentView
  }

  sessionStorage.setItem(STATE_KEY, JSON.stringify(state))
}

const restorePageState = () => {
  try {
    const raw = sessionStorage.getItem(STATE_KEY)
    if (!raw) return

    const state = JSON.parse(raw)

    if (searchInput) searchInput.value = state.search || ""
    if (categoryFilter) categoryFilter.value = state.category || ""
    if (state.view === "table" || state.view === "card") currentView = state.view

    applyView()

    requestAnimationFrame(() => {
      window.scrollTo({
        top: Number(state.scrollY || 0),
        left: 0,
        behavior: "auto"
      })
    })
  } catch {}
}

const openProductDetail = (id) => {
  savePageState()
  window.location.href = `./product-detail.html?id=${id}`
}

const getFilteredProducts = (rows) => {
  const q = String(searchInput?.value || "").trim().toLowerCase()
  const cat = categoryFilter?.value || ""

  return rows.filter((p) => {
    const bySearch =
      !q ||
      String(p.id || "").toLowerCase().includes(q) ||
      String(p.name || "").toLowerCase().includes(q)

    const byCat = !cat || p.category === cat

    return bySearch && byCat
  })
}

const renderGrid = (rows) => {
  if (!productsGrid) return

  productsGrid.innerHTML = rows.map((p) => {
    const img = firstImg(p)

    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-thumb-wrap">
          <div class="product-top-badges">
            <span class="id-chip mono">${String(p.id).slice(0, 8)}...</span>
            <span class="category-chip">${p.category || "-"}</span>
          </div>

          ${
            img
              ? `<img class="product-thumb" src="${img}" alt="${p.name}" loading="lazy">`
              : `<div class="product-thumb-empty"><i class="fa-regular fa-image"></i></div>`
          }
        </div>

        <div class="product-body">
          <div class="product-name">${p.name || "-"}</div>
          <div class="product-about">${cutText(p.about, 84) || "-"}</div>

          <div class="product-meta">
            <div class="price">${money(p.price)}</div>
            <div class="product-rating">
              <span class="stars">${getStars(p.avgRating)}</span>
              <span>${p.avgRating ? p.avgRating.toFixed(1) : "0.0"}</span>
            </div>
          </div>

          <div class="small">${p.commentsCount} ta fikr</div>

          <div class="product-actions">
            <button class="btn-secondary action-btn" data-act="view" data-id="${p.id}" type="button">
              <i class="fa-regular fa-eye"></i>
              <span>Ko‘rish</span>
            </button>

            <button class="btn-secondary action-btn" data-act="edit" data-id="${p.id}" type="button">
              <i class="fa-regular fa-pen-to-square"></i>
              <span>Tahrirlash</span>
            </button>

            <button class="btn-danger action-btn" data-act="delete" data-id="${p.id}" type="button">
              <i class="fa-regular fa-trash-can"></i>
              <span>O‘chirish</span>
            </button>
          </div>
        </div>
      </div>
    `
  }).join("")
}

const renderTable = (rows) => {
  if (!productsTableBody) return

  productsTableBody.innerHTML = rows.map((p) => {
    const img = firstImg(p)

    return `
      <tr>
        <td>
          ${
            img
              ? `<img class="table-thumb" src="${img}" alt="${p.name}" loading="lazy">`
              : `<div class="table-thumb-empty"><i class="fa-regular fa-image"></i></div>`
          }
        </td>

        <td class="mono">${String(p.id).slice(0, 8)}...</td>
        <td>
          <div class="table-name">${p.name || "-"}</div>
          <div class="table-about">${cutText(p.about, 60) || "-"}</div>
        </td>
        <td>${p.category || "-"}</td>
        <td class="table-price">${money(p.price)}</td>
        <td>
          <div class="table-rating">
            <span class="stars">${getStars(p.avgRating)}</span>
            <span>${p.avgRating ? p.avgRating.toFixed(1) : "0.0"}</span>
          </div>
        </td>
        <td>${p.commentsCount} ta</td>
        <td>
          <div class="table-actions">
            <button class="btn-secondary action-btn" data-act="view" data-id="${p.id}" type="button">
              <i class="fa-regular fa-eye"></i>
            </button>

            <button class="btn-secondary action-btn" data-act="edit" data-id="${p.id}" type="button">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>

            <button class="btn-danger action-btn" data-act="delete" data-id="${p.id}" type="button">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `
  }).join("")
}

const applyView = () => {
  const isCard = currentView === "card"

  productsGrid?.classList.toggle("hidden", !isCard)
  productsTableWrap?.classList.toggle("hidden", isCard)

  if (viewToggleText) {
    viewToggleText.textContent = isCard ? "" : ""
  }

  if (viewToggleBtn) {
    const icon = viewToggleBtn.querySelector("i")
    if (icon) {
      icon.className = isCard
        ? "fa-solid fa-id-card"
        : "fa-solid fa-table"
    }
  }
}

const renderProducts = (rows) => {
  const filtered = getFilteredProducts(rows)

  if (totalCount) totalCount.textContent = `${filtered.length} ta`

  const hasData = filtered.length > 0

  productsEmpty?.classList.toggle("hidden", hasData)

  if (hasData) {
    renderGrid(filtered)
    renderTable(filtered)
  } else {
    if (productsGrid) productsGrid.innerHTML = ""
    if (productsTableBody) productsTableBody.innerHTML = ""
  }

  applyView()
}

const loadProducts = async () => {
  if (statInfo) statInfo.textContent = "Yuklanmoqda..."

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      about,
      price,
      sale,
      category,
      created_at,
      updated_at,
      product_images(path, sort_order)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(error)
    if (statInfo) statInfo.textContent = "Xatolik!"
    return
  }

  allProducts = (data || []).map(normalizeProduct)
  renderProducts(allProducts)
  restorePageState()
  setLastUpdated()
}

const deleteProduct = async (id) => {
  if (!confirm("Mahsulotni o‘chirasizmi?")) return

  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)

    if (error) throw error

    await loadProducts()
  } catch (err) {
    console.error(err)
    alert("O‘chirishda xatolik")
  }
}

const handleActionClick = async (e) => {
  const btn = e.target.closest(".action-btn")
  if (!btn) return

  const id = btn.getAttribute("data-id")
  const act = btn.getAttribute("data-act")

  const p = allProducts.find((x) => String(x.id) === String(id))
  if (!p) return

  if (act === "view") openProductDetail(p.id)
  if (act === "edit") window.ProductForm?.openEdit?.(p)
  if (act === "delete") deleteProduct(p.id)
}

window.ProductPage = {
  openModal,
  closeModal,
  loadProducts,
  getAllProducts: () => allProducts,
  getMe: () => me,
  savePageState
}

productsGrid?.addEventListener("click", handleActionClick)
productsTableBody?.addEventListener("click", handleActionClick)

btnNewProduct?.addEventListener("click", () => {
  window.ProductForm?.openCreate?.()
})

btnReloadProducts?.addEventListener("click", loadProducts)
statInfo?.addEventListener("click", loadProducts)

viewToggleBtn?.addEventListener("click", () => {
  currentView = currentView === "card" ? "table" : "card"
  savePageState()
  renderProducts(allProducts)
})

searchInput?.addEventListener("input", () => {
  savePageState()
  renderProducts(allProducts)
})

categoryFilter?.addEventListener("change", () => {
  savePageState()
  renderProducts(allProducts)
})

window.addEventListener("scroll", () => {
  savePageState()
})

const init = async () => {
  try {
    me = await requireRoles(["admin", "manager"])
  } catch (err) {
    console.error(err)
    return
  }

  restorePageState()
  await loadProducts()
}

init()