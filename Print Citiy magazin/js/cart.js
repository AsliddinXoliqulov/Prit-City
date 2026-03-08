const cartList = document.getElementById("cartList")
const cartCount = document.getElementById("cartCount")
const cartInfo = document.getElementById("cartInfo")
const summaryItemsCount = document.getElementById("summaryItemsCount")
const summaryTotalPrice = document.getElementById("summaryTotalPrice")
const clearCartBtn = document.getElementById("clearCartBtn")
const checkoutBtn = document.getElementById("checkoutBtn")

let cart = []

const money = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n || 0)) + " so'm"

const loadCart = () => {
  cart = JSON.parse(localStorage.getItem("pc_cart") || "[]")
  renderCart()
}

const saveCart = () => {
  localStorage.setItem("pc_cart", JSON.stringify(cart))
}

const renderCart = () => {
  const itemsCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const total = cart.reduce((sum, item) => sum + (Number(item.product_price || 0) * Number(item.qty || 0)), 0)

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
  cartInfo.textContent = "Savat tozalandi."
})

checkoutBtn?.addEventListener("click", () => {
  if (!cart.length) {
    cartInfo.textContent = "Savat bo‘sh."
    return
  }

  cartInfo.textContent = "Keyingi bosqichda checkout sahifasini ulaymiz."
})

loadCart()