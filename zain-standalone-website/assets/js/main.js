// assets/js/main.js — Zain Perfumes Cart Logic

let cart = JSON.parse(localStorage.getItem('zain_cart') || '[]');

// =============
// CART SIDEBAR
// =============
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotal');
    const badgeEl = document.getElementById('cartBadge');

    let totalItems = cart.reduce((s, i) => s + i.qty, 0);
    if (badgeEl) badgeEl.textContent = totalItems;

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fa-solid fa-basket-shopping fa-3x mb-3" style="color:#C9A96E;opacity:0.5;"></i>
                <p class="text-muted mb-0" style="font-size:0.85rem;">Your cart is empty</p>
            </div>`;
        if (totalEl) totalEl.textContent = 'LE 0.00';
        return;
    }

    let total = 0;
    let html = '';
    cart.forEach(item => {
        total += item.price * item.qty;
        html += `
            <div class="d-flex gap-3 mb-4 pb-4" style="border-bottom:1px solid #f0ede7;">
                <img src="${item.img || '/assets/images/placeholder.jpg'}" class="cart-item-img" alt="${item.name}">
                <div class="flex-grow-1">
                    <div class="fw-bold mb-1" style="font-size:0.82rem;text-transform:uppercase;letter-spacing:0.06em;">${item.name}</div>
                    <div style="font-size:0.85rem;color:#C9A96E;font-weight:700;">LE ${item.price}.00</div>
                    <div class="d-flex align-items-center gap-2 mt-2">
                        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
                        <span style="font-size:0.85rem;font-weight:700;width:24px;text-align:center;">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                        <button onclick="removeFromCart(${item.id})" style="background:none;border:none;color:#999;font-size:0.75rem;margin-left:0.5rem;cursor:pointer;text-transform:uppercase;letter-spacing:0.08em;" class="hover-gold p-0">Remove</button>
                    </div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
    if (totalEl) totalEl.textContent = `LE ${total.toFixed(2)}`;
}

window.addToCart = function(id, name, price, img) {
    const existing = cart.find(i => i.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id, name, price: parseFloat(price), img, qty: 1 });
    }
    localStorage.setItem('zain_cart', JSON.stringify(cart));
    renderCart();

    // Flash notification
    const toast = document.createElement('div');
    toast.innerHTML = `<i class="fa-solid fa-check me-2"></i> "${name}" added to cart`;
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:#0a0a0a;color:#C9A96E;padding:0.85rem 1.5rem;font-size:0.82rem;font-weight:700;border:1px solid #C9A96E;z-index:9999;letter-spacing:0.08em;transition:opacity 0.5s;`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 2500);

    // Open cart
    document.getElementById('cartSidebar')?.classList.add('active');
    document.getElementById('cartOverlay')?.classList.add('active');
};

window.changeQty = function(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += change;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    localStorage.setItem('zain_cart', JSON.stringify(cart));
    renderCart();
};

window.removeFromCart = function(id) {
    cart = cart.filter(i => i.id !== id);
    localStorage.setItem('zain_cart', JSON.stringify(cart));
    renderCart();
};

// Init on load
document.addEventListener('DOMContentLoaded', renderCart);
