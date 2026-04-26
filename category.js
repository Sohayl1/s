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

// 1. قراءة البيانات من الرابط
const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get('name');
let subCategoryFromUrl = urlParams.get('sub');

const catTitleEl = document.getElementById('catTitle');
const catBreadcrumbEl = document.getElementById('catBreadcrumb');
const catIconEl = document.getElementById('catIcon');
const catCountEl = document.getElementById('catCount');
const productsGrid = document.getElementById('productsGrid');

let currentCategoryProducts = []; 

// تهيئة واجهة الصفحة
if (!categoryName) {
    if (catTitleEl) catTitleEl.textContent = 'القسم غير محدد';
} else {
    // لو فيه قسم فرعي، نعرضه في العنوان
    if (subCategoryFromUrl) {
        if (catTitleEl) catTitleEl.textContent = `${subCategoryFromUrl} - ${categoryName}`;
        if (catBreadcrumbEl) catBreadcrumbEl.textContent = `${categoryName} > ${subCategoryFromUrl}`;
        document.title = `${subCategoryFromUrl} - ${categoryName} - مكتبة نور`;
    } else {
        if (catTitleEl) catTitleEl.textContent = categoryName;
        if (catBreadcrumbEl) catBreadcrumbEl.textContent = categoryName;
        document.title = `${categoryName} - مكتبة نور`;
    }
}

// 2. جلب أيقونة القسم
async function loadCategoryInfo() {
    if (!categoryName) return;
    try {
        const q = query(collection(db, "categories"), where("name", "==", categoryName));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
            const cat = docSnap.data();
            if (cat.icon && catIconEl) {
                catIconEl.className = cat.icon;
            }
        });
    } catch (e) { console.error(e); }
}

// 3. جلب شريط الأقسام الفرعية (السلايدر العلوي)
async function loadSubCategoriesBar() {
    const slider = document.getElementById('categoriesSlider');
    if (!slider || !categoryName) return;

    try {
        const q = query(collection(db, "subCategories"), where("parentCategory", "==", categoryName));
        const snap = await getDocs(q);
        
        // زرار "الكل" - يظهر كل المنتجات في القسم الرئيسي
        slider.innerHTML = `
            <div class="sub-cat ${!subCategoryFromUrl ? 'active' : ''}" onclick="window.filterBySubCategory('all', this)" style="cursor:pointer;">
                <i class="fa-solid fa-border-all"></i> الكل
            </div>
        `;

        snap.forEach((docSnap) => {
            const subCat = docSnap.data();
            const activeClass = (subCategoryFromUrl === subCat.name) ? 'active' : '';
            slider.innerHTML += `
                <div class="sub-cat ${activeClass}" onclick="window.filterBySubCategory('${subCat.name.replace(/'/g, "\\'")}', this)" style="cursor:pointer;">
                    ${subCat.name}
                </div>
            `;
        });
    } catch (e) { console.error(e); }
}

// 4. جلب المنتجات وتصفيتها حسب القسم الفرعي لو موجود
async function fetchCategoryProducts() {
    if (!productsGrid || !categoryName) return;

    try {
        // لو في subCategoryFromUrl، بنجيب المنتجات اللي subCategory بتاعها بيساويه
        // لو مفيش، بنجيب كل منتجات القسم الرئيسي
        let q;
        if (subCategoryFromUrl) {
            q = query(
                collection(db, "products"),
                where("category", "==", categoryName),
                where("subCategory", "==", subCategoryFromUrl),
                orderBy("createdAt", "desc")
            );
        } else {
            q = query(
                collection(db, "products"),
                where("category", "==", categoryName),
                orderBy("createdAt", "desc")
            );
        }

        const querySnapshot = await getDocs(q);
        console.log(`✅ تم جلب ${querySnapshot.size} منتج للقسم "${categoryName}"` + (subCategoryFromUrl ? ` > "${subCategoryFromUrl}"` : ''));

        currentCategoryProducts = [];
        querySnapshot.forEach((doc) => {
            currentCategoryProducts.push({ id: doc.id, ...doc.data() });
        });

        // رسم المنتجات
        renderProductsHTML(currentCategoryProducts);
        setupSearch();

    } catch (error) {
        console.error("❌ خطأ في جلب المنتجات:", error);
        productsGrid.innerHTML = `<p style="text-align:center; grid-column:1/-1; padding:50px; color:red;">حدث خطأ أثناء تحميل البيانات: ${error.message}</p>`;
    }
}

