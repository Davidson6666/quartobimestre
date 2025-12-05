document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("becomeSellerForm");
  const submitBtn = document.getElementById("submitBtn");
  const errorMessage = document.getElementById("errorMessage");
  const successMessage = document.getElementById("successMessage");
  const backBtn = document.getElementById("backBtn");

  if (!form) return;

  // Handle back button
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      routeTo("index.html");
    });
  }

  const hideMessage = (el) => {
    if (!el) return;
    el.style.display = "none";
    el.textContent = "";
  };
  const showMessage = (el, msg) => {
    if (!el) return;
    el.style.display = "block";
    el.textContent = msg;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage(errorMessage);
    hideMessage(successMessage);

    const sigla = document.getElementById("sigla").value.trim();
    if (!sigla) {
      showMessage(errorMessage, "Por favor, informe a sigla.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      const res = await api.becomeSeller(sigla);
      // api.request wrapper returns parsed JSON for OK; otherwise throws
      showMessage(
        successMessage,
        res.message || "Agora você é vendedor! Redirecionando..."
      );

      // small delay then go to seller dashboard
      setTimeout(() => {
        // refresh user data saved in localStorage - get profile
        fetch("http://localhost:3000/api/users/profile", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data && data.user) {
              localStorage.setItem("user", JSON.stringify(data.user));
            }
            routeTo("pages/seller-dashboard.html");
          })
          .catch(() => routeTo("pages/seller-dashboard.html"));
      }, 900);
    } catch (err) {
      console.error("Erro ao solicitar tornar-se vendedor", err);
      const msg =
        err && err.message ? err.message : "Erro ao processar a solicitação";
      showMessage(errorMessage, msg);
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";
    }
  });
});
