<?php
// includes/header.php
if (!isset($page_title)) $page_title = 'Zain Perfumes';
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> | زين للعطور</title>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            corePlugins: { preflight: false },
            theme: {
                extend: {
                    fontFamily: {
                        serif: ['Cormorant Garamond', 'serif'],
                        sans: ['Montserrat', 'sans-serif'],
                    },
                    colors: {
                        zain: {
                            dark: '#0a0a0a',
                            gold: '#C9A96E',
                            'gold-light': '#E8D5B0',
                            gray: '#6b6b6b',
                            light: '#f8f6f1',
                        }
                    }
                }
            }
        }
    </script>

    <!-- Custom CSS -->
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="bg-white text-zain-dark" style="font-family: 'Montserrat', sans-serif;">

<!-- Announcement Bar -->
<div style="background:#0a0a0a; color:#C9A96E;" class="text-xs font-semibold py-2 text-center tracking-widest uppercase">
    <i class="fa-solid fa-truck-fast me-1"></i> Free Shipping on Orders above 1500 LE &nbsp;|&nbsp; <i class="fa-solid fa-star me-1"></i> Authentic Luxury Fragrances
</div>

<!-- Main Navigation -->
<nav class="navbar navbar-expand-lg bg-white border-bottom" style="position:sticky; top:0; z-index:1050; border-color:#f0ede7 !important;">
    <div class="container-xl">
        <!-- Mobile Menu Toggle -->
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <i class="fa-solid fa-bars text-zain-gold" style="color:#C9A96E;"></i>
        </button>

        <!-- Logo (Center on mobile) -->
        <a class="navbar-brand mx-auto mx-lg-0 fw-bold text-uppercase tracking-widest" href="/index.php" style="font-family:'Cormorant Garamond',serif; font-size:1.5rem; letter-spacing:0.2em; color:#0a0a0a;">
            <span style="color:#C9A96E;">✦</span> Zain Perfumes <span style="color:#C9A96E;">✦</span>
        </a>

        <!-- Desktop Menu -->
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav mx-auto gap-4 text-uppercase fw-semibold" style="font-size:0.8rem; letter-spacing:0.12em;">
                <li class="nav-item"><a class="nav-link text-dark hover-gold" href="/index.php">Home</a></li>
                <li class="nav-item"><a class="nav-link text-dark hover-gold" href="/shop.php">Shop</a></li>
                <li class="nav-item"><a class="nav-link text-dark hover-gold" href="/about.php">About</a></li>
                <li class="nav-item"><a class="nav-link text-dark hover-gold" href="/contact.php">Contact</a></li>
            </ul>
        </div>

        <!-- Icons -->
        <div class="d-flex align-items-center gap-3" style="font-size:1.1rem;">
            <button class="btn btn-link text-dark p-0 hover-gold" onclick="toggleCart()">
                <i class="fa-solid fa-bag-shopping"></i>
                <span id="cartBadge" class="badge rounded-pill ms-1" style="background:#C9A96E;color:#0a0a0a;font-size:0.65rem;">0</span>
            </button>
        </div>
    </div>
</nav>

<!-- Cart Sidebar Overlay -->
<div id="cartOverlay" class="cart-overlay" onclick="toggleCart()"></div>

<!-- Cart Sidebar -->
<div id="cartSidebar" class="cart-sidebar">
    <div class="d-flex justify-content-between align-items-center p-4 border-bottom">
        <h5 class="fw-bold text-uppercase mb-0" style="letter-spacing:0.15em; font-size:0.9rem;">Shopping Cart</h5>
        <button onclick="toggleCart()" class="btn btn-link text-dark p-0"><i class="fa-solid fa-xmark fa-lg"></i></button>
    </div>
    <div id="cartItemsContainer" class="flex-grow-1 overflow-auto p-4" style="max-height:60vh;"></div>
    <div class="p-4 border-top" style="background:#f8f6f1;">
        <div class="d-flex justify-content-between fw-bold mb-3">
            <span>Total:</span>
            <span id="cartTotal" style="color:#C9A96E;">LE 0.00</span>
        </div>
        <a href="/checkout.php" class="btn w-100 fw-bold text-uppercase" style="background:#C9A96E; color:#0a0a0a; letter-spacing:0.12em; padding:0.85rem;">Checkout</a>
    </div>
</div>

<!-- Page content starts after this -->
