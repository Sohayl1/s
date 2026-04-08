import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, orderBy, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    updateProfile, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

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
const analytics = getAnalytics(app); 
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ==========================================
// 1. تعريف عناصر الـ DOM الأساسية
// ==========================================
const categoriesBtn = document.getElementById('categoriesBtn');
const categoriesDropdown = document.getElementById('categoriesDropdown');
const loginBtn = document.getElementById('loginBtn');
const userProfileBtn = document.getElementById('userProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userNameDisplay = document.getElementById('userNameDisplay');
const cartBtn = document.getElementById('cartBtn');
const overlay = document.getElementById('overlay');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const cartModal = document.getElementById('cartModal');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const cartBadge = document.querySelector('.cart-badge');
const navItems = document.querySelectorAll('.nav-item');
const mobileAccountBtn = document.getElementById('mobileAccountBtn');
const mobileCategoriesBtn = document.getElementById('mobileCategoriesBtn');
const myOrdersBtn = document.getElementById('myOrdersBtn');
const ordersModal = document.getElementById('ordersModal');
const ordersList = document.getElementById('ordersList');

// مصفوفة السلة
let cart = []; 

// ==========================================
// 2. نظام تسجيل الدخول والحسابات
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(userProfileBtn) userProfileBtn.style.display = 'inline-block';
        if(logoutBtn) logoutBtn.style.display = 'inline-block';
        if(myOrdersBtn) myOrdersBtn.style.display = 'inline-block';
        if(userNameDisplay) userNameDisplay.textContent = user.displayName || 'حسابي';
        closeAllModals(); 
    } else {
        if(loginBtn) loginBtn.style.display = 'inline-block';
        if(userProfileBtn) userProfileBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(myOrdersBtn) myOrdersBtn.style.display = 'none';
    }
});

const googleLoginBtn = document.getElementById('googleLoginBtn');
if(googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            alert("تم تسجيل الدخول بجوجل بنجاح!");
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الدخول بجوجل.");
        }
    });
}

const doSignupBtn = document.getElementById('doSignupBtn');
if(doSignupBtn) {
    doSignupBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        if(!name || !email || !password) return alert("يرجى ملء جميع الحقول");

        const originalText = doSignupBtn.textContent;
        doSignupBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإنشاء...';

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            alert("تم إنشاء حسابك بنجاح!");
        } catch (error) {
            console.error(error);
            alert("خطأ: " + error.message);
        } finally {
            doSignupBtn.textContent = originalText;
        }
    });
}

const doLoginBtn = document.getElementById('doLoginBtn');
if(doLoginBtn) {
    doLoginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if(!email || !password) return alert("يرجى إدخال البريد وكلمة المرور");

        const originalText = doLoginBtn.textContent;
        doLoginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الدخول...';

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error(error);
            alert("بيانات الدخول غير صحيحة!");
        } finally {
            doLoginBtn.textContent = originalText;
        }
    });
}

if(logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            alert("تم تسجيل الخروج");
        } catch (error) {
            console.error(error);
        }
    });
}

// ==========================================
// 3. النوافذ المنبثقة والقوائم
// ==========================================
function openModal(modal) {
    if (overlay && modal) {
        overlay.style.display = 'block';
        modal.style.display = 'block';
    }
}

function closeAllModals() {
    if (overlay) overlay.style.display = 'none';
    if (loginModal) loginModal.style.display = 'none';
    if (signupModal) signupModal.style.display = 'none';
    if (cartModal) cartModal.style.display = 'none';
    if (ordersModal) ordersModal.style.display = 'none';
    if (mobileAccountBtn) mobileAccountBtn.classList.remove('active');
}

if (loginBtn) loginBtn.addEventListener('click', () => { closeAllModals(); openModal(loginModal); });
if (cartBtn) cartBtn.addEventListener('click', () => { closeAllModals(); openModal(cartModal); });
if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => { closeAllModals(); openModal(loginModal); });
if (overlay) overlay.addEventListener('click', closeAllModals);

if (showSignup) showSignup.addEventListener('click', () => { loginModal.style.display = 'none'; openModal(signupModal); });
if (showLogin) showLogin.addEventListener('click', () => { signupModal.style.display = 'none'; openModal(loginModal); });

if (categoriesBtn) {
    categoriesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        categoriesDropdown.classList.toggle('show');
    });
}

window.addEventListener('click', (e) => {
    if (categoriesDropdown && categoriesDropdown.classList.contains('show')) {
        if (!e.target.closest('.dropdown-content') && !e.target.closest('#mobileCategoriesBtn') && !e.target.closest('#categoriesBtn')) {
            categoriesDropdown.classList.remove('show');
            if (mobileCategoriesBtn) mobileCategoriesBtn.classList.remove('active');
        }
    }
});

