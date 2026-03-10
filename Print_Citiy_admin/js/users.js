import { supabase } from "../../Base/js/supabaseClient.js"
import { requireRoles } from "../../Base/js/auth.js"

let allUsers = []
let activeRole = "user"
let selectedUser = null
let currentView = "table"

const usersCardView = document.getElementById("usersCardView")
const usersTableView = document.getElementById("usersTableView")
const usersTableBody = document.getElementById("usersTableBody")
const usersInfo = document.getElementById("usersInfo")
const searchInput = document.getElementById("searchInput")
const tabBtns = Array.from(document.querySelectorAll(".tab-btn"))
const viewToggleBtn = document.getElementById("viewToggleBtn")

const usersCount = document.getElementById("usersCount")
const managersCount = document.getElementById("managersCount")
const adminsCount = document.getElementById("adminsCount")

const userModal = document.getElementById("userModal")
const userModalCloseBtn = document.getElementById("userModalCloseBtn")
const detailUserId = document.getElementById("detailUserId")
const detailUserName = document.getElementById("detailUserName")
const detailUserEmail = document.getElementById("detailUserEmail")
const detailUserPhone = document.getElementById("detailUserPhone")
const detailUserRole = document.getElementById("detailUserRole")
const detailUserStatus = document.getElementById("detailUserStatus")
const detailUserLastLogin = document.getElementById("detailUserLastLogin")
const detailUserCreatedAt = document.getElementById("detailUserCreatedAt")
const modalEditUserBtn = document.getElementById("modalEditUserBtn")
// const modalToggleActiveBtn = document.getElementById("modalToggleActiveBtn")

const userFormModal = document.getElementById("userFormModal")
const userFormCloseBtn = document.getElementById("userFormCloseBtn")
const userForm = document.getElementById("userForm")
const userFormStatus = document.getElementById("userFormStatus")
const editUserId = document.getElementById("editUserId")
const editFullName = document.getElementById("editFullName")
const editPhone = document.getElementById("editPhone")
const editRole = document.getElementById("editRole")
const editBlocked = document.getElementById("editBlocked")

const fmtDate = (iso) => {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("uz-UZ")
  } catch {
    return iso
  }
}

const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

const openModal = (el) => {
  el.classList.remove("hidden")
  document.body.classList.add("modal-open")
}

const closeModal = (el) => {
  el.classList.add("hidden")
  if (userModal.classList.contains("hidden") && userFormModal.classList.contains("hidden")) {
    document.body.classList.remove("modal-open")
  }
}

