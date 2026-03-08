import { supabase } from "../../Base/js/supabaseClient.js"

const ordersCount = document.getElementById("ordersCount")
const ordersInfo = document.getElementById("ordersInfo")
const ordersState = document.getElementById("ordersState")
const ordersList = document.getElementById("ordersList")
const searchInput = document.getElementById("searchInput")
const tabBtns = Array.from(document.querySelectorAll(".tab-btn"))
const cartCountBadge = document.getElementById("cartCountBadge")

let currentUser = null
let allOrders = []
let activeTab = ""

const money = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n || 0)) + " so'm"

const fmtDate = (iso) => {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("uz-UZ")
  } catch {
    return iso
  }
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

const safeArr = (v) => (Array.isArray(v) ? v : [])

const statusName = (st) => {
  const n = Number(st)
  if (n === 0) return "Bekor qilingan"
  if (n === 1) return "Yangi"
  if (n === 2) return "Jarayonda"
  if (n === 3) return "Yakunlangan"
  return "-"
}

const cutText = (s, max = 40) => {
  const t = String(s || "")
  return t.length > max ? t.slice(0, max) + "..." : t
}

const normalizeOrders = (rows) => {
  return rows.map((row) => {
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
      admin_note: row.admin_note,
      items: items.map((x) => ({
        product_id: x.product_id,
        product_name: x.product_name,
        product_price: x.product_price,
        product_image: x.product_image,
        qty: x.qty
      }))
    }
  })
}

const canCancel = (order) => Number(order.status) === 1

const renderOrders = () => {
  const q = String(searchInput.value || "").trim().toLowerCase()

  const filtered = allOrders.filter((o) => {
    const byStatus = activeTab === "" ? true : String(o.status) === String(activeTab)

    const itemText = o.items.map((x) => `${x.product_name || ""} ${x.product_id || ""}`).join(" ").toLowerCase()
    const bySearch =
      !q ||
      String(o.id || "").toLowerCase().includes(q) ||
      itemText.includes(q)

    return byStatus && bySearch
  })

  ordersCount.textContent = `${filtered.length} ta`

  ordersList.innerHTML = filtered.length
    ? filtered.map((o) => {
        const itemsHtml = o.items.length
          ? o.items.map((item) => `
              <div class="order-item">
                <div class="mono">${String(item.product_id || "-").slice(0, 8)}</div>

                <div class="order-image">
                  ${
                    item.product_image
                      ? `<img src="${item.product_image}" alt="${item.product_name || ""}" loading="lazy" />`
                      : `<i class="fa-regular fa-image"></i>`
                  }
                </div>

                <div class="order-item-info">
                  <span class="order-item-name">${cutText(item.product_name || "-", 34)}</span>
                  <div class="small order-item-info-number">
                    <span class="price">${money(item.product_price)}</span>
                    <span class="mono">Soni: ${item.qty}</span>
                  </div>
                </div>
              </div>
            `).join("")
          : `<div class="empty-row">Mahsulot yo‘q.</div>`

        return `
          <div class="order-card">
            <div class="order-head">
              <div>
                <div class="order-title">
                  Buyurtma raqami -
                  <span class="mono">${o.id}</span>
                  <span class="badge-soft ${Number(o.status) === 0 ? "status-cancelled" : ""}">
                    ${statusName(o.status)}
                  </span>
                </div>

                <div class="small">
                  <i class="fa-solid fa-calendar"></i> ${fmtDate(o.created_at)}
                </div>
              </div>

              <div class="order-right">
                <div class="small">Jami: <span class="price">${money(o.total_price)}</span></div>
              </div>
            </div>

            <div class="order-items">${itemsHtml}</div>

            <div class="order-meta">
              <div class="small"><b>Manzil:</b> ${o.address_text || "-"}</div>
              <div class="small"><b>Joy nomi:</b> ${o.location_name || "-"}</div>
              <div class="small"><b>Xabar:</b> ${o.message || "-"}</div>

              ${
                o.admin_note
                  ? `<div class="small"><b>Admin eslatma:</b> ${o.admin_note}</div>`
                  : ``
              }

              <div class="order-actions-row">
                ${
                  canCancel(o)
                    ? `<button class="btn-danger cancel-order-btn" data-id="${o.id}" type="button">
                        <i class="fa-solid fa-ban"></i> Bekor qilish
                      </button>`
                    : ``
                }
              </div>
            </div>
          </div>
        `
      }).join("")
    : `<div class="empty-row">Buyurtmalar topilmadi.</div>`

  ordersState.classList.add("hidden")
  ordersList.classList.remove("hidden")
}

const loadOrders = async () => {
  currentUser = await getSessionUser()

  if (!currentUser) {
    ordersState.textContent = "Buyurtmalarni ko‘rish uchun login qiling."
    return
  }

  ordersInfo.textContent = "Yuklanmoqda..."

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      user_name,
      user_email,
      user_phone,
      address_text,
      location_name,
      message,
      admin_note,
      status,
      total_price,
      created_at,
      order_items(
        product_id,
        product_name,
        product_price,
        product_image,
        qty
      )
    `)
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })

  if (error) {
    ordersState.textContent = "Buyurtmalarni yuklashda xatolik."
    ordersInfo.textContent = "Xatolik!"
    return
  }

  allOrders = normalizeOrders(data || [])
  renderOrders()

  const time = new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
  ordersInfo.textContent = "Oxirgi yangilanish · " + time
}

const cancelOrder = async (orderId) => {
  if (!confirm("Buyurtmani bekor qilasizmi?")) return

  const { error } = await supabase
    .from("orders")
    .update({ status: 0 })
    .eq("id", orderId)

  if (error) {
    ordersInfo.textContent = "Bekor qilishda xatolik!"
    return
  }

  ordersInfo.textContent = "Buyurtma bekor qilindi."
  await loadOrders()
}

ordersList?.addEventListener("click", (e) => {
  const btn = e.target.closest(".cancel-order-btn")
  if (!btn) return

  cancelOrder(btn.dataset.id)
})

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((x) => x.classList.remove("active"))
    btn.classList.add("active")
    activeTab = btn.dataset.tab
    renderOrders()
  })
})

searchInput?.addEventListener("input", renderOrders)

const init = async () => {
  updateCartBadge()
  await loadOrders()
}

init()