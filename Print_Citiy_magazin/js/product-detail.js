import { supabase } from "../../Base/js/supabaseClient.js"

const BUCKET_NAME = "products"
const FINISHED_ORDER_STATUS = 3

const productState = document.getElementById("productState")
const productContent = document.getElementById("productContent")
const detailInfo = document.getElementById("detailInfo")

const mainImage = document.getElementById("mainImage")
const mainImageEmpty = document.getElementById("mainImageEmpty")
const thumbsRow = document.getElementById("thumbsRow")

const productCategory = document.getElementById("productCategory")
const productCode = document.getElementById("productCode")
const productName = document.getElementById("productName")
const avgStars = document.getElementById("avgStars")
const avgRating = document.getElementById("avgRating")
const commentsCount = document.getElementById("commentsCount")
const commentsCountBadge = document.getElementById("commentsCountBadge")
const productPrice = document.getElementById("productPrice")
const productAbout = document.getElementById("productAbout")

const likeBtn = document.getElementById("likeBtn")
const addToCartBtn = document.getElementById("addToCartBtn")

const likedCountBadge = document.getElementById("likedCountBadge")
const cartCountBadge = document.getElementById("cartCountBadge")

const commentsInfo = document.getElementById("commentsInfo")
const commentsList = document.getElementById("commentsList")
const commentForm = document.getElementById("commentForm")
const reviewFormTitle = document.getElementById("reviewFormTitle")
const reviewFormNote = document.getElementById("reviewFormNote")
const ratingInput = document.getElementById("ratingInput")
const commentInput = document.getElementById("commentInput")
const commentStatus = document.getElementById("commentStatus")
const resetCommentBtn = document.getElementById("resetCommentBtn")
const starPicker = document.getElementById("starPicker")

const productId = new URLSearchParams(location.search).get("id")

let currentUser = null
let product = null
let productImages = []
let comments = []
let myComment = null
let liked = false
let selectedImageIndex = 0
let canReview = false

const money = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n || 0)) + " so'm"

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

const getStars = (rating) => {
  const n = Math.round(Number(rating || 0))
  return "★".repeat(n) + "☆".repeat(5 - n)
}

const setRating = (value) => {
  ratingInput.value = String(value)

  const buttons = Array.from(starPicker?.querySelectorAll(".star-btn") || [])
  buttons.forEach((btn) => {
    const active = Number(btn.dataset.value) <= Number(value)
    btn.classList.toggle("active", active)
  })
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
    console.log("liked count error:", error)
    likedCountBadge.textContent = "0"
    return
  }

  likedCountBadge.textContent = String((data || []).length)
}

const resolveImageUrl = (path) => {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}

const showState = (message) => {
  if (productState) {
    productState.textContent = message
    productState.classList.remove("hidden")
  }

  productContent?.classList.add("hidden")
}

const showContent = () => {
  productState?.classList.add("hidden")
  productContent?.classList.remove("hidden")
}

const renderGallery = () => {
  if (!mainImage || !mainImageEmpty || !thumbsRow) return

  if (!productImages.length) {
    mainImage.src = ""
    mainImage.classList.add("hidden")
    mainImageEmpty.classList.remove("hidden")
    thumbsRow.innerHTML = ""
    return
  }

  const current = productImages[selectedImageIndex] || productImages[0]
  const currentSrc = resolveImageUrl(current.path)

  mainImage.src = currentSrc
  mainImage.classList.remove("hidden")
  mainImageEmpty.classList.add("hidden")

  thumbsRow.innerHTML = productImages.map((img, index) => {
    const src = resolveImageUrl(img.path)
    const active = index === selectedImageIndex ? "active" : ""

    return `
      <button class="detail-thumb ${active}" type="button" data-index="${index}">
        <img src="${src}" alt="Rasm ${index + 1}">
      </button>
    `
  }).join("")
}