// دالة الرسم بنظام المجموعات (الصفوف حسب القسم الفرعي)
function renderProductsHTML(productsArray) {
    productsGrid.innerHTML = '';

    if (productsArray.length === 0) {
        productsGrid.innerHTML = `
            <div style="text-align:center; grid-column:1/-1; padding:50px; color:var(--gray);">
                <i class="fa-solid fa-box-open" style="font-size:50px; display:block; margin-bottom:15px; opacity:0.5;"></i>
                <p style="font-size:18px; margin:0;">لا توجد منتجات في هذا القسم حالياً</p>
                <p style="font-size:14px; margin-top:5px; opacity:0.7;">${subCategoryFromUrl ? `القسم الفرعي: ${subCategoryFromUrl}` : `القسم: ${categoryName}`}</p>
            </div>`;
        if (catCountEl) catCountEl.textContent = `0 منتج`;
        return;
    }

    // لو إحنا في قسم فرعي محدد، نعرض المنتجات مباشرة بدون تجميع
    if (subCategoryFromUrl) {
        const rowSection = document.createElement('div');
        rowSection.className = 'subcategory-row';
        rowSection.style.cssText = "grid-column: 1/-1; margin-bottom: 40px; width:100%;";

        rowSection.innerHTML = `
            <div class="section-header" style="margin-bottom:20px; background: var(--secondary); padding: 10px 20px; border-radius: 10px; color: white;">
                <h2 style="font-size: 1.2rem; margin:0;"><i class="fa-solid fa-tag"></i> ${subCategoryFromUrl}</h2>
            </div>
            <div class="grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px;">
                ${productsArray.map(product => {
                    const priceHTML = product.oldPrice 
                        ? `<span style="text-decoration:line-through; color:#999; font-size:12px; margin-left:5px;">${product.oldPrice}</span> <span class="price">${product.price} ج.م</span>`
                        : `<span class="price">${product.price} ج.م</span>`;
                        
                    return `
                    <div class="card" data-id="${product.id}" data-category="${product.category}" data-subcategory="${product.subCategory || ''}">
                        <a href="product.html?id=${product.id}" class="product-link">
                            <div class="product-img" style="background-image: url('${product.imageUrl}'); height:150px; background-size:cover; background-position:center;"></div>
                        </a>
                        <div class="card-content" style="padding:12px;">
                            <h3 style="font-size:14px; height:40px; overflow:hidden;">${product.name}</h3>
                            <div class="card-footer" style="margin-top:10px; padding-top:10px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                <div>${priceHTML}</div>
                                <button class="add-to-cart-btn" style="border:none; background:none; cursor:pointer; font-size:18px; color:var(--secondary);"><i class="fa-solid fa-cart-plus"></i></button>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
        productsGrid.appendChild(rowSection);
    } 
    // لو في القسم الرئيسي (الكل)، نجمع حسب الأقسام الفرعية
    else {
        const groups = productsArray.reduce((acc, product) => {
            const subName = product.subCategory || "أصناف متنوعة";
            if (!acc[subName]) acc[subName] = [];
            acc[subName].push(product);
            return acc;
        }, {});

        const sortedSubNames = Object.keys(groups);

        sortedSubNames.forEach(subName => {
            const groupProducts = groups[subName];
            const rowSection = document.createElement('div');
            rowSection.className = 'subcategory-row';
            rowSection.style.cssText = "grid-column: 1/-1; margin-bottom: 40px; width:100%;";

            rowSection.innerHTML = `
                <div class="section-header" style="margin-bottom:20px; background: var(--secondary); padding: 10px 20px; border-radius: 10px; color: white;">
                    <h2 style="font-size: 1.2rem; margin:0;"><i class="fa-solid fa-tag"></i> ${subName}</h2>
                </div>
                <div class="grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px;">
                    ${groupProducts.map(product => {
                        const priceHTML = product.oldPrice 
                            ? `<span style="text-decoration:line-through; color:#999; font-size:12px; margin-left:5px;">${product.oldPrice}</span> <span class="price">${product.price} ج.م</span>`
                            : `<span class="price">${product.price} ج.م</span>`;
                            
                        return `
                        <div class="card" data-id="${product.id}" data-category="${product.category}" data-subcategory="${product.subCategory || ''}">
                            <a href="product.html?id=${product.id}" class="product-link">
                                <div class="product-img" style="background-image: url('${product.imageUrl}'); height:150px; background-size:cover; background-position:center;"></div>
                            </a>
                            <div class="card-content" style="padding:12px;">
                                <h3 style="font-size:14px; height:40px; overflow:hidden;">${product.name}</h3>
                                <div class="card-footer" style="margin-top:10px; padding-top:10px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                    <div>${priceHTML}</div>
                                    <button class="add-to-cart-btn" style="border:none; background:none; cursor:pointer; font-size:18px; color:var(--secondary);"><i class="fa-solid fa-cart-plus"></i></button>
                                </div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
            productsGrid.appendChild(rowSection);
        });
    }

    if (catCountEl) catCountEl.textContent = `${productsArray.length} منتج`;

    // استدعاء الدالة العامة من الكود الثاني لتفعيل أزرار السلة
    if (typeof window.attachAddToCartEvents === 'function') {
        window.attachAddToCartEvents();
    } else {
        console.warn("⚠️ دالة attachAddToCartEvents مش موجودة، في انتظار تحميل الكود الثاني...");
        setTimeout(() => {
            if (typeof window.attachAddToCartEvents === 'function') {
                window.attachAddToCartEvents();
                console.log("✅ تم تفعيل أزرار السلة بنجاح");
            }
        }, 1500);
    }
}

