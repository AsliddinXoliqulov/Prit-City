import { supabase } from "../../Base/js/supabaseClient.js"
import { requireRoles } from "../../Base/js/auth.js"

let orders = []
let activeTab = 1
let currentRole = null

const completedCount = document.getElementById("completed_count")
const newCount = document.getElementById("new_count")
const deliveringCount = document.getElementById("delivering_count")
const cancelledCount = document.getElementById("cancelled_count")
const ordersList = document.getElementById("ordersList")
const ordersInfo = document.getElementById("ordersInfo")
const btnReloadOrders = document.getElementById("btnReloadOrders")
const tabBtns = Array.from(document.querySelectorAll(".tab-btn"))
const searchInput = document.getElementById("searchInput")

const mapModal = document.getElementById("mapModal")
const mapCloseBtn = document.getElementById("mapCloseBtn")
const mapText = document.getElementById("mapText")

const noteModal = document.getElementById("noteModal")
const noteCloseBtn = document.getElementById("noteCloseBtn")
const noteOrderId = document.getElementById("noteOrderId")
const noteTextarea = document.getElementById("noteTextarea")
const noteStatus = document.getElementById("noteStatus")
const saveNoteBtn = document.getElementById("saveNoteBtn")

let mapInstance = null
let mapMarker = null

const safeArr = (v) => (Array.isArray(v) ? v : [])

const parseLatLng = (lat, lng) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null
  return { lat: Number(lat), lng: Number(lng), raw: `${lat},${lng}` }
}

const statusName = (st) => {
  const n = Number(st)
  if (n === 0) return "Bekor qilingan"
  if (n === 1) return "Yangi"
  if (n === 2) return "Jarayonda"
  if (n === 3) return "Yakunlangan"
  return String(st ?? "-")
}

const formatUzTime = (iso) => {
  if (!iso) return "-"
  const d = new Date(iso)
  const formatted = d.toLocaleString("en-US", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  })

  return formatted
    .replace("a.m.", "AM")
    .replace("p.m.", "PM")
    .replace("/", ".")
    .replace("/", ".")
    .replace(",", " |")
}

const cutText = (s, max) => {
  const t = String(s ?? "")
  return t.length > max ? t.slice(0, max) + "..." : t
}

const canDelete = () => currentRole === "admin"
const canUpdateStatus = () => currentRole === "admin" || currentRole === "manager"

const openModal = (el) => {
  if (!el) return
  el.classList.remove("hidden")
  document.body.classList.add("modal-open")
}

const closeModal = (el) => {
  if (!el) return
  el.classList.add("hidden")

  if (
    mapModal?.classList.contains("hidden") &&
    noteModal?.classList.contains("hidden")
  ) {
    document.body.classList.remove("modal-open")
  }
}

const openProductDetailFromOrder = (productId) => {
  if (!productId || productId === "-") return
  window.location.href = `./product-detail.html?id=${productId}`
}

