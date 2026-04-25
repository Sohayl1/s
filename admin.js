import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

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
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.warn("تنبيه: أنت لست مسجل الدخول، قد يرفض فايربيس إضافة المنتجات.");
    } else {
        console.log("مرحباً بالمدير:", user.email);
    }
});

// ==========================================
// 1. نظام التنقل بين التابات
// ==========================================
const tabLinks = document.querySelectorAll('.tab-link');
const contentSections = document.querySelectorAll('.content-section');
const pageTitleText = document.getElementById('pageTitleText');

tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        tabLinks.forEach(l => l.classList.remove('active'));
        contentSections.forEach(section => section.style.display = 'none');

        link.classList.add('active');
        const targetId = link.getAttribute('data-target');
        document.getElementById(targetId).style.display = 'block';

        pageTitleText.textContent = link.textContent.trim();

        if (targetId === 'manage-products-section') {
            loadAdminProducts();
        }
        if (targetId === 'stats-section') {
            loadDashboardStats();
        }
    });
});

// ==========================================
// 2. الإحصائيات (مبيعات/طلبات/متوسط)
// ==========================================
const refreshStatsBtn = document.getElementById('refreshStatsBtn');
if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', loadDashboardStats);
}

function formatMoney(num) {
    if (!num || isNaN(num)) num = 0;
    return Math.round(num).toLocaleString('ar-EG') + ' ج.م';
}

function getMonthName(date) {
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return months[date.getMonth()] + ' ' + date.getFullYear();
}

async function loadDashboardStats() {
    // عناصر الواجهة
    const todaySalesEl = document.getElementById('todaySales');
    const todayOrdersEl = document.getElementById('todayOrders');
    const todayAvgEl = document.getElementById('todayAvg');
    const todayDateEl = document.getElementById('todayDate');
    const monthSalesEl = document.getElementById('monthSales');
    const monthOrdersEl = document.getElementById('monthOrders');
    const monthAvgEl = document.getElementById('monthAvg');
    const monthNameEl = document.getElementById('monthName');

    // تواريخ اليوم وبداية الشهر
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (todayDateEl) todayDateEl.textContent = now.toLocaleDateString('ar-EG');
    if (monthNameEl) monthNameEl.textContent = getMonthName(now);

    // مؤشر تحميل
    [todaySalesEl, monthSalesEl, todayAvgEl, monthAvgEl].forEach(el => {
        if (el) el.textContent = '...';
    });
    [todayOrdersEl, monthOrdersEl].forEach(el => {
        if (el) el.textContent = '...';
    });

    try {
        const snap = await getDocs(collection(db, "orders"));

        let todaySales = 0, todayCount = 0;
        let monthSales = 0, monthCount = 0;

        snap.forEach((docSnap) => {
            const order = docSnap.data();

            // قراءة التاريخ - بيدعم string أو Timestamp من Firebase
            let d = null;
            if (order.orderDate) {
                if (typeof order.orderDate === 'string') {
                    d = new Date(order.orderDate);
                } else if (order.orderDate.toDate) {
                    d = order.orderDate.toDate();
                } else if (order.orderDate.seconds) {
                    d = new Date(order.orderDate.seconds * 1000);
                }
            }
            // لو مفيش تاريخ، استخدم createdAt كـ fallback
            if (!d && order.createdAt) {
                d = new Date(order.createdAt);
            }
            if (!d || isNaN(d.getTime())) return;

            const amount = Number(order.totalAmount || order.total || 0);

            // إحصائيات الشهر
            if (d >= startOfMonth) {
                monthSales += amount;
                monthCount++;
            }
            // إحصائيات اليوم
            if (d >= startOfToday) {
                todaySales += amount;
                todayCount++;
            }
        });

        const todayAvg = todayCount > 0 ? todaySales / todayCount : 0;
        const monthAvg = monthCount > 0 ? monthSales / monthCount : 0;

        if (todaySalesEl) todaySalesEl.textContent = formatMoney(todaySales);
        if (todayOrdersEl) todayOrdersEl.textContent = todayCount.toLocaleString('ar-EG');
        if (todayAvgEl) todayAvgEl.textContent = formatMoney(todayAvg);

        if (monthSalesEl) monthSalesEl.textContent = formatMoney(monthSales);
        if (monthOrdersEl) monthOrdersEl.textContent = monthCount.toLocaleString('ar-EG');
        if (monthAvgEl) monthAvgEl.textContent = formatMoney(monthAvg);

    } catch (error) {
        console.error("Error loading stats:", error);
        [todaySalesEl, monthSalesEl, todayAvgEl, monthAvgEl].forEach(el => {
            if (el) el.textContent = 'خطأ';
        });
        [todayOrdersEl, monthOrdersEl].forEach(el => {
            if (el) el.textContent = '0';
        });
    }
}