// ==========================================
// 4. منطق سلة المشتريات (الإصدار المصحح بالكامل)
// ==========================================
function attachAddToCartEvents() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const card = this.closest('.card');
            
            // التأكد من جلب البيانات بشكل سليم
            const productData = {
                id: card.getAttribute('data-id'), 
                name: card.querySelector('h3').textContent,
                price: parseInt(card.querySelector('.price').textContent.replace(/\D/g, '')),
                image: card.querySelector('.product-img').style.backgroundImage.slice(5, -2).replace(/"/g, ""),
                quantity: 1
            };

            if(!productData.id) {
                console.error("Error: Product ID is missing!");
                return;
            }

            const existingProductIndex = cart.findIndex(item => item.id === productData.id);

            if (existingProductIndex > -1) {
                cart[existingProductIndex].quantity += 1;
            } else {
                cart.push(productData);
            }

            updateCartUI(); 

            // تأثير زرار الـ Check
            const originalIcon = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => { this.innerHTML = originalIcon; }, 1000);
        });
    });
}

function updateCartUI() {
    const cartItemsContainer = document.querySelector('.cart-items');
    const totalPriceElement = document.querySelector('.total-price span:last-child');
    const cartBadge = document.querySelector('.cart-badge');

    if(cartBadge) cartBadge.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        cartItemsContainer.innerHTML += `
            <div class="cart-item">
                <div class="item-info">
                    <img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
                    <div>
                        <h4>${item.name}</h4>
                        <span class="item-price">${item.price} ج.م</span>
                    </div>
                </div>
                <div class="item-actions">
                    <div class="quantity-control">
                        <button onclick="window.changeQuantity(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                        <span>${item.quantity}</span>
                        <button onclick="window.changeQuantity(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <button onclick="window.removeFromCart(${index})" class="delete-btn"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });

    const delivery = cart.length > 0 ? 30 : 0;
    if(totalPriceElement) totalPriceElement.textContent = (total + delivery) + ' ج.م';
}

// الدوال العامة (Global) لتعمل من داخل الـ HTML بشكل صحيح
window.changeQuantity = function(index, delta) {
    if (cart[index].quantity + delta > 0) {
        cart[index].quantity += delta;
        updateCartUI();
    } else {
        // لو الكمية وصلت لصفر، احذف المنتج
        window.removeFromCart(index);
    }
};

window.removeFromCart = function(index) {
    cart.splice(index, 1); 
    updateCartUI(); 
};

// ==========================================
// 5. جلب المنتجات والطلبات
// ==========================================
async function fetchProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if(!productsGrid) return; 

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        productsGrid.innerHTML = '';
        
        if(querySnapshot.empty) {
            productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 50px; color: var(--gray);">لا توجد منتجات مضافة حتى الآن.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            // تم إضافة data-id="${doc.id}" لحل مشكلة السلة
            const card = `
                <div class="card" data-id="${doc.id}">
                    <a href="product.html?id=${doc.id}" class="product-link">
                        <div class="product-img" style="background-image: url('${product.imageUrl}'); background-size: cover; background-position: center;"></div>
                    </a>
                    <div class="card-content">
                        <a href="product.html?id=${doc.id}" class="product-link">
                            <h3>${product.name}</h3>
                        </a>
                        <p class="brand"><i class="fa-solid fa-tag"></i> الماركة: ${product.brand}</p>
                        <div class="card-footer">
                            <span class="price">${product.price} ج.م</span>
                            <button class="add-to-cart-btn"><i class="fa-solid fa-cart-plus"></i></button>
                        </div>
                    </div>
                </div>
            `;
            productsGrid.innerHTML += card;
        });
        
        // ربط أزرار "أضف للسلة" بعد تحميل المنتجات
        attachAddToCartEvents();

    } catch (error) {
        productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 50px; color: var(--danger);">حدث خطأ أثناء تحميل المنتجات.</p>';
        console.error(error);
    }
}

fetchProducts();

async function fetchMyOrders() {
    const user = auth.currentUser;
    if (!user) return;
    ordersList.innerHTML = '<p style="text-align: center;">جاري التحميل...</p>';
    try {
        const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("orderDate", "desc"));
        const querySnapshot = await getDocs(q);
        ordersList.innerHTML = querySnapshot.empty ? '<p style="text-align: center;">لا توجد طلبات سابقة.</p>' : '';
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            ordersList.innerHTML += `
                <div class="order-card">
                    <div class="order-header"><strong>طلب #${doc.id.substring(0,6).toUpperCase()}</strong></div>
                    <p>الإجمالي: ${order.totalAmount} ج.م</p>
                </div>`;
        });
    } catch (e) { 
        console.error(e); 
        ordersList.innerHTML = '<p style="color:red; text-align:center;">حدث خطأ في تحميل الطلبات</p>';
    }
}

if(myOrdersBtn) {
    myOrdersBtn.addEventListener('click', () => {
        closeAllModals();
        openModal(ordersModal);
        fetchMyOrders();
    });
}