const updateReviewAccessUI = () => {
  if (!commentForm || !reviewFormNote || !commentInput || !ratingInput) return

  if (!currentUser) {
    commentForm.classList.add("hidden")
    reviewFormTitle.textContent = "Fikr qoldirish"
    reviewFormNote.textContent = "Fikr yozish uchun login qiling."
    return
  }

  if (myComment) {
    commentForm.classList.remove("hidden")
    reviewFormTitle.textContent = "Fikringizni tahrirlash"
    reviewFormNote.textContent = "Oldingi fikringizni yangilashingiz mumkin."
    return
  }

  if (!canReview) {
    commentForm.classList.add("hidden")
    reviewFormTitle.textContent = "Fikr qoldirish"
    reviewFormNote.textContent = "Faqat sotib olib, holati tugallangan (status = 3) mahsulotga fikr yozish mumkin."
    return
  }

  commentForm.classList.remove("hidden")
  reviewFormTitle.textContent = "Fikr qoldirish"
  reviewFormNote.textContent = "1 dan 5 gacha baho bering."
}

const renderProduct = () => {
  if (!product) return

  const count = comments.length
  const avg = count
    ? comments.reduce((sum, item) => sum + Number(item.rating || 0), 0) / count
    : 0

  if (productCategory) productCategory.textContent = product.category || "Kategoriya yo‘q"
  if (productCode) productCode.textContent = product.product_code || "-"
  if (productName) productName.textContent = product.name || "-"
  if (avgStars) avgStars.textContent = getStars(avg)
  if (avgRating) avgRating.textContent = avg ? avg.toFixed(1) : "0.0"
  if (commentsCount) commentsCount.textContent = `${count} ta fikr`
  if (commentsCountBadge) commentsCountBadge.textContent = `${count} ta`
  if (productPrice) productPrice.textContent = money(product.price)
  if (productAbout) productAbout.textContent = product.about || "Izoh kiritilmagan"

  if (likeBtn) {
    likeBtn.innerHTML = liked
      ? `<i class="fa-solid fa-heart"></i><span>Liked</span>`
      : `<i class="fa-regular fa-heart"></i><span>Liked</span>`

    likeBtn.classList.toggle("active", liked)
  }

  renderGallery()
}

const renderComments = () => {
  if (!commentsList) return

  if (commentsCountBadge) {
    commentsCountBadge.textContent = `${comments.length} ta`
  }

  if (!comments.length) {
    commentsList.innerHTML = `<div class="empty-comments">Hozircha fikrlar yo‘q.</div>`
    return
  }

  commentsList.innerHTML = comments.map((item) => {
    const me = currentUser && item.user_id === currentUser.id
    const name = item.profiles?.full_name || item.profiles?.email || "Foydalanuvchi"
    const avatarUrl = item.profiles?.avatar_url || ""
    const avatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" alt="${name}">`
      : initials(name)

    return `
      <div class="comment-card">
        <div class="comment-head">
          <div class="comment-user">
            <div class="comment-avatar">${avatarHtml}</div>

            <div class="comment-user-meta">
              <div class="comment-user-name">${name}</div>
              <div class="comment-date">${fmtDate(item.updated_at || item.created_at)}</div>
            </div>
          </div>

          <div class="comment-stars">${getStars(item.rating)}</div>
        </div>

        <p class="comment-text">${item.comment || ""}</p>

        ${
          me
            ? `
              <div class="comment-actions">
                <button class="btn-secondary edit-comment-btn" type="button" data-id="${item.id}">
                  <i class="fa-solid fa-pen"></i>
                  Tahrirlash
                </button>

                <button  style="display: none;" class="btn-secondary delete-comment-btn" type="button" data-id="${item.id}">
                  <i class="fa-solid fa-trash"></i>
                  O‘chirish
                </button>
              </div>
            `
            : ""
        }
      </div>
    `
  }).join("")
}

