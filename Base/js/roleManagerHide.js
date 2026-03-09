export const hideForManager = () => {

  const role = localStorage.getItem("user_role")

  if (!role) return

  if (role === "manager") {

    const elements = document.querySelectorAll(".hide-for-manager")

    elements.forEach((el) => {
      el.classList.add("role_hidden")
    })

  }

}