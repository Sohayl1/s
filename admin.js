import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, orderBy, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
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

const IMGBB_API_KEY = "450adf74bc32bb1ef24aff6e4780c2ec";

let allCategories = [];
let allSubCategories = [];
let allAdminProducts = [];
let allOrders = []; // مصفوفة الطلبات
let currentOrderFilter = 'all'; // الفلتر الحالي
window.currentEditImageUrl = '';

// ==========================================
// التحقق من تسجيل الدخول
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.warn("تنبيه: أنت لست مسجل الدخول");
    } else {
        console.log("مرحباً بالمدير:", user.email);
        loadCategories();
        loadDashboardStats();
        loadOrders(); // تحميل الطلبات
        if (document.getElementById('manage-products-section')?.style.display === 'block') {
            loadAdminProducts();
        }
        if (document.getElementById('orders-section')?.style.display === 'block') {
            loadOrders();
        }
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
        if (link.classList.contains('back-to-site')) return;
        e.preventDefault();

        tabLinks.forEach(l => l.classList.remove('active'));
        contentSections.forEach(section => section.style.display = 'none');

        link.classList.add('active');
        const targetId = link.getAttribute('data-target');
        document.getElementById(targetId).style.display = 'block';
        pageTitleText.textContent = link.textContent.trim();

        if (targetId === 'manage-products-section') loadAdminProducts();
        if (targetId === 'manage-categories-section') loadCategories();
        if (targetId === 'stats-section') loadDashboardStats();
        if (targetId === 'orders-section') loadOrders();
    });
});

// ==========================================
// 2. دالة رفع الصورة إلى ImgBB
// ==========================================
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });
    const data = await response.json();
    if (data.success) {
        return data.data.url;
    } else {
        throw new Error("فشل رفع الصورة");
    }
}

// ==========================================
// 3. تنسيق العملة والتاريخ
// ==========================================
function formatMoney(num) {
    if (!num || isNaN(num)) num = 0;
    return Math.round(num).toLocaleString('ar-EG') + ' ج.م';
}

function getMonthName(date) {
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return months[date.getMonth()] + ' ' + date.getFullYear();
}

function formatDateTime(timestamp) {
    if (!timestamp) return '—';
    let d;
    if (typeof timestamp === 'string') d = new Date(timestamp);
    else if (timestamp.toDate) d = timestamp.toDate();
    else if (timestamp.seconds) d = new Date(timestamp.seconds * 1000);
    else d = new Date(timestamp);
    
    if (isNaN(d.getTime())) return '—';
    
    const options = { 
        year: 'numeric', 
        month: 'numeric', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
    };
    return d.toLocaleDateString('ar-EG', options);
}

// ==========================================
// 4. الإحصائيات المتقدمة
// ==========================================
const refreshStatsBtn = document.getElementById('refreshStatsBtn');
if (refreshStatsBtn) refreshStatsBtn.addEventListener('click', loadDashboardStats);

async function loadDashboardStats() {
    const todaySalesEl = document.getElementById('todaySales');
    const todayOrdersEl = document.getElementById('todayOrders');
    const todayAvgEl = document.getElementById('todayAvg');
    const todayDateEl = document.getElementById('todayDate');
    const monthSalesEl = document.getElementById('monthSales');
    const monthOrdersEl = document.getElementById('monthOrders');
    const monthAvgEl = document.getElementById('monthAvg');
    const monthNameEl = document.getElementById('monthName');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (todayDateEl) todayDateEl.textContent = now.toLocaleDateString('ar-EG');
    if (monthNameEl) monthNameEl.textContent = getMonthName(now);

    try {
        const snap = await getDocs(collection(db, "orders"));
        let todaySales = 0, todayCount = 0;
        let monthSales = 0, monthCount = 0;

        snap.forEach((docSnap) => {
            const order = docSnap.data();
            
            // تجاهل الطلبات الملغية في الإحصائيات
            if (order.status === 'cancelled') return;
            
            let d = null;
            if (order.orderDate) {
                if (typeof order.orderDate === 'string') d = new Date(order.orderDate);
                else if (order.orderDate.toDate) d = order.orderDate.toDate();
                else if (order.orderDate.seconds) d = new Date(order.orderDate.seconds * 1000);
            }
            if (!d && order.createdAt) d = new Date(order.createdAt);
            if (!d || isNaN(d.getTime())) return;

            const amount = Number(order.totalAmount || order.total || 0);

            if (d >= startOfMonth) { monthSales += amount; monthCount++; }
            if (d >= startOfToday) { todaySales += amount; todayCount++; }
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
    }
}

// ==========================================
// 5. نظام الطلبات (جديد)
// ==========================================
const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
if (refreshOrdersBtn) refreshOrdersBtn.addEventListener('click', loadOrders);

async function loadOrders() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody) return;
    
    ordersTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';

    try {
        const q = query(collection(db, "orders"), orderBy("orderDate", "desc"));
        const querySnapshot = await getDocs(q);
        
        allOrders = [];
        querySnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            order.id = docSnap.id;
            allOrders.push(order);
        });

        updateOrderCounts();
        renderOrdersTable();
    } catch (error) {
        console.error("Error loading orders:", error);
        if (ordersTableBody) {
            ordersTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">حدث خطأ في جلب الطلبات</td></tr>';
        }
    }
}

