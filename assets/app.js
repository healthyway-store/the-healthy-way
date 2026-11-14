/* The Healthy Way — front-end store logic */
(function () {
  "use strict";

  const grid = document.getElementById("product-grid");
  const modal = document.getElementById("checkout-modal");
  const form = document.getElementById("checkout-form");
  const payBtn = document.getElementById("pay-btn");
  const errorEl = document.getElementById("checkout-error");
  let selectedProduct = null;

  document.getElementById("year").textContent = new Date().getFullYear();

  function zar(amount) {
    return "R" + amount.toFixed(2).replace(/\.00$/, "");
  }

  function renderProducts() {
    grid.innerHTML = PRODUCTS.map(function (p) {
      return (
        '<article class="product-card">' +
        (p.badge ? '<span class="product-badge">' + p.badge + "</span>" : "") +
        '<div class="product-emoji">' + p.emoji + "</div>" +
        "<h3>" + p.title + "</h3>" +
        '<p class="desc">' + p.description + "</p>" +
        '<div class="product-price">' + zar(p.price) + " <span>ZAR</span></div>" +
        '<button class="btn btn-primary" data-buy="' + p.id + '">Buy &amp; download</button>' +
        "</article>"
      );
    }).join("");
  }

  grid.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-buy]");
    if (!btn) return;
    selectedProduct = PRODUCTS.find(function (p) { return p.id === btn.dataset.buy; });
    document.getElementById("modal-title").textContent =
      "Checkout — " + selectedProduct.title + " (" + zar(selectedProduct.price) + ")";
    errorEl.hidden = true;
    modal.hidden = false;
    form.elements.first_name.focus();
  });

  function closeModal() { modal.hidden = true; }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  /**
   * 1. Ask our serverless function to build a signed PayFast payment request.
   * 2. Submit a hidden form so the browser POSTs the buyer to PayFast's
   *    hosted payment page (card, EFT, SnapScan).
   * The merchant credentials never touch the browser.
   */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    payBtn.disabled = true;
    payBtn.textContent = "Contacting PayFast…";
    errorEl.hidden = true;

    fetch("/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedProduct.id,
        firstName: form.elements.first_name.value.trim(),
        lastName: form.elements.last_name.value.trim(),
        email: form.elements.email.value.trim(),
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Could not start checkout. Please try again.");
        return res.json();
      })
      .then(function (data) {
        // Build & submit the hidden PayFast form
        const pf = document.createElement("form");
        pf.method = "POST";
        pf.action = data.action; // sandbox or live PayFast process URL
        Object.keys(data.fields).forEach(function (key) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = data.fields[key];
          pf.appendChild(input);
        });
        document.body.appendChild(pf);
        pf.submit();
      })
      .catch(function (err) {
        payBtn.disabled = false;
        payBtn.textContent = "Proceed to secure payment";
        errorEl.textContent = err.message || "Something went wrong. Please try again.";
        errorEl.hidden = false;
      });
  });

  renderProducts();
})();
