import { supabase } from "../../Base/js/supabaseClient.js"
import { showToast } from "../../Base/js/toast.js"

const cartList = document.getElementById("cartList")
const cartCount = document.getElementById("cartCount")
const cartInfo = document.getElementById("cartInfo")
const summaryItemsCount = document.getElementById("summaryItemsCount")
const summaryTotalPrice = document.getElementById("summaryTotalPrice")
const clearCartBtn = document.getElementById("clearCartBtn")
const checkoutBtn = document.getElementById("checkoutBtn")

const checkoutModal = document.getElementById("checkoutModal")
const checkoutOverlay = document.getElementById("checkoutOverlay")
const checkoutCloseBtn = document.getElementById("checkoutCloseBtn")
const cancelCheckoutBtn = document.getElementById("cancelCheckoutBtn")
const confirmCheckoutBtn = document.getElementById("confirmCheckoutBtn")
const confirmCheckoutBtnText = document.getElementById("confirmCheckoutBtnText")

const modalItemsCount = document.getElementById("modalItemsCount")
const modalTotalPrice = document.getElementById("modalTotalPrice")

const orderName = document.getElementById("orderName")
const orderPhone = document.getElementById("orderPhone")
const orderEmail = document.getElementById("orderEmail")
const orderAddress = document.getElementById("orderAddress")
const orderMapSearch = document.getElementById("orderMapSearch")
const orderMessage = document.getElementById("orderMessage")
const deliveryFields = document.getElementById("deliveryFields")
const deliveryRadios = document.querySelectorAll('input[name="deliveryMethod"]')

let cart = []
let currentUser = null

let map = null
let marker = null
let mapReady = false
let selectedLat = 41.3111
let selectedLng = 69.2797
let selectedLocationName = "Toshkent"
let confirmBtnDefault = ""

const money = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n || 0)) + " so'm"

const loadCart = () => {
  cart = JSON.parse(localStorage.getItem("pc_cart") || "[]")
  renderCart()
}

const saveCart = () => {
  localStorage.setItem("pc_cart", JSON.stringify(cart))
}

const getItemsCount = () => cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)

const getTotal = () => cart.reduce((sum, item) => sum + (Number(item.product_price || 0) * Number(item.qty || 0)), 0)

const renderCart = () => {
  const itemsCount = getItemsCount()
  const total = getTotal()

  cartCount.textContent = `${cart.length} ta`
  summaryItemsCount.textContent = itemsCount
  summaryTotalPrice.textContent = money(total)

  cartList.innerHTML = cart.length
    ? cart.map((item) => `
        <div class="cart-item">
          <div class="cart-image">
            ${
              item.product_image
                ? `<img src="${item.product_image}" alt="${item.product_name || ""}" loading="lazy">`
                : `<div class="cart-image-empty"><i class="fa-regular fa-image"></i></div>`
            }
          </div>

          <div class="cart-body">
            <div class="cart-name">${item.product_name || "-"}</div>

            <div class="cart-meta">
              <span class="price">${money(item.product_price)}</span>
              <span class="small">ID: ${String(item.product_id).slice(0, 8)}...</span>
            </div>

            <div class="cart-actions">
              <div class="cart-qty-box">
                <button class="btn-secondary qty-btn" data-act="minus" data-id="${item.product_id}" type="button">
                  <i class="fa-solid fa-minus"></i>
                </button>

                <span class="cart-qty-value">${item.qty}</span>

                <button class="btn-secondary qty-btn" data-act="plus" data-id="${item.product_id}" type="button">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>

              <div class="price">${money(Number(item.product_price || 0) * Number(item.qty || 0))}</div>

              <button class="btn-danger remove-btn" data-id="${item.product_id}" type="button">
                <i class="fa-regular fa-trash-can"></i> O‘chirish
              </button>
            </div>
          </div>
        </div>
      `).join("")
    : `<div class="empty-row">Savat bo‘sh.</div>`
}

const syncModalSummary = () => {
  modalItemsCount.textContent = getItemsCount()
  modalTotalPrice.textContent = money(getTotal())
}

const setInfo = (text, ok = true) => {
  cartInfo.textContent = text
  cartInfo.style.color = ok ? "" : "var(--danger)"
}

const setConfirmLoading = (loading) => {
  if (!confirmCheckoutBtn) return

  if (loading) {
    confirmBtnDefault = confirmCheckoutBtn.innerHTML
    confirmCheckoutBtn.disabled = true
    confirmCheckoutBtn.classList.add("btn-loading")
    confirmCheckoutBtn.innerHTML = `<span class="btn-spinner"></span> <span>Yuborilmoqda...</span>`
  } else {
    confirmCheckoutBtn.disabled = false
    confirmCheckoutBtn.classList.remove("btn-loading")
    confirmCheckoutBtn.innerHTML = confirmBtnDefault || `<i class="fa-solid fa-check"></i><span id="confirmCheckoutBtnText">Buyurtmani tasdiqlash</span>`
  }
}

