import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
// إضافة مكتبة المصادقة
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
const auth = getAuth(app); // تهيئة المصادقة

// التحقق من حالة تسجيل الدخول للمدير
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.warn("تنبيه: أنت لست مسجل الدخول، قد يرفض فايربيس إضافة المنتجات.");
    } else {
        console.log("مرحباً بالمدير:", user.email);
    }
});

// ==========================================
// 1. نظام التنقل بين التابات وجلب البيانات
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

        if(targetId === 'manage-products-section') {
            loadAdminProducts();
        }
    });
});

// ==========================================
// 2. إضافة منتج
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
    const productCategory = document.getElementById('productCategory').value;
    const productPrice = Number(document.getElementById('productPrice').value);
    const productImage = document.getElementById('productImage').value;
    const productDesc = document.getElementById('productDesc').value;

    try {
        await addDoc(collection(db, "products"), {
            name: productName,
            brand: productBrand,
            category: productCategory,
            price: productPrice,
            imageUrl: productImage,
            description: productDesc,
            createdAt: new Date().toISOString()
        });

        form.reset();
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
// 3. عرض المنتجات وتفعيل أزرار التعديل والحذف
// ==========================================
let allAdminProducts = []; // مصفوفة لتخزين البيانات عشان نستخدمها في التعديل

async function loadAdminProducts() {
    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        tableBody.innerHTML = ''; 
        allAdminProducts = []; // تفريغ المصفوفة القديمة
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد منتجات مضافة حتى الآن.</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            product.id = doc.id; // نحتفظ بالـ ID
            allAdminProducts.push(product); // نحفظه في المصفوفة

            const row = `
                <tr>
                    <td><img src="${product.imageUrl}" alt="${product.name}"></td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${product.price} ج.م</td>
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
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error fetching products: ", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">حدث خطأ في جلب المنتجات.</td></tr>';
    }
}

// ==========================================
// 4. حذف المنتج
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
// 5. برمجة التعديل (Edit Logic)
// ==========================================
// دالة فتح نافذة التعديل وتعبئتها بالبيانات
window.openEditModal = function(productId) {
    const product = allAdminProducts.find(p => p.id === productId); // البحث عن المنتج في المصفوفة
    
    if(product) {
        // وضع البيانات في الحقول
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductBrand').value = product.brand;
        document.getElementById('editProductCategory').value = product.category;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductImage').value = product.imageUrl;
        document.getElementById('editProductDesc').value = product.description;

        // إظهار النافذة
        document.getElementById('editModal').style.display = 'block';
    }
};

// إغلاق النافذة
document.getElementById('closeEditModal').onclick = function() {
    document.getElementById('editModal').style.display = 'none';
};

// حفظ التعديلات في الفايربيس
const editForm = document.getElementById('editProductForm');
const updateBtn = document.getElementById('updateBtn');

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    updateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحديث...';
    updateBtn.disabled = true;

    const id = document.getElementById('editProductId').value;
    
    const updatedData = {
        name: document.getElementById('editProductName').value,
        brand: document.getElementById('editProductBrand').value,
        category: document.getElementById('editProductCategory').value,
        price: Number(document.getElementById('editProductPrice').value),
        imageUrl: document.getElementById('editProductImage').value,
        description: document.getElementById('editProductDesc').value
    };

    try {
        const productRef = doc(db, "products", id);
        await updateDoc(productRef, updatedData); // أمر التعديل للفايربيس
        
        alert("تم تحديث بيانات المنتج بنجاح!");
        document.getElementById('editModal').style.display = 'none'; // إغلاق النافذة
        loadAdminProducts(); // تحديث الجدول عشان يظهر التعديل
    } catch(error) {
        console.error("Error updating product: ", error);
        alert("حدث خطأ أثناء تحديث البيانات.");
    } finally {
        updateBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تحديث بيانات المنتج';
        updateBtn.disabled = false;
    }
});

// ==========================================
// إدارة الأقسام (Categories)
// ==========================================
const addCategoryForm = document.getElementById('addCategoryForm');
const submitCatBtn = document.getElementById('submitCatBtn');

// دالة لجلب الأقسام وعرضها في الجدول وتحديث حقول الـ Select
async function loadCategories() {
    const tableBody = document.getElementById('categoriesTableBody');
    const productCatSelect = document.getElementById('productCategory');
    const editProductCatSelect = document.getElementById('editProductCategory');
    
    if(tableBody) tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';
    
    try {
        const q = query(collection(db, "categories"));
        const querySnapshot = await getDocs(q);
        
        if(tableBody) tableBody.innerHTML = '';
        productCatSelect.innerHTML = '<option value="" disabled selected>اختر القسم</option>';
        editProductCatSelect.innerHTML = '<option value="" disabled selected>اختر القسم</option>';

        if (querySnapshot.empty && tableBody) {
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">لا توجد أقسام مضافة.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const cat = docSnap.data();
            cat.id = docSnap.id;

            // إضافة للجدول
            if(tableBody) {
                tableBody.innerHTML += `
                    <tr>
                        <td><i class="${cat.icon}" style="font-size: 20px; color: var(--primary);"></i></td>
                        <td>${cat.name}</td>
                        <td>
                            <button class="btn-delete" onclick="deleteCategory('${cat.id}')">
                                <i class="fa-solid fa-trash"></i> حذف
                            </button>
                        </td>
                    </tr>
                `;
            }

            // إضافة لقوائم اختيار المنتجات
            const optionHTML = `<option value="${cat.name}">${cat.name}</option>`;
            productCatSelect.innerHTML += optionHTML;
            editProductCatSelect.innerHTML += optionHTML;
        });
    } catch (error) {
        console.error("Error loading categories: ", error);
        if(tableBody) tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">خطأ في تحميل الأقسام.</td></tr>';
    }
}

// إضافة قسم جديد
if(addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitCatBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإضافة...';
        submitCatBtn.disabled = true;

        const name = document.getElementById('catName').value;
        const icon = document.getElementById('catIcon').value;

        try {
            await addDoc(collection(db, "categories"), { name, icon });
            addCategoryForm.reset();
            loadCategories(); // تحديث القوائم والجدول
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

// حذف قسم
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

// استدعاء الدالة عند تحميل صفحة الأدمن
loadCategories();