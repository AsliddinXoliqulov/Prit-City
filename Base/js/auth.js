import { supabase } from "./supabaseClient.js"

export const getSessionUser = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.user || null
}

export const getMyProfile = async () => {
  const user = await getSessionUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, is_active")
    .eq("id", user.id)
    .single()

  if (error || !data) return null
  return data
}

export const requireRoles = async (roles = []) => {
  const user = await getSessionUser()

  if (!user) {
    location.replace("../../index.html")
    return null
  }

  const profile = await getMyProfile()
  // console.log(profile);


  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut()
    location.replace("../../index.html")
    return null
  }

  if (roles.length && !roles.includes(profile.role)) {
    location.replace("../../Print_Citiy_magazin/html/product.html")
    return null
  }

  return { user, profile }
}

export const logout = async () => {
  await supabase.auth.signOut()
  location.replace("../../index.html")
}