const getDeliveryValue = () => {
  const checked = Array.from(deliveryRadios).find((r) => r.checked)
  return checked ? checked.value : "delivery"
}

const toggleDeliveryFields = () => {
  const isDelivery = getDeliveryValue() === "delivery"
  deliveryFields.style.display = isDelivery ? "block" : "none"

  if (isDelivery) {
    initializeMap()
    setTimeout(() => {
      if (map) map.invalidateSize()
    }, 120)
  }
}

async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  currentUser = data?.user || null
  return currentUser
}

async function fillProfileData() {
  const user = await getCurrentUser()

  if (user?.email && !orderEmail.value) orderEmail.value = user.email

  if (!user) return

  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", user.id)
    .single()

  if (data?.full_name && !orderName.value) orderName.value = data.full_name
  if (data?.phone && !orderPhone.value) orderPhone.value = data.phone
  if (data?.email && !orderEmail.value) orderEmail.value = data.email
}

function openCheckoutModal() {
  syncModalSummary()
  checkoutModal.classList.add("active")
  document.body.style.overflow = "hidden"
  toggleDeliveryFields()
  fillProfileData()
}

function closeCheckoutModal() {
  checkoutModal.classList.remove("active")
  document.body.style.overflow = ""
  setConfirmLoading(false)
}

async function geocodeQuery(query, signal) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    const res = await fetch(url, { signal, headers: { "Accept-Language": "uz" } })
    const data = await res.json()
    if (!data?.length) return null

    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
      display_name: data[0].display_name || ""
    }
  } catch {
    return null
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    const res = await fetch(url, { headers: { "Accept-Language": "uz" } })
    const data = await res.json()
    return data?.display_name || ""
  } catch {
    return ""
  }
}

