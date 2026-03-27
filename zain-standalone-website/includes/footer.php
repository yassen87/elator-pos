<?php // includes/footer.php ?>

<!-- Footer -->
<footer style="background:#0a0a0a; color:#fff; border-top: 3px solid #C9A96E;" class="pt-14 pb-6 mt-16">
    <div class="container-xl">
        <div class="row g-5 mb-10">
            <!-- Brand -->
            <div class="col-md-4">
                <h3 class="fw-bold text-uppercase mb-3" style="font-family:'Cormorant Garamond',serif; font-size:1.8rem; letter-spacing:0.2em; color:#C9A96E;">
                    Zain Perfumes
                </h3>
                <p style="color:#9a9a9a; font-size:0.85rem; line-height:1.8;">
                    Creating memories that last forever through our exclusive collection of luxury niche fragrances. Experience the art of perfumery.
                </p>
                <div class="d-flex gap-3 mt-4">
                    <a href="#" class="text-decoration-none" style="color:#C9A96E; font-size:1.2rem;"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="text-decoration-none" style="color:#C9A96E; font-size:1.2rem;"><i class="fab fa-facebook"></i></a>
                    <a href="#" class="text-decoration-none" style="color:#C9A96E; font-size:1.2rem;"><i class="fab fa-tiktok"></i></a>
                    <a href="#" class="text-decoration-none" style="color:#C9A96E; font-size:1.2rem;"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>

            <!-- Navigation -->
            <div class="col-6 col-md-2">
                <h6 class="fw-bold text-uppercase mb-4" style="color:#C9A96E; letter-spacing:0.15em; font-size:0.78rem;">Shop</h6>
                <ul class="list-unstyled" style="font-size:0.85rem;">
                    <li class="mb-2"><a href="/shop.php" style="color:#9a9a9a; text-decoration:none;" class="footer-link">New Arrivals</a></li>
                    <li class="mb-2"><a href="/shop.php" style="color:#9a9a9a; text-decoration:none;" class="footer-link">Best Sellers</a></li>
                    <li class="mb-2"><a href="/shop.php" style="color:#9a9a9a; text-decoration:none;" class="footer-link">Niche Collection</a></li>
                    <li class="mb-2"><a href="/shop.php" style="color:#9a9a9a; text-decoration:none;" class="footer-link">Oriental Oud</a></li>
                </ul>
            </div>

            <!-- Info -->
            <div class="col-6 col-md-2">
                <h6 class="fw-bold text-uppercase mb-4" style="color:#C9A96E; letter-spacing:0.15em; font-size:0.78rem;">Info</h6>
                <ul class="list-unstyled" style="font-size:0.85rem;">
                    <li class="mb-2"><a href="/about.php" style="color:#9a9a9a; text-decoration:none;">About Us</a></li>
                    <li class="mb-2"><a href="/contact.php" style="color:#9a9a9a; text-decoration:none;">Contact Us</a></li>
                </ul>
            </div>

            <!-- Newsletter -->
            <div class="col-md-4">
                <h6 class="fw-bold text-uppercase mb-4" style="color:#C9A96E; letter-spacing:0.15em; font-size:0.78rem;">Newsletter</h6>
                <p style="color:#9a9a9a; font-size:0.85rem; margin-bottom:1rem;">Subscribe to receive exclusive offers and new arrivals.</p>
                <div class="d-flex" style="border-bottom: 1px solid #444; padding-bottom: 0.5rem;">
                    <input type="email" placeholder="your@email.com" class="border-0 bg-transparent text-white flex-grow-1 outline-none" style="font-size:0.85rem; outline:none;">
                    <button style="background:none; border:none; color:#C9A96E; font-weight:700; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer;">Subscribe</button>
                </div>
            </div>
        </div>

        <hr style="border-color:#2a2a2a;">
        <div class="text-center" style="color:#555; font-size:0.8rem;">
            &copy; <?= date('Y') ?> Zain Perfumes | زين للعطور. All Rights Reserved.
        </div>
    </div>
</footer>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<!-- Main App JS -->
<script src="/assets/js/main.js"></script>
</body>
</html>