// الفلترة من الشريط العلوي (السلايدر) - تحديث الصفحة بنفس القسم الفرعي
window.filterBySubCategory = function(subCategoryName, element) {
    // تحديث تظليل الزرار النشط
    document.querySelectorAll('#categoriesSlider .sub-cat').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    if (subCategoryName === 'all') {
        subCategoryFromUrl = null;
        // تحديث الرابط بدون إعادة تحميل الصفحة
        const newUrl = `category.html?name=${encodeURIComponent(categoryName)}`;
        window.history.pushState({}, '', newUrl);
        // تحديث العنوان
        if (catTitleEl) catTitleEl.textContent = categoryName;
        if (catBreadcrumbEl) catBreadcrumbEl.textContent = categoryName;
        document.title = `${categoryName} - مكتبة نور`;
    } else {
        subCategoryFromUrl = subCategoryName;
        // تحديث الرابط
        const newUrl = `category.html?name=${encodeURIComponent(categoryName)}&sub=${encodeURIComponent(subCategoryName)}`;
        window.history.pushState({}, '', newUrl);
        // تحديث العنوان
        if (catTitleEl) catTitleEl.textContent = `${subCategoryName} - ${categoryName}`;
        if (catBreadcrumbEl) catBreadcrumbEl.textContent = `${categoryName} > ${subCategoryName}`;
        document.title = `${subCategoryName} - ${categoryName} - مكتبة نور`;
    }
    
    // إعادة جلب المنتجات بالفلتر الجديد
    fetchCategoryProducts();
};

// نظام البحث
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    // إزالة الحدث القديم لو موجود
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    newSearchInput.addEventListener('input', () => {
        const term = newSearchInput.value.trim().toLowerCase();
        document.querySelectorAll('.subcategory-row').forEach(row => {
            let hasMatch = false;
            row.querySelectorAll('.card').forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                if (title.includes(term)) {
                    card.style.display = 'block';
                    hasMatch = true;
                } else {
                    card.style.display = 'none';
                }
            });
            row.style.display = hasMatch ? 'block' : 'none';
        });
    });
}

// تشغيل الدوال عند تحميل الصفحة
loadCategoryInfo();
loadSubCategoriesBar();
fetchCategoryProducts();