const initials = (name, email) => {
  const source = String(name || email || "User").trim()
  const parts = source.split(" ").filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

const renderAvatar = (u) => {
  if (u.avatar_url) {
    return `<div class="user-avatar"><img src="${escapeHtml(u.avatar_url)}" alt="avatar"></div>`
  }
  return `<div class="user-avatar">${escapeHtml(initials(u.full_name, u.email))}</div>`
}

const getFilteredUsers = () => {
  const q = String(searchInput.value || "").trim().toLowerCase()

  return allUsers.filter((u) => {
    const byRole = u.role === activeRole
    const bySearch =
      !q ||
      String(u.full_name || "").toLowerCase().includes(q) ||
      String(u.email || "").toLowerCase().includes(q) ||
      String(u.phone || "").toLowerCase().includes(q)

    return byRole && bySearch
  })
}

const updateCounts = () => {
  usersCount.textContent = allUsers.filter((u) => u.role === "user").length
  managersCount.textContent = allUsers.filter((u) => u.role === "manager").length
  adminsCount.textContent = allUsers.filter((u) => u.role === "admin").length
}

const renderCards = (filtered) => {
  usersCardView.innerHTML = filtered.length
    ? filtered.map((u) => {
        const isActive = u.is_active !== false

        return `
          <div class="user-card">
            <div class="user-card-top">
              ${renderAvatar(u)}

              <div class="user-main">
                <div class="user-name">${escapeHtml(u.full_name || "Nomsiz")}</div>
                <div class="user-email">${escapeHtml(u.email || "-")}</div>
              </div>

              <span class="user-role-badge">${escapeHtml(u.role || "-")}</span>
            </div>

            <div class="user-meta">
              <div class="user-meta-row">
                <span>Telefon</span>
                <span>${escapeHtml(u.phone || "-")}</span>
              </div>

              <div class="user-meta-row">
                <span>Oxirgi login</span>
                <span>${escapeHtml(fmtDate(u.last_login_at))}</span>
              </div>

              <div class="user-meta-row">
  <span>Holati</span>
  <button
    class="user-block-badge status-toggle ${isActive ? "" : "blocked"}"
    data-act="toggle-active"
    data-id="${escapeHtml(u.id)}"
    type="button"
  >
    ${isActive ? "Faol" : "Nofaol"}
  </button>
</div>
            </div>

            <div class="user-actions">
              <button class="btn-secondary user-action" data-act="view" data-id="${escapeHtml(u.id)}" type="button">
                <i class="fa-regular fa-eye"></i> Ko‘rish
              </button>

              <button class="btn-secondary user-action" data-act="edit" data-id="${escapeHtml(u.id)}" type="button">
                <i class="fa-regular fa-pen-to-square"></i> Tahrirlash
              </button>

            </div>
          </div>
        `
      }).join("")
    : `<div class="empty-row">Hozircha ma'lumot yo‘q.</div>`
}

const renderTable = (filtered) => {
  usersTableBody.innerHTML = filtered.length
    ? filtered.map((u) => {
        const isActive = u.is_active !== false

        return `
          <tr>
            <td>
              <div class="table-user">
                ${renderAvatar(u)}
                <div class="table-user-info">
                  <div class="table-user-name">${escapeHtml(u.full_name || "Nomsiz")}</div>
                  <div class="table-user-email">${escapeHtml(u.email || "-")}</div>
                </div>
              </div>
            </td>

            <td>${escapeHtml(u.phone || "-")}</td>

            <td>
              <span class="user-role-badge">${escapeHtml(u.role || "-")}</span>
            </td>

            <td>
  <button
    class="user-block-badge status-toggle ${isActive ? "" : "blocked"}"
    data-act="toggle-active"
    data-id="${escapeHtml(u.id)}"
    type="button"
  >
    ${isActive ? "Faol" : "Nofaol"}
  </button>
</td>

            <td>${escapeHtml(fmtDate(u.last_login_at))}</td>
            <td>${escapeHtml(fmtDate(u.created_at))}</td>

            <td>
              <div class="table-actions">
                <button class="btn-secondary user-action" data-act="view" data-id="${escapeHtml(u.id)}" type="button">
                  <i class="fa-regular fa-eye"></i>
                </button>

                <button class="btn-secondary user-action" data-act="edit" data-id="${escapeHtml(u.id)}" type="button">
                  <i class="fa-regular fa-pen-to-square"></i>
                </button>

              </div>
            </td>
          </tr>
        `
      }).join("")
    : `
      <tr>
        <td colspan="7">
          <div class="empty-row">Hozircha ma'lumot yo‘q.</div>
        </td>
      </tr>
    `
}

const applyView = () => {
  if (currentView === "table") {
    usersTableView.classList.remove("hidden")
    usersCardView.classList.add("hidden")
    viewToggleBtn.innerHTML = `<i class="fa-solid fa-id-card"></i>`
  } else {
    usersCardView.classList.remove("hidden")
    usersTableView.classList.add("hidden")
    viewToggleBtn.innerHTML = `<i class="fa-solid fa-table-cells-large"></i>`
  }
}

const renderUsers = () => {
  const filtered = getFilteredUsers()
  updateCounts()
  renderCards(filtered)
  renderTable(filtered)
  applyView()
}

const loadUsers = async () => {
  usersInfo.textContent = "Yuklanmoqda..."

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, email, avatar_url, last_login_at, created_at, updated_at, is_active")
    .order("created_at", { ascending: false })

  if (error) {
    console.error(error)
    usersInfo.textContent = "Xatolik!"
    return
  }

  allUsers = data || []
  renderUsers()

  const time = new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

  usersInfo.textContent = "Oxirgi yangilanish · " + time
//   console.log("data length:", data?.length)
// console.log("data:", data)
}

const fillUserModal = (u) => {
  selectedUser = u

  const isActive = u.is_active !== false

  detailUserId.textContent = u.id || "-"
  detailUserName.textContent = u.full_name || "-"
  detailUserEmail.textContent = u.email || "-"
  detailUserPhone.textContent = u.phone || "-"
  detailUserRole.textContent = u.role || "-"
  detailUserStatus.textContent = isActive ? "Faol" : "Nofaol"
  detailUserLastLogin.textContent = fmtDate(u.last_login_at)
  detailUserCreatedAt.textContent = fmtDate(u.created_at)

  // modalToggleActiveBtn.innerHTML = isActive
  //   ? `<i class="fa-solid fa-power-off"></i> Nofaol qilish`
  //   : `<i class="fa-solid fa-check"></i> Faol qilish`

  openModal(userModal)
}

const fillUserForm = (u) => {
  editUserId.value = u.id
  editFullName.value = u.full_name || ""
  editPhone.value = u.phone || ""
  editRole.value = u.role || "user"
  editBlocked.value = String(u.is_active === false)
  userFormStatus.textContent = ""
}

const openEditModal = (u) => {
  selectedUser = u
  fillUserForm(u)
  openModal(userFormModal)
}

const toggleActive = async (id, isCurrentlyActive) => {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !isCurrentlyActive })
    .eq("id", id)

  if (error) {
    console.error(error)
    alert("Holatni o‘zgartirishda xatolik")
    return
  }

  closeModal(userModal)
  await loadUsers()
}

