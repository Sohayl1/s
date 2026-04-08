import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, orderBy, query } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyDuVrnqnfRS9XdUzQMgKQtZWExxxDbqQmw",
    authDomain: "nourstationary.firebaseapp.com",
    projectId: "nourstationary",
    storageBucket: "nourstationary.firebasestorage.app",
    messagingSenderId: "168335781622",
    appId: "1:168335781622:web:53fd3e8035b0e00f3ac6d7",
    measurementId: "G-6RXWE2BR7Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

        // لو فتح تاب "إدارة المنتجات"، روح هات الداتا من الفايربيس
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
        alert("حدث خطأ أثناء حفظ المنتج، تأكد من اتصالك بالإنترنت.");
    } finally {
        submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج في قاعدة البيانات';
        submitBtn.disabled = false;
    }
});

// ==========================================
// 3. عرض المنتجات في جدول الإدارة
// ==========================================
async function loadAdminProducts() {
    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        tableBody.innerHTML = ''; // مسح علامة التحميل
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد منتجات مضافة حتى الآن.</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const row = `
                <tr>
                    <td><img src="${product.imageUrl}" alt="${product.name}"></td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${product.price} ج.م</td>
                    <td>
                        <button class="btn-delete" onclick="deleteProduct('${doc.id}')">
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
// 4. دالة حذف المنتج (جعلها متاحة عالمياً)
// ==========================================
window.deleteProduct = async function(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
        try {
            await deleteDoc(doc(db, "products", productId));
            alert('تم الحذف بنجاح!');
            loadAdminProducts(); // إعادة تحميل الجدول بعد الحذف
        } catch (error) {
            console.error("Error deleting product: ", error);
            alert('حدث خطأ أثناء الحذف.');
        }
    }
};