const orderCard = (o) => {
  const ids = safeArr(o.product_ids)
  const names = safeArr(o.product_names)
  const prices = safeArr(o.product_prices)
  const counts = safeArr(o.product_counts)
  const images = safeArr(o.product_images)
  const st = Number(o.status ?? 1)

  let itemsHtml = ""
  const maxLen = Math.max(ids.length, names.length, prices.length, counts.length, images.length)

  for (let i = 0; i < maxLen; i++) {
    const pid = ids[i] ?? "-"
    const nm = cutText(names[i] ?? "-", 30)
    const pr = prices[i] ?? "-"
    const pimg = images[i] ?? ""
    const ct = counts[i] ?? 1

    itemsHtml += `
      <div class="order-item">
        <div class="mono">${String(pid).slice(0, 8)}</div>

        <div class="order-image order-product-link" data-product-id="${pid}">
          ${
            pimg
              ? `<img src="${pimg}" alt="${nm}" loading="lazy" />`
              : `<i class="fa-regular fa-image"></i>`
          }
        </div>

        <div class="order-item-info">
          <span class="order-item-name order-product-link" data-product-id="${pid}">${nm}</span>

          <div class="small order-item-info-number">
            <span class="price">Narx: ${pr}</span>
            <span class="mono">Soni: ${ct}</span>
          </div>
        </div>
      </div>
    `
  }

  let statusButtons = ""

  if (canUpdateStatus()) {
    if (st !== 0) {
      statusButtons += `<button class="btn-secondary order-action" data-act="to0" data-id="${o.id}" type="button"><i class="fa-solid fa-ban"></i> Bekor qilish</button>`
    }

    if (st !== 1) {
      statusButtons += `<button class="btn-secondary order-action" data-act="to1" data-id="${o.id}" type="button">Yangi</button>`
    }

    if (st !== 2) {
      statusButtons += `<button class="btn-secondary order-action" data-act="to2" data-id="${o.id}" type="button">Jarayonda</button>`
    }

    if (st !== 3) {
      statusButtons += `<button class="btn-secondary order-action" data-act="to3" data-id="${o.id}" type="button">Yakunlash</button>`
    }
  }

  const mapBtn =
    o.latitude && o.longitude
      ? `<button class="btn-secondary order-action" data-act="map" data-id="${o.id}" type="button"><i class="fa-solid fa-map-location-dot"></i> Xarita</button>`
      : ``

  const noteBtn = canUpdateStatus()
    ? `<button class="btn-secondary order-action" data-act="note" data-id="${o.id}" type="button"><i class="fa-solid fa-note-sticky"></i> Eslatma</button>`
    : ``

  const delBtn = canDelete()
    ? `<button class="btn-danger order-action" data-act="del" data-id="${o.id}" type="button"><i class="fa-regular fa-trash-can"></i></button>`
    : ``

  const statusClass = st === 0 ? "order-status-cancelled" : ""

  return `
    <div class="order-card">
      <div class="order-head">
        <div>
          <div class="order-title">
            Buyurtma raqami -
            <span class="mono">${o.id}</span>
            <span class="badge-soft ${statusClass}">${statusName(st)}</span>
          </div>

          <div class="small">
            <i class="fa-solid fa-user"></i> ${o.user_name ?? "-"}
            &nbsp; | &nbsp;
            <i class="fa-solid fa-envelope"></i> ${o.user_email ?? "-"}
          </div>

          <a style="text-decoration:none;" class="small" href="tel:${o.user_phone ?? ""}">
            <i class="fa-solid fa-phone-volume"></i> ${o.user_phone ?? "-"}
          </a>
        </div>

        <div class="order-right">
          <div class="small">Jami: <span class="price">${o.total_price ?? "-"}</span></div>
          <div class="small">Sana: <span class="mono">${formatUzTime(o.created_at)}</span></div>
        </div>
      </div>

      <div class="order-items">${itemsHtml || `<div class="small">Mahsulotlar yo‘q</div>`}</div>

      <div class="order-meta">
        <div class="small"><b>Manzil:</b> ${o.address_text || "-"}</div>
        <div class="small"><b>Joy nomi:</b> ${o.location_name || "-"}</div>
        <div class="small"><b>Xabar:</b> ${o.message || "-"}</div>

        ${
          o.admin_note
            ? `<div class="order-note small"><b>Admin eslatma:</b> ${o.admin_note}</div>`
            : ``
        }

        <div class="order-actions-row">
          ${mapBtn}
          ${noteBtn}
          ${statusButtons}
          ${delBtn}
        </div>
      </div>
    </div>
  `
}

const renderOrders = () => {
  const q = String(searchInput?.value || "").trim().toLowerCase()

  const list = orders.filter((o) => {
    const byTab = Number(o.status ?? 1) === activeTab
    const bySearch =
      !q ||
      String(o.id || "").toLowerCase().includes(q) ||
      String(o.user_name || "").toLowerCase().includes(q) ||
      String(o.user_phone || "").toLowerCase().includes(q) ||
      String(o.user_email || "").toLowerCase().includes(q)

    return byTab && bySearch
  })

  if (ordersList) {
    ordersList.innerHTML = list.length
      ? list.map(orderCard).join("")
      : `<div class="empty-row">Hozircha buyurtma yo‘q.</div>`
  }

  if (newCount) newCount.textContent = orders.filter((o) => Number(o.status) === 1).length
  if (deliveringCount) deliveringCount.textContent = orders.filter((o) => Number(o.status) === 2).length
  if (completedCount) completedCount.textContent = orders.filter((o) => Number(o.status) === 3).length
  if (cancelledCount) cancelledCount.textContent = orders.filter((o) => Number(o.status) === 0).length
}

const normalizeOrder = (row) => {
  const items = safeArr(row.order_items)

  return {
    id: row.id,
    user_name: row.user_name,
    user_email: row.user_email,
    user_phone: row.user_phone,
    address_text: row.address_text,
    location_name: row.location_name,
    message: row.message,
    status: row.status,
    total_price: row.total_price,
    created_at: row.created_at,
    updated_at: row.updated_at,
    latitude: row.latitude,
    longitude: row.longitude,
    admin_note: row.admin_note,
    product_ids: items.map((x) => x.product_id ?? "-"),
    product_names: items.map((x) => x.product_name ?? "-"),
    product_prices: items.map((x) => x.product_price ?? "-"),
    product_counts: items.map((x) => x.qty ?? 1),
    product_images: items.map((x) => x.product_image ?? "")
  }
}

