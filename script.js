import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
// مكتبات الـ Auth مع إضافة GoogleAuthProvider و Popup
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
const googleProvider = new GoogleAuthProvider(); // تعريف محرك جوجل

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

// ==========================================
// 2. نظام تسجيل الدخول والحسابات (Authentication)
// ==========================================

// مراقبة حالة المستخدم (هل هو مسجل دخول ولا لأ؟)
onAuthStateChanged(auth, (user) => {
    if (user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(userProfileBtn) userProfileBtn.style.display = 'inline-block';
        if(logoutBtn) logoutBtn.style.display = 'inline-block';
        if(userNameDisplay) userNameDisplay.textContent = user.displayName || 'حسابي';
        closeAllModals(); 
    } else {
        if(loginBtn) loginBtn.style.display = 'inline-block';
        if(userProfileBtn) userProfileBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'none';
    }
});

// وظيفة الدخول بجوجل (Google Login)
const googleLoginBtn = document.getElementById('googleLoginBtn');
if(googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            alert("تم تسجيل الدخول بجوجل بنجاح!");
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء الدخول بجوجل، تأكد من فتح الموقع عبر سيرفر.");
        }
    });
}

// وظيفة إنشاء حساب جديد (Sign Up)
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

// وظيفة تسجيل الدخول (Log In)
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

// وظيفة تسجيل الخروج
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
// 3. باقي أكواد الـ UI (القوائم والنافذة المنبثقة)
// ==========================================
if (window.innerWidth <= 768 && categoriesDropdown) document.body.appendChild(categoriesDropdown);

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
    if (mobileAccountBtn) mobileAccountBtn.classList.remove('active');
}

if (loginBtn) loginBtn.addEventListener('click', () => { closeAllModals(); openModal(loginModal); });
if (cartBtn) cartBtn.addEventListener('click', () => { closeAllModals(); openModal(cartModal); });
if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => { closeAllModals(); openModal(loginModal); });
if (overlay) overlay.addEventListener('click', closeAllModals);

if (showSignup) {
    showSignup.addEventListener('click', () => { 
        loginModal.style.display = 'none'; 
        openModal(signupModal); 
    });
}

if (showLogin) {
    showLogin.addEventListener('click', () => { 
        signupModal.style.display = 'none'; 
        openModal(loginModal); 
    });
}

if (mobileAccountBtn) {
    mobileAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllModals();
        openModal(loginModal);
        navItems.forEach(item => item.classList.remove('active'));
        mobileAccountBtn.classList.add('active');
    });
}

if (mobileCategoriesBtn) {
    mobileCategoriesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAllModals();
        if (categoriesDropdown) categoriesDropdown.classList.toggle('show');
        navItems.forEach(item => item.classList.remove('active'));
        if (categoriesDropdown && categoriesDropdown.classList.contains('show')) {
            mobileCategoriesBtn.classList.add('active');
        }
    });
}

const homeBtn = document.querySelector('.nav-item[href="index.html"]');
if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        navItems.forEach(item => item.classList.remove('active'));
        homeBtn.classList.add('active');
    });
}

document.querySelectorAll('.sub-cat').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.sub-cat').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
    });
});

// ==========================================
// 4. منطق سلة المشتريات (Cart Logic)
// ==========================================
function updateCartTotal() {
    let total = 0;
    const cartItems = document.querySelectorAll('.cart-item');
    
    cartItems.forEach(item => {
        const priceElement = item.querySelector('.item-price');
        const quantityElement = item.querySelector('.quantity-control span');
        if (priceElement && quantityElement) {
            const price = parseInt(priceElement.textContent.replace(/\D/g, ''));
            const quantity = parseInt(quantityElement.textContent);
            total += price * quantity;
        }
    });

    const deliveryElement = document.querySelector('.free-delivery');
    const delivery = cartItems.length > 0 ? 30 : 0;
    const finalTotal = cartItems.length > 0 ? total + delivery : 0;

    const totalElement = document.querySelector('.total-price span:last-child');
    if (totalElement) totalElement.textContent = finalTotal + ' ج.م';
    if (cartBadge) cartBadge.textContent = cartItems.length;
}

// أزرار الكمية والحذف للسلة
document.querySelectorAll('.quantity-control').forEach(control => {
    const minusBtn = control.querySelector('button:first-child');
    const plusBtn = control.querySelector('button:last-child');
    const quantitySpan = control.querySelector('span');

    if(minusBtn && quantitySpan) minusBtn.addEventListener('click', () => {
        let currentQuantity = parseInt(quantitySpan.textContent);
        if (currentQuantity > 1) { quantitySpan.textContent = currentQuantity - 1; updateCartTotal(); }
    });

    if(plusBtn && quantitySpan) plusBtn.addEventListener('click', () => {
        quantitySpan.textContent = parseInt(quantitySpan.textContent) + 1;
        updateCartTotal();
    });
});

document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const cartItem = this.closest('.cart-item');
        if (cartItem) {
            cartItem.style.opacity = '0';
            cartItem.style.transform = 'translateX(-20px)';
            cartItem.style.transition = 'all 0.3s ease';
            setTimeout(() => { cartItem.remove(); updateCartTotal(); }, 300);
        }
    });
});

// ==========================================
// 5. جلب المنتجات من الفاير بيس
// ==========================================
function attachAddToCartEvents() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const originalIcon = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-check"></i>';
            this.style.backgroundColor = 'var(--primary)';
            this.style.color = 'var(--white)';
            
            if (cartBadge) cartBadge.textContent = parseInt(cartBadge.textContent) + 1;

            setTimeout(() => {
                this.innerHTML = originalIcon;
                this.style.backgroundColor = '';
                this.style.color = '';
            }, 1500);
        });
    });
}

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
            const card = `
                <div class="card">
                    <div class="product-img" style="background-image: url('${product.imageUrl}'); background-size: cover; background-position: center;"></div>
                    <div class="card-content">
                        <h3>${product.name}</h3>
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
        attachAddToCartEvents();
    } catch (error) {
        productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 50px; color: var(--danger);">حدث خطأ أثناء تحميل المنتجات.</p>';
        console.error(error);
    }
}

fetchProducts();