const loadProduct = async () => {
  if (!productId) {
    showState("Mahsulot id topilmadi.")
    return
  }

  showState("Yuklanmoqda...")

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      product_code,
      name,
      about,
      price,
      category,
      sale,
      created_at,
      updated_at,
      product_images (
        id,
        path,
        sort_order,
        created_at
      )
    `)
    .eq("id", productId)
    .maybeSingle()

  if (error) {
    console.log("loadProduct error:", error)
    showState("Mahsulotni yuklashda xatolik yuz berdi.")
    return
  }

  if (!data) {
    showState("Mahsulot topilmadi.")
    return
  }

  product = data
  productImages = (data.product_images || [])
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  selectedImageIndex = 0

  renderProduct()
  showContent()

  const time = new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

  if (detailInfo) {
    detailInfo.textContent = "Oxirgi yangilanish · " + time
  }
}

const loadComments = async () => {
  if (commentsInfo) {
    commentsInfo.textContent = "Yuklanmoqda..."
  }

  const { data, error } = await supabase
    .from("product_comments")
    .select(`
      id,
      product_id,
      user_id,
      rating,
      comment,
      comment_code,
      created_at,
      updated_at,
      profiles (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq("product_id", productId)
    .order("updated_at", { ascending: false })

  if (error) {
    console.log("loadComments error:", error)

    if (commentsInfo) {
      commentsInfo.textContent = "Fikrlarni yuklashda xatolik."
    }

    if (commentsList) {
      commentsList.innerHTML = `<div class="empty-comments">Fikrlarni yuklab bo‘lmadi.</div>`
    }

    return
  }

  comments = data || []
  myComment = currentUser
    ? comments.find((item) => item.user_id === currentUser.id) || null
    : null

  if (myComment) {
    commentInput.value = myComment.comment || ""
    setRating(myComment.rating || 0)
  } else {
    commentInput.value = ""
    setRating(0)
  }

  updateReviewAccessUI()
  renderProduct()
  renderComments()

  const time = new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

  if (commentsInfo) {
    commentsInfo.textContent = "Oxirgi yangilanish · " + time
  }
}

const loadLikedState = async () => {
  currentUser = await getSessionUser()

  if (!currentUser) {
    liked = false
    renderProduct()
    return
  }

  const { data, error } = await supabase
    .from("liked_products")
    .select("id")
    .eq("user_id", currentUser.id)
    .eq("product_id", productId)
    .maybeSingle()

  if (error) {
    console.log("loadLikedState error:", error)
    liked = false
    renderProduct()
    return
  }

  liked = !!data
  renderProduct()
}

const checkCanReview = async () => {
  canReview = false

  if (!currentUser || !productId) {
    updateReviewAccessUI()
    return
  }

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id,
      product_id,
      order_id,
      orders!inner (
        id,
        user_id,
        status
      )
    `)
    .eq("product_id", productId)
    .eq("orders.user_id", currentUser.id)
    .eq("orders.status", FINISHED_ORDER_STATUS)
    .limit(1)

  if (error) {
    console.log("checkCanReview error:", error)
    canReview = false
    updateReviewAccessUI()
    return
  }

  canReview = !!(data && data.length)
  updateReviewAccessUI()
}

const toggleLike = async () => {
  if (!currentUser) {
    if (detailInfo) {
      detailInfo.textContent = "Liked qilish uchun login qiling."
    }
    return
  }

  if (!liked) {
    const { error } = await supabase
      .from("liked_products")
      .insert({
        user_id: currentUser.id,
        product_id: productId
      })

    if (error) {
      console.log("like insert error:", error)
      if (detailInfo) {
        detailInfo.textContent = "Liked qilishda xatolik yuz berdi."
      }
      return
    }

    liked = true
  } else {
    const { error } = await supabase
      .from("liked_products")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("product_id", productId)

    if (error) {
      console.log("like delete error:", error)
      if (detailInfo) {
        detailInfo.textContent = "Liked dan o‘chirishda xatolik yuz berdi."
      }
      return
    }

    liked = false
  }

  renderProduct()
  await updateLikedBadge()
}

const addToCart = () => {
  if (!product) return

  const cart = JSON.parse(localStorage.getItem("pc_cart") || "[]")
  const found = cart.find((item) => item.product_id === product.id)
  const image = productImages[0] ? resolveImageUrl(productImages[0].path) : ""

  if (found) {
    found.qty += 1
  } else {
    cart.push({
      product_id: product.id,
      product_name: product.name,
      product_price: Number(product.price || 0),
      product_image: image,
      qty: 1
    })
  }

  localStorage.setItem("pc_cart", JSON.stringify(cart))
  updateCartBadge()

  if (detailInfo) {
    detailInfo.textContent = "Savatga qo‘shildi."
  }
}

const saveComment = async () => {
  if (!currentUser) {
    commentStatus.textContent = "Fikr yozish uchun login qiling."
    return
  }

  if (!myComment && !canReview) {
    commentStatus.textContent = "Faqat sotib olib, holati tugallangan (status = 3) mahsulotga fikr yozish mumkin."
    return
  }

  const rating = Number(ratingInput.value || 0)
  const comment = commentInput.value.trim()

  if (rating < 1 || rating > 5) {
    commentStatus.textContent = "Avval star tanlang."
    return
  }

  commentStatus.textContent = "Saqlanmoqda..."

  if (myComment) {
    const { error } = await supabase
      .from("product_comments")
      .update({
        rating,
        comment
      })
      .eq("id", myComment.id)
      .eq("user_id", currentUser.id)

    if (error) {
      console.log("update comment error:", error)
      commentStatus.textContent = "Tahrirlashda xatolik yuz berdi."
      return
    }

    commentStatus.textContent = "Fikr yangilandi."
  } else {
    const { error } = await supabase
      .from("product_comments")
      .insert({
        product_id: productId,
        user_id: currentUser.id,
        rating,
        comment
      })

    if (error) {
      console.log("insert comment error:", error)
      commentStatus.textContent = "Fikr qo‘shishda xatolik yuz berdi."
      return
    }

    commentStatus.textContent = "Fikr saqlandi."
  }

  await loadComments()
}

const deleteMyComment = async (commentId) => {
  if (!currentUser) return

  commentStatus.textContent = "O‘chirilmoqda..."

  const { error } = await supabase
    .from("product_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", currentUser.id)

  if (error) {
    console.log("delete comment error:", error)
    commentStatus.textContent = "O‘chirishda xatolik yuz berdi."
    return
  }

  commentStatus.textContent = "Fikr o‘chirildi."
  await loadComments()
}

const resetCommentForm = () => {
  if (myComment) {
    commentInput.value = myComment.comment || ""
    setRating(myComment.rating || 0)
    commentStatus.textContent = ""
    return
  }

  commentInput.value = ""
  setRating(0)
  commentStatus.textContent = ""
}

thumbsRow?.addEventListener("click", (e) => {
  const btn = e.target.closest(".detail-thumb")
  if (!btn) return

  selectedImageIndex = Number(btn.dataset.index || 0)
  renderGallery()
})

likeBtn?.addEventListener("click", toggleLike)
addToCartBtn?.addEventListener("click", addToCart)

starPicker?.addEventListener("click", (e) => {
  const btn = e.target.closest(".star-btn")
  if (!btn) return

  setRating(Number(btn.dataset.value || 0))
})

commentForm?.addEventListener("submit", async (e) => {
  e.preventDefault()
  await saveComment()
})

resetCommentBtn?.addEventListener("click", resetCommentForm)

commentsList?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".edit-comment-btn")
  const deleteBtn = e.target.closest(".delete-comment-btn")

  if (editBtn) {
    const item = comments.find((x) => x.id === editBtn.dataset.id)
    if (!item) return

    myComment = item
    commentInput.value = item.comment || ""
    setRating(item.rating || 0)
    updateReviewAccessUI()
    commentStatus.textContent = "Tahrirlash rejimi yoqildi."
    commentInput.focus()
  }

  if (deleteBtn) {
    await deleteMyComment(deleteBtn.dataset.id)
  }
})

const init = async () => {
  updateCartBadge()
  currentUser = await getSessionUser()
  await updateLikedBadge()
  await loadProduct()
  await loadLikedState()
  await checkCanReview()
  await loadComments()
}

init()