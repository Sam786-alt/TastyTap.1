/* ---------- Data ---------- */
const MENU = [
  { id: 1, name: "Chicken Biryani",  cat: "Desi",    price: 450, emoji: "🍛", desc: "Fragrant rice with spiced chicken and raita." },
  { id: 2, name: "Chicken Karahi",   cat: "Desi",    price: 1100, emoji: "🍲", desc: "Wok-cooked chicken with tomato and green chilli." },
  { id: 3, name: "Seekh Kabab Roll", cat: "Fast Food", price: 320, emoji: "🌯", desc: "Juicy seekh kabab, onions and chutney in a paratha." },
  { id: 4, name: "Zinger Burger",    cat: "Fast Food", price: 520, emoji: "🍔", desc: "Crispy chicken fillet with lettuce and mayo." },
  { id: 5, name: "Loaded Fries",     cat: "Fast Food", price: 380, emoji: "🍟", desc: "Fries with cheese sauce and jalapeños." },
  { id: 6, name: "Pepperoni Pizza",  cat: "Pizza",   price: 1250, emoji: "🍕", desc: "12-inch pizza with mozzarella and pepperoni." },
  { id: 7, name: "Fajita Pizza",     cat: "Pizza",   price: 1150, emoji: "🍕", desc: "Chicken fajita, peppers and olives." },
  { id: 8, name: "Gulab Jamun (4)",  cat: "Dessert", price: 250, emoji: "🍡", desc: "Warm milk-solid dumplings in sugar syrup." },
  { id: 9, name: "Kulfi",            cat: "Dessert", price: 180, emoji: "🍦", desc: "Traditional creamy frozen dessert." },
  { id: 10, name: "Mint Margarita",  cat: "Drinks",  price: 220, emoji: "🥤", desc: "Cool mint and lemon drink." },
  { id: 11, name: "Doodh Patti Chai", cat: "Drinks", price: 120, emoji: "☕", desc: "Strong milky tea, the classic way." },
  { id: 12, name: "Cold Drink 500ml", cat: "Drinks", price: 100, emoji: "🥤", desc: "Chilled soft drink." }
];
const DELIVERY_FEE = 150;
const CATS = ["All", ...new Set(MENU.map(m => m.cat))];
const SCREENS = ["menu", "cart", "checkout", "payment", "confirm", "track"];

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rs = n => "Rs " + n.toLocaleString("en-PK");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
};

/* ---------- State ---------- */
let cart = store.get("tt_cart", {});          // { itemId: qty }
let orders = store.get("tt_orders", {});      // { orderId: order }
let state = { cat: "All", q: "", sort: "popular", customer: null, currentOrderId: null, cancelTarget: null };

