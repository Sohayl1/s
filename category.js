import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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

// مصفوفة لحفظ منتجات القسم الحالي عشان الفلترة السريعة
let currentCategoryProducts = []; 

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
// 2. جلب أيقونة القسم من Firestore
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
// 3. جلب الأقسام الفرعية وعرضها كفلاتر (الجديد)
// ==========================================
async function loadSubCategoriesBar() {
    const slider = document.getElementById('categoriesSlider');
    if (!slider || !categoryName) return;

    try {
        const q = query(collection(db, "subCategories"), where("parentCategory", "==", categoryName));
        const snap = await getDocs(q);
        
        // زرار "الكل" الأساسي
        slider.innerHTML = `
            <div class="sub-cat active" onclick="window.filterBySubCategory('all', this)" style="cursor:pointer;">
                <i class="fa-solid fa-border-all"></i> الكل
            </div>
        `;

        snap.forEach((docSnap) => {
            const subCat = docSnap.data();
            slider.innerHTML += `
                <div class="sub-cat" onclick="window.filterBySubCategory('${subCat.name}', this)" style="cursor:pointer;">
                    ${subCat.name}
                </div>
            `;
        });
    } catch (e) {
        console.error("Error loading subcategories bar:", e);
    }
}

// دالة الفلترة السريعة (تشتغل لما تدوس على قسم فرعي)
window.filterBySubCategory = function(subCategoryName, element) {
    // تلوين الزرار المختار
    document.querySelectorAll('#categoriesSlider .sub-cat').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // فلترة المنتجات المحملة مسبقاً
    let filteredProducts = currentCategoryProducts;
    if (subCategoryName !== 'all') {
        filteredProducts = currentCategoryProducts.filter(p => p.subCategory === subCategoryName);
    }

    renderProductsHTML(filteredProducts, subCategoryName);
};

// ==========================================
// 4. جلب منتجات القسم الرئيسي
// ==========================================
async function fetchCategoryProducts() {
    if (!productsGrid || !categoryName) return;

    try {
        const q = query(
            collection(db, "products"),
            where("category", "==", categoryName),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        currentCategoryProducts = [];
        querySnapshot.forEach((doc) => {
            let pData = doc.data();
            pData.id = doc.id;
            currentCategoryProducts.push(pData);
        });

        // عرض كل المنتجات في البداية
        renderProductsHTML(currentCategoryProducts, 'all');
        setupSearch();

    } catch (error) {
        console.error("Error fetching category products:", error);
        productsGrid.innerHTML = `
            <p style="text-align:center; grid-column:1/-1; padding:50px; color:var(--danger);">
                حدث خطأ أثناء تحميل المنتجات. حاول مرة أخرى.
            </p>`;
    }
}

// دالة رسم المنتجات في الـ HTML
function renderProductsHTML(productsArray, currentFilter) {
    productsGrid.innerHTML = '';

    if (productsArray.length === 0) {
        productsGrid.innerHTML = `
            <p style="text-align:center; grid-column:1/-1; padding:50px; color:var(--gray);">
                <i class="fa-solid fa-box-open" style="font-size:2.5rem; color:var(--gray-light); margin-bottom:15px;"></i><br>
                لا توجد منتجات في "${currentFilter === 'all' ? categoryName : currentFilter}" حالياً.
            </p>`;
        if (catCountEl) catCountEl.textContent = '0 منتج';
        return;
    }

    productsArray.forEach((product) => {
        // حساب شكل السعر لو فيه خصم
        const priceHTML = product.oldPrice 
            ? `<span style="text-decoration:line-through; color:#999; font-size:12px; margin-left:5px;">${product.oldPrice}</span> <span class="price">${product.price} ج.م</span>`
            : `<span class="price">${product.price} ج.م</span>`;

        // إظهار بادج القسم الفرعي لو موجود
        const subCatBadge = product.subCategory 
            ? `<span style="position:absolute; top:10px; right:10px; background:var(--primary); color:#fff; font-size:10px; padding:3px 8px; border-radius:12px; z-index:2;">${product.subCategory}</span>` 
            : '';

        productsGrid.innerHTML += `
            <div class="card" data-id="${product.id}" data-category="${product.category}" data-subcategory="${product.subCategory || ''}">
                <a href="product.html?id=${product.id}" class="product-link" style="position:relative; display:block;">
                    ${subCatBadge}
                    <div class="product-img" style="background-image: url('${product.imageUrl}'); background-size: cover; background-position: center;"></div>
                </a>
                <div class="card-content">
                    <a href="product.html?id=${product.id}" class="product-link">
                        <h3>${product.name}</h3>
                    </a>
                    <p class="brand"><i class="fa-solid fa-tag"></i> الماركة: ${product.brand || '-'}</p>
                    <div class="card-footer">
                        <div>${priceHTML}</div>
                        <button class="add-to-cart-btn"><i class="fa-solid fa-cart-plus"></i></button>
                    </div>
                </div>
            </div>
        `;
    });

    if (catCountEl) catCountEl.textContent = `${productsArray.length} منتج`;

    // إعادة ربط أزرار إضافة للسلة بعد الرسم الجديد
    if (typeof window.attachAddToCartEvents === 'function') {
        window.attachAddToCartEvents();
    } else {
        attachLocalAddToCart();
    }
}

// ==========================================
// 5. ربط احتياطي لأزرار السلة
// ==========================================
function attachLocalAddToCart() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const card = this.closest('.card');
            
            // قراءة السعر من العنصر اللي جواه السعر النهائي فقط (عشان نتجنب السعر القديم)
            const priceText = card.querySelector('.price').textContent.replace(/\D/g, '');

            const productData = {
                id: card.getAttribute('data-id'),
                name: card.querySelector('h3').textContent,
                price: parseInt(priceText),
                image: card.querySelector('.product-img').style.backgroundImage.slice(5, -2).replace(/"/g, ""),
                quantity: 1
            };

            let cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const idx = cart.findIndex(it => it.id === productData.id);
            if (idx > -1) cart[idx].quantity += 1;
            else cart.push(productData);
            localStorage.setItem('cart', JSON.stringify(cart));

            const badge = document.querySelector('.cart-badge');
            if (badge) badge.textContent = cart.reduce((s, it) => s + it.quantity, 0);

            const original = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => { this.innerHTML = original; }, 1000);
        });
    });
}

// ==========================================
// 6. البحث داخل القسم
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
// تشغيل
// ==========================================
loadCategoryInfo();
loadSubCategoriesBar();
fetchCategoryProducts();