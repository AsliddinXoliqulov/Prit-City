import { supabase } from "../../Base/js/supabaseClient.js"

const productFormModal = document.getElementById("productFormModal")
const formModalCloseBtn = document.getElementById("formModalCloseBtn")
const formModalTitle = document.getElementById("formModalTitle")
const productForm = document.getElementById("productForm")
const formStatus = document.getElementById("formStatus")
const productId = document.getElementById("productId")
const nameInput = document.getElementById("nameInput")
const priceInput = document.getElementById("priceInput")
const categoryInput = document.getElementById("categoryInput")
const aboutInput = document.getElementById("aboutInput")
const imgFileInput = document.getElementById("imgFileInput")
const btnResetForm = document.getElementById("btnResetForm")
const selectedFilesPreview = document.getElementById("selectedFilesPreview")
const existingImagesBox = document.getElementById("existingImagesBox")

let selectedFiles = []
let existingImages = []

const BUCKET_NAME = "products"

const getFileExt = (file) => {
  const parts = String(file.name || "").split(".")
  return parts.length > 1 ? parts.pop().toLowerCase() : "jpg"
}

const makeFilePath = (file) => {
  const ext = getFileExt(file)
  const random = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${random}.${ext}`
}

const clearSelectedFiles = () => {
  selectedFiles.forEach((item) => {
    try {
      URL.revokeObjectURL(item.preview)
    } catch {}
  })

  selectedFiles = []

  if (imgFileInput) imgFileInput.value = ""
  renderSelectedFiles()
}

const renderSelectedFiles = () => {
  if (!selectedFilesPreview) return

  if (!selectedFiles.length) {
    selectedFilesPreview.innerHTML = `<div class="empty-row">Rasm tanlanmagan</div>`
    return
  }

  selectedFilesPreview.innerHTML = selectedFiles.map((item) => {
    return `
      <div class="preview-card">
        <img src="${item.preview}" alt="">
        <button class="preview-remove" data-remove-new="${item.id}" type="button"><i class="fa-solid fa-xmark"></i></button>
        <div class="preview-name">${item.file.name}</div>
      </div>
    `
  }).join("")
}

const renderExistingImages = () => {
  if (!existingImagesBox) return

  const active = existingImages.filter((img) => !img.removed)

  if (!active.length) {
    existingImagesBox.innerHTML = `<div class="empty-row">Mavjud rasm yo‘q</div>`
    return
  }

  existingImagesBox.innerHTML = active.map((item) => {
    return `
      <div class="preview-card">
        <img src="${item.url}" alt="">
        <button class="preview-remove" data-remove-old="${item.url}" type="button"><i class="fa-solid fa-trash"></i></button>
        <div class="preview-name">Mavjud rasm</div>
      </div>
    `
  }).join("")
}

const fillForm = (p) => {
  if (productId) productId.value = p?.id || ""
  if (nameInput) nameInput.value = p?.name || ""
  if (priceInput) priceInput.value = p?.price ?? ""
  if (categoryInput) categoryInput.value = p?.category || ""
  if (aboutInput) aboutInput.value = p?.about || ""

  clearSelectedFiles()
  existingImages = Array.isArray(p?.images) ? p.images.map((url) => ({ url, removed: false })) : []
  renderExistingImages()
}

const openCreate = () => {
  if (formModalTitle) formModalTitle.textContent = "Yangi tovar"
  fillForm(null)
  if (formStatus) formStatus.textContent = ""
  window.ProductPage?.setSelectedProduct?.(null)
  window.ProductPage?.openModal?.(productFormModal)
}

const openEdit = (p) => {
  if (formModalTitle) formModalTitle.textContent = "Tovarni tahrirlash"
  fillForm(p)
  if (formStatus) formStatus.textContent = ""
  window.ProductPage?.setSelectedProduct?.(p)
  window.ProductPage?.openModal?.(productFormModal)
}

const uploadFiles = async (files) => {
  const uploadedUrls = []

  for (const file of files) {
    const filePath = makeFilePath(file)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { upsert: false })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
    uploadedUrls.push(data.publicUrl)
  }

  return uploadedUrls
}

const saveImages = async (pid, urls) => {
  const { error: delError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", pid)

  if (delError) throw delError

  if (!urls.length) return

  const rows = urls.map((url, index) => ({
    product_id: pid,
    path: url,
    sort_order: index
  }))

  const { error } = await supabase.from("product_images").insert(rows)
  if (error) throw error
}

const onSubmit = async (e) => {
  e.preventDefault()
  if (formStatus) formStatus.textContent = "Saqlanmoqda..."

  const id = productId?.value || null
  const payload = {
    name: nameInput?.value.trim() || "",
    about: aboutInput?.value.trim() || "",
    price: Number(priceInput?.value || 0),
    category: categoryInput?.value || ""
  }

  try {
    const uploadedUrls = selectedFiles.length
      ? await uploadFiles(selectedFiles.map((x) => x.file))
      : []

    const keptOldUrls = existingImages.filter((img) => !img.removed).map((img) => img.url)
    const finalUrls = [...keptOldUrls, ...uploadedUrls]

    if (!id) {
      const { data, error } = await supabase
        .from("products")
        .insert([payload])
        .select("id")
        .single()

      if (error) throw error
      await saveImages(data.id, finalUrls)
    } else {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id)

      if (error) throw error
      await saveImages(id, finalUrls)
    }

    if (formStatus) formStatus.textContent = "Saqlandi"
    window.ProductPage?.closeModal?.(productFormModal)

    clearSelectedFiles()
    existingImages = []
    renderExistingImages()

    await window.ProductPage?.loadProducts?.()
  } catch (err) {
    console.error(err)
    if (formStatus) formStatus.textContent = "Xatolik!"
  }
}

window.ProductForm = {
  openCreate,
  openEdit
}

imgFileInput?.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  const mapped = files.map((file) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    preview: URL.createObjectURL(file)
  }))

  selectedFiles = [...selectedFiles, ...mapped]
  imgFileInput.value = ""
  renderSelectedFiles()
})

selectedFilesPreview?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-new]")
  if (!btn) return

  const id = btn.getAttribute("data-remove-new")
  const found = selectedFiles.find((x) => x.id === id)

  if (found) {
    try {
      URL.revokeObjectURL(found.preview)
    } catch {}
  }

  selectedFiles = selectedFiles.filter((x) => x.id !== id)
  renderSelectedFiles()
})

existingImagesBox?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-old]")
  if (!btn) return

  const url = btn.getAttribute("data-remove-old")
  const found = existingImages.find((x) => x.url === url)
  if (!found) return

  found.removed = true
  renderExistingImages()
})

btnResetForm?.addEventListener("click", () => {
  const selected = window.ProductPage?.getSelectedProduct?.()
  fillForm(selected || null)
  if (formStatus) formStatus.textContent = ""
})

formModalCloseBtn?.addEventListener("click", () => {
  window.ProductPage?.closeModal?.(productFormModal)
})

productForm?.addEventListener("submit", onSubmit)

document.addEventListener("click", (e) => {
  if (e.target === productFormModal) {
    window.ProductPage?.closeModal?.(productFormModal)
  }
})

renderSelectedFiles()
renderExistingImages()