const handleUserAction = (e) => {
  const btn = e.target.closest("[data-act]")
  if (!btn) return

  const id = btn.dataset.id
  const act = btn.dataset.act
  const u = allUsers.find((x) => x.id === id)

  if (!u) return

  if (act === "view") fillUserModal(u)
  if (act === "edit") openEditModal(u)
  if (act === "toggle-active") toggleActive(u.id, u.is_active !== false)
}

usersCardView?.addEventListener("click", handleUserAction)
usersTableView?.addEventListener("click", handleUserAction)

tabBtns.forEach((b) => {
  b.addEventListener("click", () => {
    tabBtns.forEach((x) => x.classList.remove("active"))
    b.classList.add("active")
    activeRole = b.dataset.role
    renderUsers()
  })
})

viewToggleBtn?.addEventListener("click", () => {
  currentView = currentView === "table" ? "card" : "table"
  renderUsers()
})

modalEditUserBtn?.addEventListener("click", () => {
  if (!selectedUser) return
  closeModal(userModal)
  openEditModal(selectedUser)
})

// modalToggleActiveBtn?.addEventListener("click", () => {
//   if (!selectedUser) return
//   toggleActive(selectedUser.id, selectedUser.is_active !== false)
// })

userForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const id = editUserId.value
  if (!id) return

  userFormStatus.textContent = "Saqlanmoqda..."

  const payload = {
    full_name: editFullName.value.trim(),
    phone: editPhone.value.trim(),
    role: editRole.value,
    is_active: editBlocked.value !== "true"
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)

  if (error) {
    console.error(error)
    userFormStatus.textContent = "Xatolik!"
    return
  }

  userFormStatus.textContent = "Saqlandi"
  closeModal(userFormModal)
  await loadUsers()
})

searchInput?.addEventListener("input", renderUsers)
usersInfo?.addEventListener("click", loadUsers)

userModal?.addEventListener("click", (e) => {
  const t = e.target
  if (t && t.dataset && t.dataset.close === "1") closeModal(userModal)
})

userFormModal?.addEventListener("click", (e) => {
  const t = e.target
  if (t && t.dataset && t.dataset.close === "1") closeModal(userFormModal)
})

userModalCloseBtn?.addEventListener("click", () => closeModal(userModal))
userFormCloseBtn?.addEventListener("click", () => closeModal(userFormModal))

const init = async () => {
  const auth = await requireRoles(["admin"])
  if (!auth) return
  await loadUsers()
}

init()