function updateOrderCounts() {
    const pendingCount = allOrders.filter(o => o.status === 'pending').length;
    const completedCount = allOrders.filter(o => o.status === 'completed').length;
    const cancelledCount = allOrders.filter(o => o.status === 'cancelled').length;
    const totalCount = allOrders.length;

    document.getElementById('pendingOrdersCount').textContent = pendingCount;
    document.getElementById('completedOrdersCount').textContent = completedCount;
    document.getElementById('cancelledOrdersCount').textContent = cancelledCount;
    document.getElementById('totalOrdersCount').textContent = totalCount;
}

function renderOrdersTable(filteredOrders = null) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody) return;

    const ordersToDisplay = filteredOrders || allOrders;

    if (ordersToDisplay.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px;">لا توجد طلبات حالياً</td></tr>';
        return;
    }

    ordersTableBody.innerHTML = '';

    ordersToDisplay.forEach(order => {
        // تحديد لون الحالة
        let statusBadge = '';
        switch(order.status) {
            case 'pending':
                statusBadge = '<span style="background:#fff3cd; color:#856404; padding:5px 12px; border-radius:15px; font-size:13px;">⏳ معلق</span>';
                break;
            case 'completed':
                statusBadge = '<span style="background:#d4edda; color:#155724; padding:5px 12px; border-radius:15px; font-size:13px;">✅ مكتمل</span>';
                break;
            case 'cancelled':
                statusBadge = '<span style="background:#f8d7da; color:#721c24; padding:5px 12px; border-radius:15px; font-size:13px;">❌ ملغي</span>';
                break;
            default:
                statusBadge = '<span style="background:#eee; color:#333; padding:5px 12px; border-radius:15px; font-size:13px;">—</span>';
        }

        // منتجات الطلب
        const productsNames = order.items ? order.items.map(item => item.name).join('، ') : '—';
        
        // رقم الطلب مختصر
        const orderNumber = order.id ? order.id.substring(0, 8).toUpperCase() : '—';

        ordersTableBody.innerHTML += `
            <tr>
                <td><strong>#${orderNumber}</strong></td>
                <td>
                    <div style="font-weight:600;">${order.customerName || '—'}</div>
                    <div style="font-size:11px; color:#888;">${order.customerEmail || ''}</div>
                </td>
                <td>${order.phone || '—'}</td>
                <td>${order.paymentMethod === 'vodafone' ? 'فودافون كاش' : 'استلام من المحل'}</td>
                <td><strong style="color:var(--primary);">${formatMoney(order.totalAmount)}</strong></td>
                <td>${statusBadge}</td>
                <td style="font-size:13px; color:#666;">${formatDateTime(order.orderDate)}</td>
                <td style="white-space: nowrap;">
                    <button onclick="viewOrderDetails('${order.id}')" style="background:#17a2b8; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin:2px;" title="تفاصيل">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    ${order.status === 'pending' ? `
                        <button onclick="updateOrderStatus('${order.id}', 'completed')" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin:2px;" title="تأكيد الإكمال">
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <button onclick="updateOrderStatus('${order.id}', 'cancelled')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin:2px;" title="إلغاء الطلب">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    ` : ''}
                    ${order.status === 'cancelled' ? `
                        <button onclick="updateOrderStatus('${order.id}', 'pending')" style="background:#ffc107; color:#333; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin:2px;" title="إعادة للمعلقة">
                            <i class="fa-solid fa-undo"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
}

// فلترة الطلبات
window.filterOrders = function(status, button) {
    currentOrderFilter = status;
    
    // تحديث تنسيق الأزرار
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
        btn.style.background = '#f0f0f0';
        btn.style.color = '#333';
        btn.classList.remove('active');
    });
    button.style.background = '#8e44ad';
    button.style.color = 'white';
    button.classList.add('active');
    
    if (status === 'all') {
        renderOrdersTable(allOrders);
    } else {
        const filtered = allOrders.filter(order => order.status === status);
        renderOrdersTable(filtered);
    }
};

