<?php
require_once __DIR__ . '/includes/db.php';
$page_title = 'Checkout';
include __DIR__ . '/includes/header.php';
?>

<div class="page-banner">
    <div class="container">
        <span class="section-label">Almost There</span>
        <h1 class="section-title">Checkout</h1>
    </div>
</div>

<div class="container-xl px-4 py-16">
    <div class="row g-8" id="checkoutContent">

        <!-- Form -->
        <div class="col-lg-7">
            <div class="bg-white p-6" style="border-top:3px solid #C9A96E;">
                <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:400;margin-bottom:2rem;">Delivery Information</h2>
                <form id="checkoutForm">
                    <div class="row g-4">
                        <div class="col-12">
                            <label class="fw-semibold mb-1 d-block" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;color:#888;">Full Name *</label>
                            <input type="text" id="custName" class="form-control form-input-gold" required placeholder="Your full name">
                        </div>
                        <div class="col-md-6">
                            <label class="fw-semibold mb-1 d-block" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;color:#888;">Phone Number *</label>
                            <input type="tel" id="custPhone" class="form-control form-input-gold" required placeholder="01xxxxxxxxx">
                        </div>
                        <div class="col-md-6">
                            <label class="fw-semibold mb-1 d-block" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;color:#888;">City *</label>
                            <input type="text" id="custCity" class="form-control form-input-gold" required placeholder="Cairo">
                        </div>
                        <div class="col-12">
                            <label class="fw-semibold mb-1 d-block" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;color:#888;">Full Address *</label>
                            <textarea id="custAddress" class="form-control form-input-gold" rows="3" required placeholder="Street name, building, floor, apartment..."></textarea>
                        </div>
                    </div>

                    <hr style="border-color:#e8e0d0;margin:2rem 0;">

                    <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;margin-bottom:1.5rem;">Payment Method</h2>
                    <div class="d-flex align-items-center gap-3 p-4 border" style="border-color:#C9A96E !important;background:#fdf9f4;">
                        <i class="fa-solid fa-money-bill-wave fa-lg" style="color:#C9A96E;"></i>
                        <div>
                            <div class="fw-bold" style="font-size:0.88rem;text-transform:uppercase;letter-spacing:0.1em;">Cash on Delivery</div>
                            <div style="font-size:0.78rem;color:#888;">Pay when your order arrives</div>
                        </div>
                        <i class="fa-solid fa-circle-check ms-auto" style="color:#C9A96E;font-size:1.2rem;"></i>
                    </div>

                    <button type="submit" id="submitBtn" class="btn-zain-gold w-100 border-0 mt-4" style="cursor:pointer;padding:1rem;">
                        <i class="fa-solid fa-lock me-2"></i> Place Order
                    </button>
                </form>
            </div>
        </div>

        <!-- Summary -->
        <div class="col-lg-5">
            <div style="background:#0a0a0a;padding:2rem;position:sticky;top:100px;border-top:3px solid #C9A96E;">
                <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:400;color:#fff;margin-bottom:1.5rem;">Order Summary</h2>
                <div id="summaryItems" style="border-bottom:1px solid #1f1f1f;padding-bottom:1.5rem;margin-bottom:1.5rem;max-height:360px;overflow-y:auto;"></div>
                <div class="d-flex justify-content-between mb-2" style="font-size:0.85rem;color:#888;">
                    <span>Subtotal</span>
                    <span id="summarySubtotal" style="color:#fff;">LE 0.00</span>
                </div>
                <div class="d-flex justify-content-between mb-3" style="font-size:0.85rem;color:#888;">
                    <span>Shipping</span>
                    <span style="color:#fff;">COD</span>
                </div>
                <div class="d-flex justify-content-between" style="font-size:1.1rem;font-weight:700;color:#fff;border-top:1px solid #1f1f1f;padding-top:1rem;">
                    <span>Total</span>
                    <span id="summaryTotal" style="color:#C9A96E;">LE 0.00</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Success State -->
    <div id="successState" class="text-center py-20 d-none">
        <div class="mb-5" style="width:96px;height:96px;background:rgba(201,169,110,0.15);border:2px solid #C9A96E;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;">
            <i class="fa-solid fa-check fa-2x" style="color:#C9A96E;"></i>
        </div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:3rem;font-weight:300;margin-bottom:1rem;">Order Confirmed!</h2>
        <p style="color:#888;font-size:0.9rem;max-width:480px;margin:0 auto 2.5rem;line-height:1.8;">
            Thank you for your order. We'll contact you shortly to confirm delivery details.
        </p>
        <a href="/shop.php" class="btn-zain-outline">Continue Shopping</a>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const cart = JSON.parse(localStorage.getItem('zain_cart') || '[]');
    const summaryItems = document.getElementById('summaryItems');
    const subtotalEl = document.getElementById('summarySubtotal');
    const totalEl = document.getElementById('summaryTotal');

    if (cart.length === 0) {
        summaryItems.innerHTML = '<p style="color:#555;font-size:0.85rem;">Your cart is empty.</p>';
        return;
    }

    let total = 0;
    let html = '';
    cart.forEach(item => {
        total += item.price * item.qty;
        html += `<div class="d-flex align-items-center gap-3 mb-3">
            <div style="position:relative;width:48px;height:60px;flex-shrink:0;">
                <span style="position:absolute;top:-6px;right:-6px;background:#C9A96E;color:#0a0a0a;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;z-index:1;">${item.qty}</span>
                <img src="${item.img || ''}" style="width:100%;height:100%;object-fit:cover;border:1px solid #1f1f1f;" alt="">
            </div>
            <div style="flex:1;font-size:0.82rem;color:#ccc;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">${item.name}</div>
            <div style="font-weight:700;color:#C9A96E;font-size:0.85rem;">LE ${(item.price * item.qty).toFixed(2)}</div>
        </div>`;
    });

    summaryItems.innerHTML = html;
    subtotalEl.textContent = 'LE ' + total.toFixed(2);
    totalEl.textContent = 'LE ' + total.toFixed(2);

    document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Processing...';

        const orderData = {
            customer_name: document.getElementById('custName').value,
            customer_phone: document.getElementById('custPhone').value,
            shipping_address: document.getElementById('custCity').value + ', ' + document.getElementById('custAddress').value,
            total: total,
            items: cart
        };

        try {
            const res = await fetch('/api/place-order.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            const data = await res.json();
            if (data.success) {
                localStorage.removeItem('zain_cart');
                document.getElementById('checkoutContent').style.display = 'none';
                document.getElementById('successState').classList.remove('d-none');
                window.scrollTo(0, 0);
            } else {
                alert('Error: ' + data.message);
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-lock me-2"></i> Place Order';
            }
        } catch (err) {
            alert('Network error. Please try again.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-lock me-2"></i> Place Order';
        }
    });
});
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