// ==========================================
// 3. إضافة منتج
// ==========================================
const form = document.getElementById('addProductForm');
const submitBtn = document.getElementById('submitBtn');
const successMsg = document.getElementById('successMessage');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    submitBtn.disabled = true;

    const productName = document.getElementById('productName').value;
    const productBrand = document.getElementById('productBrand').value;
    const productCategory = document.getElementById('productCategory').value || 'الكل';
    const productPrice = Number(document.getElementById('productPrice').value);
    const productImage = document.getElementById('productImage').value;
    const productDesc = document.getElementById('productDesc').value || '';

    const oldPriceVal = document.getElementById('productOldPrice').value;
    const productOldPrice = oldPriceVal ? Number(oldPriceVal) : null;

    const productData = {
        name: productName,
        brand: productBrand,
        category: productCategory,
        price: productPrice,
        imageUrl: productImage,
        description: productDesc,
        createdAt: new Date().toISOString()
    };
    if (productOldPrice && productOldPrice > productPrice) {
        productData.oldPrice = productOldPrice;
    }

    try {
        await addDoc(collection(db, "products"), productData);
        form.reset();
        document.getElementById('productCategory').value = 'الكل';
        successMsg.style.display = 'block';
        setTimeout(() => successMsg.style.display = 'none', 3000);
    } catch (error) {
        console.error("Error adding product: ", error);
        alert("حدث خطأ أثناء حفظ المنتج.");
    } finally {
        submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج في قاعدة البيانات';
        submitBtn.disabled = false;
    }
});

// ==========================================
// 4. عرض المنتجات
// ==========================================
let allAdminProducts = [];