// عرض تفاصيل الطلب
window.viewOrderDetails = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const productsList = order.items 
        ? order.items.map(item => `
            <div style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid #eee;">
                <img src="${item.image}" style="width:40px; height:40px; object-fit:cover; border-radius:5px;">
                <div style="flex:1;">
                    <strong>${item.name}</strong>
                    <span style="color:#888; font-size:12px; display:block;">${item.quantity} × ${item.price} ج.م</span>
                </div>
                <span style="font-weight:bold;">${item.price * item.quantity} ج.م</span>
            </div>
        `).join('')
        : '<p>لا توجد منتجات</p>';
    
    const modalHTML = `
        <div id="orderDetailsModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:1001; display:flex; align-items:center; justify-content:center;">
            <div style="background:white; border-radius:12px; padding:25px; max-width:500px; width:90%; max-height:80vh; overflow-y:auto; position:relative;">
                <span onclick="document.getElementById('orderDetailsModal').remove()" style="position:absolute; left:15px; top:10px; font-size:24px; cursor:pointer; color:#999;">&times;</span>
                <h3 style="margin-bottom:20px; color:var(--primary);">📋 تفاصيل الطلب #${order.id.substring(0, 8).toUpperCase()}</h3>
                
                <div style="margin-bottom:15px;">
                    <strong>👤 العميل:</strong> ${order.customerName || '—'}<br>
                    <strong>📧 البريد:</strong> ${order.customerEmail || '—'}<br>
                    <strong>📱 الهاتف:</strong> ${order.phone || '—'}<br>
                    <strong>📍 العنوان:</strong> ${order.address || '—'}<br>
                    <strong>💳 الدفع:</strong> ${order.paymentMethod === 'vodafone' ? 'فودافون كاش' : 'استلام من المحل'}<br>
                    <strong>📅 التاريخ:</strong> ${formatDateTime(order.orderDate)}<br>
                    <strong>💰 الإجمالي:</strong> <span style="color:var(--primary); font-weight:bold;">${formatMoney(order.totalAmount)}</span>
                </div>
                
                <h4 style="margin-bottom:10px;">🛍️ المنتجات:</h4>
                ${productsList}
                
                <button onclick="document.getElementById('orderDetailsModal').remove()" style="width:100%; margin-top:15px; padding:10px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer;">
                    إغلاق
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// تحديث حالة الطلب
window.updateOrderStatus = async function(orderId, newStatus) {
    const statusMessages = {
        'completed': 'هل أنت متأكد من تعليم الطلب كمكتمل؟',
        'cancelled': 'هل أنت متأكد من إلغاء الطلب؟',
        'pending': 'هل تريد إعادة الطلب للحالة المعلقة؟'
    };
    
    if (!confirm(statusMessages[newStatus])) return;
    
    try {
        await updateDoc(doc(db, "orders", orderId), {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });
        
        // تحديث محلي
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex > -1) {
            allOrders[orderIndex].status = newStatus;
        }
        
        updateOrderCounts();
        renderOrdersTable(currentOrderFilter === 'all' ? allOrders : allOrders.filter(o => o.status === currentOrderFilter));
        loadDashboardStats(); // تحديث الإحصائيات
        
        alert(`تم تحديث حالة الطلب بنجاح!`);
    } catch (error) {
        console.error("Error updating order:", error);
        alert("حدث خطأ أثناء تحديث الطلب");
    }
};

// ==========================================
// 6. إدارة الأقسام (الرئيسية والفرعية)
// ==========================================
async function loadCategories() {
    const catTableBody = document.getElementById('categoriesTableBody');
    const subCatTableBody = document.getElementById('subCategoriesTableBody');
    const productCatSelect = document.getElementById('productCategory');
    const editProductCatSelect = document.getElementById('editProductCategory');
    const parentCategorySelect = document.getElementById('parentCategorySelect');

    try {
        const qCat = query(collection(db, "categories"));
        const snapCat = await getDocs(qCat);
        allCategories = [];
        if(catTableBody) catTableBody.innerHTML = '';
        
        let catOptions = '<option value="الكل" selected>الكل (افتراضي)</option>';

        snapCat.forEach((docSnap) => {
            const cat = docSnap.data();
            cat.id = docSnap.id;
            allCategories.push(cat);
            
            if(catTableBody) {
                catTableBody.innerHTML += `
                    <tr>
                        <td>${cat.name}</td>
                        <td><button class="btn-delete" onclick="deleteCategory('${cat.id}')"><i class="fa-solid fa-trash"></i> حذف</button></td>
                    </tr>`;
            }
            catOptions += `<option value="${cat.name}">${cat.name}</option>`;
        });

        if(productCatSelect) productCatSelect.innerHTML = catOptions;
        if(editProductCatSelect) editProductCatSelect.innerHTML = catOptions;
        if(parentCategorySelect) parentCategorySelect.innerHTML = catOptions;

        const qSub = query(collection(db, "subCategories"));
        const snapSub = await getDocs(qSub);
        allSubCategories = [];
        if(subCatTableBody) subCatTableBody.innerHTML = '';

        if(snapSub.empty && subCatTableBody) {
            subCatTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا توجد أقسام فرعية</td></tr>';
        } else {
            snapSub.forEach((docSnap) => {
                const subCat = docSnap.data();
                subCat.id = docSnap.id;
                allSubCategories.push(subCat);
                
                if(subCatTableBody) {
                    const imageCell = subCat.imageUrl 
                        ? `<img src="${subCat.imageUrl}" alt="${subCat.name}" style="width:40px; height:40px; object-fit:cover; border-radius:5px;">`
                        : `<i class="fa-solid fa-image" style="color:#ccc; font-size:20px;"></i>`;
                    
                    subCatTableBody.innerHTML += `
                        <tr>
                            <td>${imageCell}</td>
                            <td>${subCat.name}</td>
                            <td><span style="font-size:12px; background:#eee; padding:3px 8px; border-radius:10px;">${subCat.parentCategory}</span></td>
                            <td><button class="btn-delete" onclick="deleteSubCategory('${subCat.id}')"><i class="fa-solid fa-trash"></i> حذف</button></td>
                        </tr>`;
                }
            });
        }
    } catch (error) {
        console.error("Error loading categories: ", error);
    }
}

const addCategoryForm = document.getElementById('addCategoryForm');
if(addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitCatBtn');
        btn.disabled = true;
        try {
            await addDoc(collection(db, "categories"), { name: document.getElementById('catName').value.trim() });
            addCategoryForm.reset();
            loadCategories();
            alert("تمت إضافة القسم الرئيسي بنجاح!");
        } catch (error) { 
            alert("حدث خطأ."); 
            console.error(error); 
        }
        btn.disabled = false;
    });
}

const addSubCategoryForm = document.getElementById('addSubCategoryForm');
if(addSubCategoryForm) {
    addSubCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitSubCatBtn');
        const imageFile = document.getElementById('subCatImageFile').files[0];
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
        
        try {
            let imageUrl = null;
            
            if (imageFile) {
                imageUrl = await uploadToImgBB(imageFile);
            }
            
            await addDoc(collection(db, "subCategories"), { 
                name: document.getElementById('subCatName').value.trim(),
                parentCategory: document.getElementById('parentCategorySelect').value,
                imageUrl: imageUrl
            });
            
            addSubCategoryForm.reset();
            loadCategories();
            alert("تمت إضافة القسم الفرعي بنجاح!");
        } catch (error) { 
            alert("حدث خطأ من فايربيس: " + error.message); 
            console.error(error); 
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> إضافة القسم الفرعي';
    });
}

window.deleteCategory = async function(id) {
    if (confirm('هل أنت متأكد من حذف القسم الرئيسي؟')) {
        await deleteDoc(doc(db, "categories", id));
        loadCategories();
    }
};

window.deleteSubCategory = async function(id) {
    if (confirm('هل أنت متأكد من حذف القسم الفرعي؟')) {
        await deleteDoc(doc(db, "subCategories", id));
        loadCategories();
    }
};

function updateSubCategoryDropdown(mainCatName, dropdownElementId) {
    const dropdown = document.getElementById(dropdownElementId);
    if(!dropdown) return;
    dropdown.innerHTML = '<option value="">بدون قسم فرعي</option>';
    
    const filteredSubs = allSubCategories.filter(sub => sub.parentCategory === mainCatName);
    filteredSubs.forEach(sub => {
        dropdown.innerHTML += `<option value="${sub.name}">${sub.name}</option>`;
    });
}

document.getElementById('productCategory')?.addEventListener('change', (e) => updateSubCategoryDropdown(e.target.value, 'productSubCategory'));
document.getElementById('editProductCategory')?.addEventListener('change', (e) => updateSubCategoryDropdown(e.target.value, 'editProductSubCategory'));

// ==========================================
// 7. إضافة منتج جديد
// ==========================================
const addProductForm = document.getElementById('addProductForm');
if(addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const imageFile = document.getElementById('productImageFile').files[0];
        
        if (!imageFile) {
            alert("من فضلك اختر صورة للمنتج");
            return;
        }

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري رفع الصورة وحفظ المنتج...';
        btn.disabled = true;

        try {
            const finalImageUrl = await uploadToImgBB(imageFile);

            const productPrice = Number(document.getElementById('productPrice').value);
            const oldPriceVal = document.getElementById('productOldPrice').value;
            const description = document.getElementById('productDesc').value.trim();

            const productData = {
                name: document.getElementById('productName').value.trim(),
                category: document.getElementById('productCategory').value || "الكل",
                subCategory: document.getElementById('productSubCategory').value || null,
                price: productPrice,
                oldPrice: oldPriceVal ? Number(oldPriceVal) : null,
                imageUrl: finalImageUrl,
                description: description || "",
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "products"), productData);
            
            addProductForm.reset();
            document.getElementById('productSubCategory').innerHTML = '<option value="">بدون قسم فرعي</option>';
            
            const successMsg = document.getElementById('successMessage');
            if(successMsg) {
                successMsg.style.display = 'block';
                setTimeout(() => successMsg.style.display = 'none', 3000);
            }
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الإضافة: " + error.message);
        } finally {
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج في قاعدة البيانات';
            btn.disabled = false;
        }
    });
}

// ==========================================
// 8. عرض وإدارة المنتجات
// ==========================================
async function loadAdminProducts() {
    const tableBody = document.getElementById('productsTableBody');
    if(!tableBody) return;
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

            const categoryDisplay = product.subCategory 
                ? `${product.category} <i class="fa-solid fa-angle-left" style="font-size:10px; margin:0 5px; color:#888;"></i> <span style="color:#007bff">${product.subCategory}</span>` 
                : product.category;

            tableBody.innerHTML += `
                <tr>
                    <td><img src="${product.imageUrl}" alt="${product.name}" width="50"></td>
                    <td>${product.name}</td>
                    <td>${categoryDisplay}</td>
                    <td>${priceCell}</td>
                    <td>
                        <button class="btn-edit" onclick="openEditModal('${product.id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-delete" onclick="deleteProduct('${product.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching products: ", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">حدث خطأ في جلب المنتجات.</td></tr>';
    }
}

