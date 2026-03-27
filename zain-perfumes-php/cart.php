<?php
// zain-perfumes-php/cart.php
session_start();
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>سلة التسوق - زين للعطور</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .cart-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; box-shadow: var(--shadow); }
        .btn-checkout { background: var(--accent); color: white; padding: 15px 40px; border: none; border-radius: 10px; font-size: 1.2rem; cursor: pointer; width: 100%; margin-top: 30px; text-decoration: none; display: block; text-align: center; }
    </style>
</head>
<body>
    <nav><a href="index.php" class="logo">ZAIN PERFUMES</a></nav>

    <div class="container">
        <h1 class="section-title">سلة التسوق</h1>
        <div id="cart-container"></div>
        <div id="cart-summary" style="margin-top: 30px; text-align: left; font-size: 1.5rem; font-weight: bold;"></div>
        <a href="checkout.php" class="btn-checkout">الذهاب للدفع</a>
    </div>

    <script>
        function loadCart() {
            let cart = JSON.parse(localStorage.getItem('zain_cart') || '[]');
            const container = document.getElementById('cart-container');
            const summary = document.getElementById('cart-summary');
            
            if (cart.length === 0) {
                container.innerHTML = "<p style='text-align:center;'>السلة فارغة حالياً.</p>";
                return;
            }

            let total = 0;
            container.innerHTML = "";
            cart.forEach((item, index) => {
                total += item.price;
                container.innerHTML += `
                    <div class="cart-item">
                        <div>
                            <h3>${item.name}</h3>
                            <p>${item.size !== 'standard' ? 'الحجم: ' + item.size : ''}</p>
                        </div>
                        <div style="text-align: left;">
                            <p style="font-weight: bold;">${item.price} ج.م</p>
                            <button onclick="removeItem(${index})" style="color: red; border:none; background:none; cursor:pointer;">حذف</button>
                        </div>
                    </div>
                `;
            });
            summary.innerText = "الإجمالي: " + total + " ج.م";
        }

        function removeItem(index) {
            let cart = JSON.parse(localStorage.getItem('zain_cart') || '[]');
            cart.splice(index, 1);
            localStorage.setItem('zain_cart', JSON.stringify(cart));
            loadCart();
        }

        loadCart();
    </script>
</body>
</html>
