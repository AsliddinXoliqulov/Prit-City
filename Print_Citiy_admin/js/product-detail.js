import { supabase } from "../../Base/js/supabaseClient.js"
import { requireRoles } from "../../Base/js/auth.js"

const detailState = document.getElementById("detailState")
const detailContent = document.getElementById("detailContent")

const backBtn = document.getElementById("backBtn")
const editBtn = document.getElementById("editBtn")
const deleteBtn = document.getElementById("deleteBtn")

const detailGallery = document.getElementById("detailGallery")
const detailId = document.getElementById("detailId")
const detailName = document.getElementById("detailName")
const detailCategory = document.getElementById("detailCategory")
const detailPrice = document.getElementById("detailPrice")
const detailStars = document.getElementById("detailStars")
const detailRatingText = document.getElementById("detailRatingText")
const detailCommentsCount = document.getElementById("detailCommentsCount")
const detailCreatedAt = document.getElementById("detailCreatedAt")
const detailAbout = document.getElementById("detailAbout")

const commentsList = document.getElementById("commentsList")
const summaryRatingValue = document.getElementById("summaryRatingValue")
const summaryStars = document.getElementById("summaryStars")
const summaryCount = document.getElementById("summaryCount")

const productFormModal = document.getElementById("productFormModal")

let me = null
let product = null
let currentComments = []

const money = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n || 0)) + " so'm"

const fmtDate = (iso) => {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("uz-UZ")
  } catch {
    return iso
  }
}

const getStars = (rating) => {
  const n = Math.round(Number(rating || 0))
  return "★".repeat(n) + "☆".repeat(5 - n)
}

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

window.ProductPage = {
  openModal,
  closeModal,
  getMe: () => me,
  setSelectedProduct: (p) => {
    product = p
  },
  getSelectedProduct: () => product,
  loadProducts: async () => {
    await loadProduct()
  }
}

const getProductIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get("id")
}

const goBack = () => {
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.location.href = "./products.html"
}

const renderComments = (comments) => {
  const avg = comments.length
    ? comments.reduce((sum, c) => sum + Number(c.rating || 0), 0) / comments.length
    : 0

  summaryRatingValue.textContent = avg ? avg.toFixed(1) : "0.0"
  summaryStars.textContent = getStars(avg)
  summaryCount.textContent = `${comments.length} ta fikr`

  detailStars.textContent = getStars(avg)
  detailRatingText.textContent = `${avg ? avg.toFixed(1) : "0.0"} / 5`
  detailCommentsCount.textContent = `${comments.length} ta fikr`

  commentsList.innerHTML = comments.length
    ? comments.map((c) => {
        const canDelete = me?.profile?.role === "admin"

        return `
          <div class="comment-card">
            <div class="comment-card-top">
              <div>
                <div class="comment-author">${c.profiles?.full_name || "User"}</div>
                <div class="comment-email">${c.profiles?.email || "-"}</div>
              </div>
              <div class="comment-stars">${getStars(c.rating)} (${c.rating})</div>
            </div>

            <div class="comment-body">${c.comment || "-"}</div>

            <div class="comment-meta">
              <div class="small">${fmtDate(c.created_at)}</div>
              ${
                canDelete
                  ? `<button class="btn-danger comment-delete" data-delete-comment="${c.id}" type="button"><i class="fa-regular fa-trash-can"></i> O‘chirish</button>`
                  : ``
              }
            </div>
          </div>
        `
      }).join("")
    : `<div class="empty-row">Hozircha fikr yo‘q.</div>`
}

const fetchCommentsForProduct = async (productIdValue) => {
  const { data, error } = await supabase
    .from("product_comments")
    .select("id, rating, comment, created_at, user_id, profiles(full_name,email)")
    .eq("product_id", productIdValue)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data || []
}

const renderProduct = (row) => {
  const images = (row.product_images || [])
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((x) => x.path)
    .filter(Boolean)

  product = {
    id: row.id,
    name: row.name,
    about: row.about,
    price: row.price,
    category: row.category,
    sale: row.sale,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images
  }

  detailId.textContent = row.id
  detailName.textContent = row.name || "-"
  detailCategory.textContent = row.category || "-"
  detailPrice.textContent = money(row.price)
  detailCreatedAt.textContent = fmtDate(row.created_at)
  detailAbout.textContent = row.about || "-"
  detailStars.textContent = getStars(0)
  detailRatingText.textContent = "0.0 / 5"
  detailCommentsCount.textContent = "0 ta fikr"

  detailGallery.innerHTML = images.length
    ? images.map((src) => `<div class="gallery-item"><img src="${src}" alt="" loading="lazy"></div>`).join("")
    : `<div class="empty-row">Rasm yo‘q</div>`

  detailState.classList.add("hidden")
  detailContent.classList.remove("hidden")
}

const loadProduct = async () => {
  const productId = getProductIdFromUrl()

  if (!productId) {
    detailState.textContent = "Mahsulot ID topilmadi."
    return
  }

  detailState.textContent = "Yuklanmoqda..."

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
    .eq("id", productId)
    .single()

  if (error || !data) {
    console.error(error)
    detailState.textContent = "Mahsulot topilmadi."
    return
  }

  renderProduct(data)

  currentComments = await fetchCommentsForProduct(productId)
  renderComments(currentComments)
}

const deleteProduct = async () => {
  if (!product?.id) return
  if (!confirm("Mahsulotni o‘chirasizmi?")) return

  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)

    if (error) throw error

    goBack()
  } catch (err) {
    console.error(err)
    alert("O‘chirishda xatolik")
  }
}

const deleteComment = async (commentId) => {
  if (!confirm("Fikrni o‘chirasizmi?")) return

  const { error } = await supabase
    .from("product_comments")
    .delete()
    .eq("id", commentId)

  if (error) {
    console.error(error)
    alert("Fikrni o‘chirishda xatolik")
    return
  }

  currentComments = await fetchCommentsForProduct(product.id)
  renderComments(currentComments)
}

backBtn?.addEventListener("click", goBack)
editBtn?.addEventListener("click", () => {
  if (!product) return
  window.ProductForm?.openEdit?.(product)
})
deleteBtn?.addEventListener("click", deleteProduct)

commentsList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-delete-comment]")
  if (!btn) return

  const id = btn.getAttribute("data-delete-comment")
  if (!id) return

  await deleteComment(id)
})

const init = async () => {
  try {
    me = await requireRoles(["admin", "manager"])
  } catch (err) {
    console.error(err)
    return
  }

  await loadProduct()
}

init()