async function loadAdminProducts() {
    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        tableBody.innerHTML = '';
        allAdminProducts = [];

        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد منتجات مضافة حتى الآن.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            product.id = docSnap.id;
            allAdminProducts.push(product);

            const priceCell = product.oldPrice
                ? `<span style="text-decoration:line-through; color:#999; font-size:13px;">${product.oldPrice} ج.م</span>
                   <strong style="color:#e74c3c; margin-right:6px;">${product.price} ج.م</strong>`
                : `${product.price} ج.م`;

            tableBody.innerHTML += `
                <tr>
                    <td><img src="${product.imageUrl}" alt="${product.name}"></td>
                    <td>${product.name}</td>
                    <td>${product.category || 'الكل'}</td>
                    <td>${priceCell}</td>
                    <td>
                        <button class="btn-edit" onclick="openEditModal('${product.id}')">
                            <i class="fa-solid fa-pen"></i> تعديل
                        </button>
                        <button class="btn-delete" onclick="deleteProduct('${product.id}')">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching products: ", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">حدث خطأ في جلب المنتجات.</td></tr>';
    }
}

// ==========================================
// 5. حذف المنتج
// ==========================================
window.deleteProduct = async function(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
        try {
            await deleteDoc(doc(db, "products", productId));
            loadAdminProducts();
        } catch (error) {
            console.error("Error deleting product: ", error);
            alert('حدث خطأ أثناء الحذف.');
        }
    }
};

// ==========================================
// 6. التعديل
// ==========================================
window.openEditModal = function(productId) {
    const product = allAdminProducts.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductBrand').value = product.brand || '';
    document.getElementById('editProductCategory').value = product.category || 'الكل';
    document.getElementById('editProductPrice').value = product.price || '';
    document.getElementById('editProductOldPrice').value = product.oldPrice || '';
    document.getElementById('editProductImage').value = product.imageUrl || '';
    document.getElementById('editProductDesc').value = product.description || '';

    document.getElementById('editModal').style.display = 'block';
};

document.getElementById('closeEditModal').onclick = function() {
    document.getElementById('editModal').style.display = 'none';
};

const editForm = document.getElementById('editProductForm');
const updateBtn = document.getElementById('updateBtn');

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    updateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحديث...';
    updateBtn.disabled = true;

    const id = document.getElementById('editProductId').value;
    const newPrice = Number(document.getElementById('editProductPrice').value);
    const oldPriceVal = document.getElementById('editProductOldPrice').value;
    const oldPriceNum = oldPriceVal ? Number(oldPriceVal) : null;

    const updatedData = {
        name: document.getElementById('editProductName').value,
        brand: document.getElementById('editProductBrand').value,
        category: document.getElementById('editProductCategory').value || 'الكل',
        price: newPrice,
        imageUrl: document.getElementById('editProductImage').value,
        description: document.getElementById('editProductDesc').value || '',
        oldPrice: (oldPriceNum && oldPriceNum > newPrice) ? oldPriceNum : null
    };

    try {
        await updateDoc(doc(db, "products", id), updatedData);
        alert("تم تحديث بيانات المنتج بنجاح!");
        document.getElementById('editModal').style.display = 'none';
        loadAdminProducts();
    } catch (error) {
        console.error("Error updating product: ", error);
        alert("حدث خطأ أثناء تحديث البيانات.");
    } finally {
        updateBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تحديث بيانات المنتج';
        updateBtn.disabled = false;
    }
});

// ==========================================
// 7. إدارة الأقسام (بدون أيقونة)
// ==========================================
const addCategoryForm = document.getElementById('addCategoryForm');
const submitCatBtn = document.getElementById('submitCatBtn');

async function loadCategories() {
    const tableBody = document.getElementById('categoriesTableBody');
    const productCatSelect = document.getElementById('productCategory');
    const editProductCatSelect = document.getElementById('editProductCategory');

    if (tableBody) tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';

    try {
        const q = query(collection(db, "categories"));
        const querySnapshot = await getDocs(q);

        if (tableBody) tableBody.innerHTML = '';

        productCatSelect.innerHTML = '<option value="الكل" selected>الكل</option>';
        editProductCatSelect.innerHTML = '<option value="الكل">الكل</option>';

        if (querySnapshot.empty && tableBody) {
            tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">لا توجد أقسام مضافة.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const cat = docSnap.data();
            cat.id = docSnap.id;

            if (tableBody) {
                tableBody.innerHTML += `
                    <tr>
                        <td>${cat.name}</td>
                        <td>
                            <button class="btn-delete" onclick="deleteCategory('${cat.id}')">
                                <i class="fa-solid fa-trash"></i> حذف
                            </button>
                        </td>
                    </tr>
                `;
            }

            const optionHTML = `<option value="${cat.name}">${cat.name}</option>`;
            productCatSelect.innerHTML += optionHTML;
            editProductCatSelect.innerHTML += optionHTML;
        });
    } catch (error) {
        console.error("Error loading categories: ", error);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: red;">خطأ في تحميل الأقسام.</td></tr>';
    }
}

if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitCatBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإضافة...';
        submitCatBtn.disabled = true;

        const name = document.getElementById('catName').value.trim();
        if (!name) {
            alert("اكتب اسم القسم");
            submitCatBtn.innerHTML = '<i class="fa-solid fa-plus"></i> إضافة القسم';
            submitCatBtn.disabled = false;
            return;
        }

        try {
            await addDoc(collection(db, "categories"), {
                name: name,
                icon: "fa-solid fa-tag"
            });
            addCategoryForm.reset();
            loadCategories();
            alert("تمت إضافة القسم بنجاح!");
        } catch (error) {
            console.error("Error adding category: ", error);
            alert("حدث خطأ أثناء الإضافة.");
        } finally {
            submitCatBtn.innerHTML = '<i class="fa-solid fa-plus"></i> إضافة القسم';
            submitCatBtn.disabled = false;
        }
    });
}

window.deleteCategory = async function(catId) {
    if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
        try {
            await deleteDoc(doc(db, "categories", catId));
            loadCategories();
        } catch (error) {
            console.error("Error deleting category: ", error);
            alert('حدث خطأ أثناء الحذف.');
        }
    }
};

// ==========================================
// تشغيل أولي
// ==========================================
loadCategories();
loadDashboardStats(); // تحميل الإحصائيات أول ما الصفحة تفتح