/* ---------- Navigation ---------- */
function showScreen(id) {
  SCREENS.forEach(s => { $("#" + s).hidden = s !== id; });
  if (id === "menu") renderMenu();
  if (id === "cart") renderCart();
  if (id === "payment") renderPayTotal();
  window.scrollTo(0, 0);
  const h = $("#" + id).querySelector("h1, h2");
  if (h) h.focus();
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- Cart logic ---------- */
function cartCount() { return Object.values(cart).reduce((a, b) => a + b, 0); }
function subtotal() {
  return Object.entries(cart).reduce((sum, [id, q]) => sum + MENU.find(m => m.id == id).price * q, 0);
}
function saveCart() { store.set("tt_cart", cart); updateCartBadge(); }
function updateCartBadge() { $("#cartCount").textContent = cartCount(); }
function changeQty(id, delta) {
  const q = (cart[id] || 0) + delta;
  if (q <= 0) delete cart[id]; else cart[id] = q;
  saveCart();
}

/* ---------- Menu screen ---------- */
function renderChips() {
  $("#chips").innerHTML = CATS.map(c =>
    `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.cat}">${esc(c)}</button>`).join("");
}

function renderMenu() {
  renderChips();
  let items = MENU.filter(m =>
    (state.cat === "All" || m.cat === state.cat) &&
    (m.name + " " + m.desc).toLowerCase().includes(state.q.toLowerCase()));
  if (state.sort === "low") items.sort((a, b) => a.price - b.price);
  if (state.sort === "high") items.sort((a, b) => b.price - a.price);

  $("#menuGrid").innerHTML = items.length ? items.map(m => {
    const q = cart[m.id] || 0;
    const control = q
      ? `<div class="stepper">
           <button data-dec="${m.id}" aria-label="Remove one ${esc(m.name)}">−</button>
           <strong>${q}</strong>
           <button data-inc="${m.id}" aria-label="Add one ${esc(m.name)}">+</button>
         </div>`
      : `<button class="btn primary" data-add="${m.id}">Add to cart</button>`;
    return `<article class="card">
      <div class="emoji" aria-hidden="true">${m.emoji}</div>
      <h3>${esc(m.name)}</h3>
      <p>${esc(m.desc)}</p>
      <div class="price">${rs(m.price)}</div>
      ${control}
    </article>`;
  }).join("") : `<p class="empty">No food matches your search. Try another word or category.</p>`;

  const n = cartCount();
  $("#stickyBar").hidden = n === 0;
  $("#stickyText").textContent = `${n} item${n === 1 ? "" : "s"} · ${rs(subtotal())}`;
}

/* ---------- Cart screen ---------- */
function summaryHTML() {
  const sub = subtotal();
  return `<div><span>Subtotal</span><span>${rs(sub)}</span></div>
          <div><span>Delivery fee</span><span>${rs(DELIVERY_FEE)}</span></div>
          <div class="total"><span>Total</span><span>${rs(sub + DELIVERY_FEE)}</span></div>`;
}

function renderCart() {
  const ids = Object.keys(cart);
  $("#cartList").innerHTML = ids.length ? ids.map(id => {
    const m = MENU.find(x => x.id == id);
    return `<div class="cart-item">
      <div><strong>${m.emoji} ${esc(m.name)}</strong><br><span class="price">${rs(m.price * cart[id])}</span></div>
      <div class="stepper">
        <button data-dec="${id}" aria-label="Remove one ${esc(m.name)}">−</button>
        <strong>${cart[id]}</strong>
        <button data-inc="${id}" aria-label="Add one ${esc(m.name)}">+</button>
      </div>
    </div>`;
  }).join("") : `<p class="empty">Your cart is empty.</p>`;
  $("#cartSummary").hidden = ids.length === 0;
  $("#cartSummary").innerHTML = summaryHTML();
  $("#toCheckout").disabled = ids.length === 0;
}

/* ---------- Validation ---------- */
function setError(inputId, errId, msg) {
  $("#" + errId).textContent = msg;
  const el = $("#" + inputId);
  el.classList.toggle("invalid", !!msg);
  el.setAttribute("aria-invalid", msg ? "true" : "false");
  return !msg;
}
const validName = v => v.trim().length >= 3;
const validPhone = v => /^03\d{9}$/.test(v.trim());
const validAddress = v => v.trim().length >= 8;

$("#checkoutForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#cName").value, phone = $("#cPhone").value, address = $("#cAddress").value;
  const ok = [
    setError("cName", "eName", validName(name) ? "" : "Please enter your full name (3+ letters)."),
    setError("cPhone", "ePhone", validPhone(phone) ? "" : "Enter a valid mobile number like 03001234567."),
    setError("cAddress", "eAddress", validAddress(address) ? "" : "Please enter a complete delivery address.")
  ].every(Boolean);
  if (!ok) return;
  state.customer = { name: name.trim(), phone: phone.trim(), address: address.trim(), note: $("#cNote").value.trim() };
  showScreen("payment");
});

/* ---------- Payment ---------- */
function renderPayTotal() { $("#payTotal").innerHTML = summaryHTML(); togglePayFields(); }
function togglePayFields() {
  const method = $("input[name=pay]:checked").value;
  $("#cardFields").hidden = method !== "Card";
}
$$("input[name=pay]").forEach(r => r.addEventListener("change", togglePayFields));
$("#cardNo").addEventListener("input", e => {
  const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
  e.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
});

$("#payForm").addEventListener("submit", e => {
  e.preventDefault();
  const method = $("input[name=pay]:checked").value;
  if (method === "Card") {
    const digits = $("#cardNo").value.replace(/\D/g, "");
    if (!setError("cardNo", "eCard", digits.length === 16 ? "" : "Enter a 16-digit card number.")) return;
  }
  placeOrder(method);
});

function placeOrder(method) {
  const id = "TT-" + Math.floor(10000 + Math.random() * 90000);
  const items = Object.entries(cart).map(([mid, q]) => {
    const m = MENU.find(x => x.id == mid);
    return { name: m.name, qty: q, price: m.price };
  });
  orders[id] = {
    id, items, method,
    total: subtotal() + DELIVERY_FEE,
    customer: state.customer,
    createdAt: Date.now(),
    cancelled: false
  };
  store.set("tt_orders", orders);
  state.currentOrderId = id;
  cart = {}; saveCart();
  $("#payForm").reset(); $("#cardFields").hidden = false;
  renderTicket($("#ticket"), orders[id]);
  showScreen("confirm");
  refreshConfirmButtons();
}

/* ---------- Order status (simulated by elapsed time) ---------- */
const STAGES = ["Placed", "Preparing", "On the way", "Delivered"];
function stageIndex(o) {
  const mins = (Date.now() - o.createdAt) / 60000;
  return mins < 1 ? 0 : mins < 3 ? 1 : mins < 5 ? 2 : 3;
}
function canCancel(o) { return !o.cancelled && stageIndex(o) <= 1; }