async function updateSelectedLocation(lat, lng) {
  selectedLat = Number(lat)
  selectedLng = Number(lng)

  const name = await reverseGeocode(selectedLat, selectedLng)
  selectedLocationName = name || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`

  if (orderAddress) {
    orderAddress.value = selectedLocationName
  }
}

function initializeMap() {
  if (mapReady) return
  if (typeof L === "undefined") {
    setInfo("Xarita yuklanmadi.", false)
    showToast("Xarita yuklanmadi.", "error")
    return
  }

  mapReady = true

  map = L.map("orderMap").setView([selectedLat, selectedLng], 12)

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map)

  marker = L.marker([selectedLat, selectedLng], { draggable: true }).addTo(map)

  updateSelectedLocation(selectedLat, selectedLng)

  marker.on("dragend", async () => {
    const pos = marker.getLatLng()
    await updateSelectedLocation(pos.lat, pos.lng)
  })

  map.on("click", async (e) => {
    marker.setLatLng([e.latlng.lat, e.latlng.lng])
    await updateSelectedLocation(e.latlng.lat, e.latlng.lng)
  })

  let searchTimer = null
  let controller = null

  orderMapSearch?.addEventListener("input", (e) => {
    const q = String(e.target.value || "").trim()
    if (searchTimer) clearTimeout(searchTimer)
    if (!q) return

    searchTimer = setTimeout(async () => {
      if (controller) controller.abort()
      controller = new AbortController()

      const result = await geocodeQuery(q, controller.signal)
      if (!result) {
        setInfo("Manzil topilmadi.", false)
        showToast("Manzil topilmadi.", "error")
        return
      }

      map.setView([result.lat, result.lng], 16)
      marker.setLatLng([result.lat, result.lng])

      selectedLat = result.lat
      selectedLng = result.lng
      selectedLocationName = result.display_name || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
      orderAddress.value = selectedLocationName
      setInfo("Manzil topildi.")
      showToast("Manzil topildi.", "success")
    }, 700)
  })

  orderMapSearch?.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return
    e.preventDefault()

    const q = String(orderMapSearch.value || "").trim()
    if (!q) return

    const result = await geocodeQuery(q)
    if (!result) {
      setInfo("Manzil topilmadi.", false)
      showToast("Manzil topilmadi.", "error")
      return
    }

    map.setView([result.lat, result.lng], 16)
    marker.setLatLng([result.lat, result.lng])

    selectedLat = result.lat
    selectedLng = result.lng
    selectedLocationName = result.display_name || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
    orderAddress.value = selectedLocationName
    setInfo("Manzil topildi.")
    showToast("Manzil topildi.", "success")
  })

  setTimeout(() => {
    if (map) map.invalidateSize()
  }, 100)
}

async function createOrder() {
  const name = orderName.value.trim()
  const phone = orderPhone.value.trim()
  const email = orderEmail.value.trim()
  const message = orderMessage.value.trim()
  const deliveryType = getDeliveryValue()
  const isDelivery = deliveryType === "delivery"
  const addressText = orderAddress.value.trim()
  const totalPrice = getTotal()

  if (!cart.length) {
    setInfo("Savat bo‘sh.", false)
    showToast("Savat bo‘sh.", "error")
    return
  }

  if (!name) {
    setInfo("Ismni kiriting.", false)
    showToast("Ismni kiriting.", "error")
    orderName.focus()
    return
  }

  if (!phone) {
    setInfo("Telefon raqamni kiriting.", false)
    showToast("Telefon raqamni kiriting.", "error")
    orderPhone.focus()
    return
  }

  if (isDelivery && !addressText) {
    setInfo("Manzilni kiriting yoki xaritadan tanlang.", false)
    showToast("Manzilni kiriting yoki xaritadan tanlang.", "error")
    orderAddress.focus()
    return
  }

  setConfirmLoading(true)

  try {
    const user = await getCurrentUser()

    const orderPayload = {
      user_id: user?.id || null,
      latitude: isDelivery ? selectedLat : null,
      longitude: isDelivery ? selectedLng : null,
      status: 1,
      total_price: totalPrice,
      location_name: isDelivery ? selectedLocationName : "Olib ketish",
      message: message || null,
      user_name: name,
      user_email: email || user?.email || null,
      user_phone: phone,
      address_text: isDelivery ? addressText : "Olib ketish",
      admin_note: null
    }

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id, order_code")
      .single()

    if (orderError) throw orderError

    const itemsPayload = cart.map((item) => ({
      order_id: orderData.id,
      product_id: item.product_id || null,
      qty: Number(item.qty || 0),
      product_price: Number(item.product_price || 0),
      product_image: item.product_image || null,
      product_name: item.product_name || "-",
      subtotal: Number(item.product_price || 0) * Number(item.qty || 0)
    }))

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsPayload)

    if (itemsError) throw itemsError

    cart = []
    saveCart()
    renderCart()
    closeCheckoutModal()

    const orderCodeText = orderData?.order_code ? ` Buyurtma raqami: ${orderData.order_code}` : ""
    setInfo(`Buyurtma muvaffaqiyatli saqlandi.${orderCodeText}`)
    showToast(`Buyurtma muvaffaqiyatli saqlandi.${orderCodeText}`, "success")
  } catch (error) {
    console.error(error)
    setInfo("Buyurtmani saqlashda xatolik yuz berdi.", false)
    showToast("Buyurtmani saqlashda xatolik yuz berdi.", "error")
  } finally {
    setConfirmLoading(false)
  }
}

cartList?.addEventListener("click", (e) => {
  const qtyBtn = e.target.closest(".qty-btn")
  const removeBtn = e.target.closest(".remove-btn")

  if (qtyBtn) {
    const id = qtyBtn.dataset.id
    const act = qtyBtn.dataset.act
    const found = cart.find((x) => String(x.product_id) === String(id))
    if (!found) return

    if (act === "plus") found.qty += 1
    if (act === "minus" && found.qty > 1) found.qty -= 1

    saveCart()
    renderCart()
  }

  if (removeBtn) {
    const id = removeBtn.dataset.id
    cart = cart.filter((x) => String(x.product_id) !== String(id))
    saveCart()
    renderCart()
  }
})

clearCartBtn?.addEventListener("click", () => {
  if (!cart.length) return

  if (!confirm("Savatni tozalaysizmi?")) return

  cart = []
  saveCart()
  renderCart()
  setInfo("Savat tozalandi.")
  showToast("Savat tozalandi.", "success")
})

checkoutBtn?.addEventListener("click", () => {
  if (!cart.length) {
    setInfo("Savat bo‘sh.", false)
    showToast("Savat bo‘sh.", "error")
    return
  }

  openCheckoutModal()
})

checkoutOverlay?.addEventListener("click", closeCheckoutModal)
checkoutCloseBtn?.addEventListener("click", closeCheckoutModal)
cancelCheckoutBtn?.addEventListener("click", closeCheckoutModal)
confirmCheckoutBtn?.addEventListener("click", createOrder)

deliveryRadios.forEach((radio) => {
  radio.addEventListener("change", toggleDeliveryFields)
})

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && checkoutModal.classList.contains("active")) {
    closeCheckoutModal()
  }
})

loadCart()