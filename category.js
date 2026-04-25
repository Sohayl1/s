// ==========================================
// صفحة القسم - category.js
// بتعرض منتجات قسم محدد جاي اسمه من رابط الصفحة
// مثال: category.html?name=أقلام
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// نفس إعدادات الـ Firebase اللي في script.js
const firebaseConfig = {
    apiKey: "AIzaSyCKQuF48pvctCNNYq60o2IMNC5XiEHWqpI",
    authDomain: "nourlibrary.firebaseapp.com",
    projectId: "nourlibrary",
    storageBucket: "nourlibrary.firebasestorage.app",
    messagingSenderId: "799366924459",
    appId: "1:799366924459:web:8c02f6f0b98867607f8fee",
    measurementId: "G-MHHYJKL1XS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 1. قراءة اسم القسم من رابط الصفحة
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get('name');

const catTitleEl = document.getElementById('catTitle');
const catBreadcrumbEl = document.getElementById('catBreadcrumb');
const catIconEl = document.getElementById('catIcon');
const catCountEl = document.getElementById('catCount');
const productsGrid = document.getElementById('productsGrid');

if (!categoryName) {
    if (catTitleEl) catTitleEl.textContent = 'القسم غير محدد';
    if (productsGrid) productsGrid.innerHTML = `
        <p style="text-align:center; grid-column:1/-1; padding:50px; color:var(--gray);">
            من فضلك اختر قسم من <a href="index.html" style="color:var(--primary);">الصفحة الرئيسية</a>.
        </p>`;
} else {
    if (catTitleEl) catTitleEl.textContent = categoryName;
    if (catBreadcrumbEl) catBreadcrumbEl.textContent = categoryName;
    document.title = `${categoryName} - مكتبة نور`;
}

// ==========================================
// 2. جلب أيقونة القسم من Firestore (اختياري للتجميل)
// ==========================================
async function loadCategoryInfo() {
    if (!categoryName) return;
    try {
        const q = query(collection(db, "categories"), where("name", "==", categoryName));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
            const cat = docSnap.data();
            if (cat.icon && catIconEl) {
                catIconEl.className = cat.icon;
                catIconEl.style.color = 'var(--primary)';
                catIconEl.style.marginLeft = '10px';
            }
        });
    } catch (e) {
        console.error("Error loading category info:", e);
    }
}

// ==========================================
// 3. جلب منتجات القسم فقط
// ==========================================
async function fetchCategoryProducts() {
    if (!productsGrid || !categoryName) return;

    try {
        // جلب المنتجات اللي الـ category بتاعتها = اسم القسم
        const q = query(
            collection(db, "products"),
            where("category", "==", categoryName),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        productsGrid.innerHTML = '';

        if (querySnapshot.empty) {
            productsGrid.innerHTML = `
                <p style="text-align:center; grid-column:1/-1; padding:50px; color:var(--gray);">
                    <i class="fa-solid fa-box-open" style="font-size:2.5rem; color:var(--gray-light); margin-bottom:15px;"></i><br>
                    لا توجد منتجات في قسم "<strong>${categoryName}</strong>" حالياً.
                </p>`;
            if (catCountEl) catCountEl.textContent = '0 منتج';
            return;
        }

        let count = 0;
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            count++;
            productsGrid.innerHTML += `
                <div class="card" data-id="${doc.id}" data-category="${product.category}">
                    <a href="product.html?id=${doc.id}" class="product-link">
                        <div class="product-img" style="background-image: url('${product.imageUrl}'); background-size: cover; background-position: center;"></div>
                    </a>
                    <div class="card-content">
                        <a href="product.html?id=${doc.id}" class="product-link">
                            <h3>${product.name}</h3>
                        </a>
                        <p class="brand"><i class="fa-solid fa-tag"></i> الماركة: ${product.brand || '-'}</p>
                        <div class="card-footer">
                            <span class="price">${product.price} ج.م</span>
                            <button class="add-to-cart-btn"><i class="fa-solid fa-cart-plus"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });

        if (catCountEl) catCountEl.textContent = `${count} منتج`;

        // ربط أزرار "إضافة للسلة" بنفس منطق script.js لو موجود
        if (typeof window.attachAddToCartEvents === 'function') {
            window.attachAddToCartEvents();
        } else {
            // ربط بسيط لو الدالة مش متاحة
            attachLocalAddToCart();
        }

        // تفعيل البحث داخل القسم
        setupSearch();

    } catch (error) {
        console.error("Error fetching category products:", error);
        productsGrid.innerHTML = `
            <p style="text-align:center; grid-column:1/-1; padding:50px; color:var(--danger);">
                حدث خطأ أثناء تحميل المنتجات. حاول مرة أخرى.
            </p>`;
    }
}

// ==========================================
// 4. ربط احتياطي لأزرار السلة (لو script.js مش بيشتغل قبلها)
// ==========================================
function attachLocalAddToCart() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const card = this.closest('.card');
            const productData = {
                id: card.getAttribute('data-id'),
                name: card.querySelector('h3').textContent,
                price: parseInt(card.querySelector('.price').textContent.replace(/\D/g, '')),
                image: card.querySelector('.product-img').style.backgroundImage.slice(5, -2).replace(/"/g, ""),
                quantity: 1
            };

            // قراءة السلة من localStorage
            let cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const idx = cart.findIndex(it => it.id === productData.id);
            if (idx > -1) cart[idx].quantity += 1;
            else cart.push(productData);
            localStorage.setItem('cart', JSON.stringify(cart));

            // تحديث العداد في الهيدر
            const badge = document.querySelector('.cart-badge');
            if (badge) badge.textContent = cart.reduce((s, it) => s + it.quantity, 0);

            // تأثير زرار صح
            const original = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => { this.innerHTML = original; }, 1000);
        });
    });
}

// ==========================================
// 5. البحث داخل القسم
// ==========================================
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim().toLowerCase();
        document.querySelectorAll('#productsGrid .card').forEach(card => {
            const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const brand = card.querySelector('.brand')?.textContent.toLowerCase() || '';
            card.style.display = (title.includes(term) || brand.includes(term)) ? 'block' : 'none';
        });
    });
}

// ==========================================
// 6. شريط الأقسام في الأعلى (للتنقل السريع بين الأقسام)
// ==========================================
async function loadCategoriesBar() {
    const slider = document.getElementById('categoriesSlider');
    if (!slider) return;

    try {
        const snap = await getDocs(collection(db, "categories"));
        snap.forEach((docSnap) => {
            const cat = docSnap.data();
            const isActive = cat.name === categoryName ? 'active' : '';
            slider.innerHTML += `
                <a href="category.html?name=${encodeURIComponent(cat.name)}" class="sub-cat ${isActive}" style="text-decoration:none;">
                    <i class="${cat.icon}"></i> ${cat.name}
                </a>
            `;
        });
    } catch (e) {
        console.error("Error loading categories bar:", e);
    }
}

// ==========================================
// تشغيل
// ==========================================
loadCategoryInfo();
fetchCategoryProducts();
loadCategoriesBar();