const fetchOrders = async () => {
  if (ordersInfo) ordersInfo.textContent = "Yangilanmoqda..."

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      user_name,
      user_email,
      user_phone,
      address_text,
      location_name,
      message,
      status,
      total_price,
      latitude,
      longitude,
      admin_note,
      created_at,
      updated_at,
      order_items(product_id,product_name,product_image,product_price,qty)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    if (ordersInfo) ordersInfo.textContent = "Yuklashda xatolik"
    return
  }

  orders = (data || []).map(normalizeOrder)
  renderOrders()

  const time = new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

  if (ordersInfo) ordersInfo.textContent = "Oxirgi yangilanish · " + time
}

const updateStatus = async (orderId, newStatus) => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)

    if (error) throw error
    await fetchOrders()
  } catch {
    alert("Status o‘zgartirishda xatolik")
  }
}

const deleteOrder = async (orderId) => {
  if (!confirm("Buyurtmani o‘chirasizmi?")) return

  try {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)

    if (error) throw error
    await fetchOrders()
  } catch {
    alert("O‘chirishda xatolik")
  }
}

const openMapModal = (orderId) => {
  const o = orders.find((x) => String(x.id) === String(orderId))
  if (!o) return

  const parsed = parseLatLng(o.latitude, o.longitude)
  if (mapText) {
    mapText.textContent = parsed ? `${o.location_name || ""} ${parsed.raw}`.trim() : "Map yo‘q"
  }

  openModal(mapModal)

  setTimeout(() => {
    const box = document.getElementById("leafletMap")
    if (!box) return

    if (!mapInstance) {
      mapInstance = L.map("leafletMap")
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(mapInstance)
    }

    let lat = 41.311081
    let lng = 69.240562

    if (parsed) {
      lat = parsed.lat
      lng = parsed.lng
    }

    mapInstance.setView([lat, lng], parsed ? 15 : 11)

    if (mapMarker) mapMarker.remove()
    mapMarker = L.marker([lat, lng]).addTo(mapInstance)

    setTimeout(() => {
      try {
        mapInstance.invalidateSize()
      } catch {}
    }, 50)
  }, 50)
}

const openNoteModal = (orderId) => {
  const o = orders.find((x) => String(x.id) === String(orderId))
  if (!o) return

  if (noteOrderId) noteOrderId.value = o.id
  if (noteTextarea) noteTextarea.value = o.admin_note || ""
  if (noteStatus) noteStatus.textContent = ""

  openModal(noteModal)
}

const saveNote = async () => {
  const id = noteOrderId?.value
  if (!id) return

  if (noteStatus) noteStatus.textContent = "Saqlanmoqda..."

  const { error } = await supabase
    .from("orders")
    .update({ admin_note: noteTextarea?.value.trim() || "" })
    .eq("id", id)

  if (error) {
    if (noteStatus) noteStatus.textContent = "Xatolik!"
    return
  }

  if (noteStatus) noteStatus.textContent = "Saqlandi"
  closeModal(noteModal)
  await fetchOrders()
}

ordersList?.addEventListener("click", (e) => {
  const productBox = e.target.closest(".order-product-link")

  if (productBox) {
    const productId = productBox.dataset.productId
    openProductDetailFromOrder(productId)
    return
  }

  const btn = e.target.closest(".order-action")
  if (!btn) return

  const act = btn.dataset.act
  const id = btn.dataset.id

  if (act === "to0") updateStatus(id, 0)
  if (act === "to1") updateStatus(id, 1)
  if (act === "to2") updateStatus(id, 2)
  if (act === "to3") updateStatus(id, 3)
  if (act === "map") openMapModal(id)
  if (act === "note") openNoteModal(id)
  if (act === "del") deleteOrder(id)
})

tabBtns.forEach((b) => {
  b.addEventListener("click", () => {
    tabBtns.forEach((x) => x.classList.remove("active"))
    b.classList.add("active")
    activeTab = Number(b.dataset.tab)
    renderOrders()
  })
})

btnReloadOrders?.addEventListener("click", fetchOrders)
ordersInfo?.addEventListener("click", fetchOrders)
searchInput?.addEventListener("input", renderOrders)

mapModal?.addEventListener("click", (e) => {
  const t = e.target
  if (t && t.dataset && t.dataset.close === "1") closeModal(mapModal)
})

noteModal?.addEventListener("click", (e) => {
  const t = e.target
  if (t && t.dataset && t.dataset.close === "1") closeModal(noteModal)
})

mapCloseBtn?.addEventListener("click", () => closeModal(mapModal))
noteCloseBtn?.addEventListener("click", () => closeModal(noteModal))
saveNoteBtn?.addEventListener("click", saveNote)

const init = async () => {
  const auth = await requireRoles(["admin", "manager"])
  if (!auth) return

  currentRole = auth.profile.role
  await fetchOrders()
}

init()