import { supabase } from "../../Base/js/supabaseClient.js"

const FINISHED_STATUS = 3
const PRODUCT_BUCKET = "products"

const notificationBox = document.getElementById("reviewNotification")
const notificationClose = document.getElementById("reviewNotificationClose")
const notificationMedia = document.getElementById("reviewNotificationMedia")
const notificationTitle = document.getElementById("reviewNotificationTitle")
const notificationText = document.getElementById("reviewNotificationText")
const notificationLink = document.getElementById("reviewNotificationLink")

let notificationQueue = []
let currentNotificationIndex = 0

const getSessionUser = async () => {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.log("review notification session error:", error)
    return null
  }

  return data.session?.user || null
}

const resolveImageUrl = (path) => {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path

  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

const getProductDetailLink = (productId) => {
  return `./product-detail.html?id=${productId}`
}

const hideNotification = () => {
  notificationBox?.classList.add("hidden")
}

const showNotification = () => {
  notificationBox?.classList.remove("hidden")
}

const setNotificationContent = (product, index, total) => {
  if (!notificationBox || !notificationMedia || !notificationTitle || !notificationText || !notificationLink) return

  const imageSrc = resolveImageUrl(product.product_image || "")
    

  notificationMedia.innerHTML = imageSrc
    ? `<img src="${imageSrc}" alt="${product.product_name || "Mahsulot"}">`
    : `
      <div class="review-notification-empty">
        <i class="fa-regular fa-image"></i>
      </div>
    `

  notificationTitle.textContent = product.product_name || "Mahsulot"
  notificationText.textContent = `Bu mahsulot uchun fikr qoldirishingiz mumkin. (${index + 1}/${total})`
  notificationLink.href = getProductDetailLink(product.product_id)
}

const showNextNotification = () => {
  if (!notificationQueue.length) {
    hideNotification()
    return
  }

  if (currentNotificationIndex >= notificationQueue.length) {
    hideNotification()
    return
  }

  const product = notificationQueue[currentNotificationIndex]
  setNotificationContent(product, currentNotificationIndex, notificationQueue.length)
  showNotification()
}

const handleCloseNotification = () => {
  currentNotificationIndex += 1
  showNextNotification()
}

const loadCompletedProductsForReview = async () => {
  const user = await getSessionUser()

  if (!user) {
    hideNotification()
    return
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      order_items (
        product_id,
        product_name,
        product_image
      )
    `)
    .eq("user_id", user.id)
    .eq("status", FINISHED_STATUS)

  if (ordersError) {
    console.log("review notification orders error:", ordersError)
    hideNotification()
    return
  }

  const rawItems = (orders || [])
    .flatMap((order) => Array.isArray(order.order_items) ? order.order_items : [])
    .filter((item) => item?.product_id)

  if (!rawItems.length) {
    hideNotification()
    return
  }

  const uniqueMap = new Map()

  rawItems.forEach((item) => {
    if (!uniqueMap.has(item.product_id)) {
      uniqueMap.set(item.product_id, item)
    }
  })

  const uniqueProducts = Array.from(uniqueMap.values())
  const productIds = uniqueProducts.map((item) => item.product_id)

  const { data: myComments, error: commentsError } = await supabase
    .from("product_comments")
    .select("product_id")
    .eq("user_id", user.id)
    .in("product_id", productIds)

  if (commentsError) {
    console.log("review notification comments error:", commentsError)
    hideNotification()
    return
  }

  const commentedIds = new Set((myComments || []).map((item) => item.product_id))

  const availableProducts = uniqueProducts.filter((item) => !commentedIds.has(item.product_id))

  if (!availableProducts.length) {
    hideNotification()
    return
  }

  notificationQueue = availableProducts
  currentNotificationIndex = 0
  showNextNotification()
}

notificationClose?.addEventListener("click", handleCloseNotification)

loadCompletedProductsForReview()