window.deleteProduct = async function(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
        try {
            await deleteDoc(doc(db, "products", productId));
            loadAdminProducts();
        } catch (error) { 
            console.error(error); 
            alert('حدث خطأ أثناء الحذف.'); 
        }
    }
};

// ==========================================
// 9. تعديل المنتج (مودال)
// ==========================================
window.openEditModal = function(productId) {
    const product = allAdminProducts.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductCategory').value = product.category || "الكل";
    
    updateSubCategoryDropdown(product.category || "الكل", 'editProductSubCategory');
    document.getElementById('editProductSubCategory').value = product.subCategory || '';

    document.getElementById('editProductPrice').value = product.price || '';
    document.getElementById('editProductOldPrice').value = product.oldPrice || '';
    document.getElementById('editProductDesc').value = product.description || '';
    
    window.currentEditImageUrl = product.imageUrl || '';
    
    const imageFileInput = document.getElementById('editProductImageFile');
    if(imageFileInput) imageFileInput.value = '';

    document.getElementById('editModal').style.display = 'block';
};

document.getElementById('closeEditModal')?.addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});

window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

const editProductForm = document.getElementById('editProductForm');
if(editProductForm) {
    editProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('updateBtn');
        const imageFile = document.getElementById('editProductImageFile').files[0];
        const id = document.getElementById('editProductId').value;

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحديث...';

        try {
            let finalUrl = window.currentEditImageUrl;
            
            if (imageFile) {
                finalUrl = await uploadToImgBB(imageFile);
            }

            const newPrice = Number(document.getElementById('editProductPrice').value);
            const oldPriceVal = document.getElementById('editProductOldPrice').value;
            const oldPriceNum = oldPriceVal ? Number(oldPriceVal) : null;

            const updatedData = {
                name: document.getElementById('editProductName').value.trim(),
                category: document.getElementById('editProductCategory').value,
                subCategory: document.getElementById('editProductSubCategory').value || null,
                price: newPrice,
                oldPrice: (oldPriceNum && oldPriceNum > newPrice) ? oldPriceNum : null,
                description: document.getElementById('editProductDesc').value.trim() || "",
                imageUrl: finalUrl
            };

            await updateDoc(doc(db, "products", id), updatedData);
            alert("تم تحديث بيانات المنتج بنجاح!");
            document.getElementById('editModal').style.display = 'none';
            loadAdminProducts();
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء التحديث: " + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تحديث بيانات المنتج';
        }
    });
}