function renderTicket(el, o) {
  const idx = stageIndex(o);
  const bar = o.cancelled
    ? `<div class="status"><span class="cancelled">Cancelled</span></div>`
    : `<div class="status">${STAGES.map((s, i) => `<span class="${i <= idx ? "done" : ""}">${s}</span>`).join("")}</div>`;
  el.innerHTML = `
    <h3>Order ${esc(o.id)}</h3>
    ${bar}
    ${o.items.map(i => `<div class="line"><span>${i.qty} × ${esc(i.name)}</span><span>${rs(i.qty * i.price)}</span></div>`).join("")}
    <div class="line"><strong>Total (incl. delivery)</strong><strong>${rs(o.total)}</strong></div>
    <hr>
    <div class="line"><span>Name</span><span>${esc(o.customer.name)}</span></div>
    <div class="line"><span>Phone</span><span>${esc(o.customer.phone)}</span></div>
    <div class="line"><span>Address</span><span>${esc(o.customer.address)}</span></div>
    <div class="line"><span>Payment</span><span>${esc(o.method)}</span></div>`;
}

function refreshConfirmButtons() {
  const o = orders[state.currentOrderId];
  $("#cancelBtn").hidden = !(o && canCancel(o));
}

/* ---------- Cancel flow ---------- */
function askCancel(orderId) {
  state.cancelTarget = orderId;
  const d = $("#confirmDialog");
  if (d.showModal) d.showModal(); else if (confirm("Cancel this order?")) doCancel();
}
function doCancel() {
  const o = orders[state.cancelTarget];
  if (o && canCancel(o)) {
    o.cancelled = true;
    store.set("tt_orders", orders);
    toast("Order cancelled");
  } else {
    toast("Too late to cancel — your food is on the way.");
  }
  if (!$("#confirm").hidden) { renderTicket($("#ticket"), orders[state.currentOrderId]); refreshConfirmButtons(); }
  if (!$("#track").hidden) showTrackResult(state.cancelTarget);
}
$("#cancelBtn").addEventListener("click", () => askCancel(state.currentOrderId));
$("#trackCancel").addEventListener("click", () => askCancel(state.trackedId));
$("#yesCancel").addEventListener("click", () => { $("#confirmDialog").close(); doCancel(); });
$("#keepBtn").addEventListener("click", () => $("#confirmDialog").close());

/* ---------- Track screen ---------- */
function showTrackResult(id) {
  const o = orders[id];
  state.trackedId = id;
  $("#trackResult").hidden = false;
  renderTicket($("#trackResult"), o);
  $("#trackCancel").hidden = !canCancel(o);
}
$("#trackForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("#tId").value.trim().toUpperCase();
  const phone = $("#tPhone").value.trim();
  const o = orders[id];
  if (!o || o.customer.phone !== phone) {
    $("#eTrack").textContent = "No order found. Check your Order ID and mobile number.";
    $("#trackResult").hidden = true; $("#trackCancel").hidden = true;
    return;
  }
  $("#eTrack").textContent = "";
  showTrackResult(id);
});

/* ---------- Event wiring ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.add) { changeQty(t.dataset.add, 1); toast("Added to cart"); renderMenu(); }
  else if (t.dataset.inc) { changeQty(t.dataset.inc, 1); $("#cart").hidden ? renderMenu() : renderCart(); }
  else if (t.dataset.dec) { changeQty(t.dataset.dec, -1); $("#cart").hidden ? renderMenu() : renderCart(); }
  else if (t.dataset.cat) { state.cat = t.dataset.cat; renderMenu(); }
  else if (t.dataset.go) showScreen(t.dataset.go);
});

$("#search").addEventListener("input", e => { state.q = e.target.value; renderMenu(); });
$("#sort").addEventListener("change", e => { state.sort = e.target.value; renderMenu(); });
$("#brand").addEventListener("click", () => showScreen("menu"));
$("#cartBtn").addEventListener("click", () => showScreen("cart"));
$("#viewCart").addEventListener("click", () => showScreen("cart"));
$("#trackBtn").addEventListener("click", () => showScreen("track"));
$("#toCheckout").addEventListener("click", () => showScreen("checkout"));
$("#printBtn").addEventListener("click", () => window.print());
$("#newOrder").addEventListener("click", () => showScreen("menu"));

/* ---------- Dark mode ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $("#themeBtn").textContent = t === "dark" ? "☀️" : "🌙";
  store.set("tt_theme", t);
}
$("#themeBtn").addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

/* ---------- Init ---------- */
applyTheme(store.get("tt_theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
updateCartBadge();
showScreen("menu");
setInterval(() => { // keep order status fresh
  if (!$("#confirm").hidden && state.currentOrderId) { renderTicket($("#ticket"), orders[state.currentOrderId]); refreshConfirmButtons(); }
  if (!$("#track").hidden && state.trackedId && !$("#trackResult").hidden) showTrackResult(state.trackedId);
}, 15000);
