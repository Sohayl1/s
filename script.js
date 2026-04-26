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
    apiKey: "AIzaSyCKQuF48pvctCNNYq60o2IMNC5XiEHWqpI",
    authDomain: "nourlibrary.firebaseapp.com",
    projectId: "nourlibrary",
    storageBucket: "nourlibrary.firebasestorage.app",
    messagingSenderId: "799366924459",
    appId: "1:799366924459:web:8c02f6f0b98867607f8fee",
    measurementId: "G-MHHYJKL1XS"
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
const mobileAccountBtn = document.getElementById('mobileAccountBtn');
const mobileCategoriesBtn = document.getElementById('mobileCategoriesBtn');
const myOrdersBtn = document.getElementById('myOrdersBtn');
const ordersModal = document.getElementById('ordersModal');
const ordersList = document.getElementById('ordersList');

// قراءة السلة من الذاكرة المحلية (localStorage) عشان متتمسحش بين الصفحات
let cart = JSON.parse(localStorage.getItem('cart') || '[]'); 
updateCartUI(); // تحديث شكل السلة فوراً عند فتح الموقع

if (mobileAccountBtn) {
    mobileAccountBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        if (loginBtn && window.getComputedStyle(loginBtn).display !== 'none') {
            loginBtn.click(); 
        } else if (userProfileBtn && window.getComputedStyle(userProfileBtn).display !== 'none') {
            userProfileBtn.click(); 
        }
    });
}

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

const checkoutModal = document.getElementById('checkoutModal');

function closeAllModals() {
    if (overlay) overlay.style.display = 'none';
    if (loginModal) loginModal.style.display = 'none';
    if (signupModal) signupModal.style.display = 'none';
    if (cartModal) cartModal.style.display = 'none';
    if (ordersModal) ordersModal.style.display = 'none';
    if (checkoutModal) checkoutModal.style.display = 'none'; 
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
// 4. السلة والدفع
// ==========================================
function attachAddToCartEvents() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const card = this.closest('.card');
            
            // قراءة السعر النهائي فقط (تجاهل السعر المشطوب)
            const priceText = card.querySelector('.price').textContent.replace(/\D/g, '');

            const productData = {
                id: card.getAttribute('data-id'), 
                name: card.querySelector('h3').textContent,
                price: parseInt(priceText),
                image: card.querySelector('.product-img').style.backgroundImage.slice(5, -2).replace(/"/g, ""),
                quantity: 1
            };

            const existingProductIndex = cart.findIndex(item => item.id === productData.id);

            if (existingProductIndex > -1) {
                cart[existingProductIndex].quantity += 1;
            } else {
                cart.push(productData);
            }

            updateCartUI(); 

            const originalIcon = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => { this.innerHTML = originalIcon; }, 1000);
        });
    });
}

window.changeQuantity = function(index, delta) {
    if (cart[index].quantity + delta > 0) {
        cart[index].quantity += delta;
        updateCartUI();
    } else {
        window.removeFromCart(index);
    }
};

window.removeFromCart = function(index) {
    cart.splice(index, 1); 
    updateCartUI(); 
};

let discountPercent = 0;
window.applyPromoCode = function() {
    const inputEl = document.getElementById('promoCodeInput');
    if (!inputEl) return;
    const code = inputEl.value.trim().toUpperCase();
    const msg = document.getElementById('promoMsg');
    
    const validCodes = { 'NOUR10': 10, 'EID20': 20, 'FREE': 100 };

    if (validCodes[code]) {
        discountPercent = validCodes[code];
        msg.textContent = `تم تطبيق خصم ${discountPercent}% بنجاح!`;
        msg.style.color = "var(--success)";
        msg.style.display = "block";
    } else {
        discountPercent = 0;
        msg.textContent = "كود الخصم غير صالح أو منتهي!";
        msg.style.color = "var(--danger)";
        msg.style.display = "block";
    }
    updateCartUI();
    if(checkoutModal && checkoutModal.style.display === 'block') window.toggleCheckoutForm();
};

function updateCartUI() {
    // حفظ التعديلات في الذاكرة المحلية
    localStorage.setItem('cart', JSON.stringify(cart));

    const cartItemsContainer = document.querySelector('.cart-items');
    const totalPriceElement = document.querySelector('.total-price span:last-child');
    
    if(cartBadge) cartBadge.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    if(cartItemsContainer) cartItemsContainer.innerHTML = '';
    
    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        if(cartItemsContainer) {
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
        }
    });

    let discountAmount = total * (discountPercent / 100);
    let finalTotal = total - discountAmount;

    if(totalPriceElement) totalPriceElement.textContent = finalTotal + ' ج.م';
}

window.openCheckoutStep = function() {
    if (cart.length === 0) {
        alert("عربة التسوق فارغة!");
        return;
    }
    document.getElementById('cartModal').style.display = 'none';
    document.getElementById('checkoutModal').style.display = 'block';
    window.toggleCheckoutForm();
};

window.toggleCheckoutForm = function() {
    const methodEl = document.querySelector('input[name="checkoutMethod"]:checked');
    if (!methodEl) return; 
    const method = methodEl.value;
    const homeForm = document.getElementById('homeDeliveryForm');
    const pickupForm = document.getElementById('pickupForm');
    const homeCard = document.getElementById('chkHomeCard');
    const pickupCard = document.getElementById('chkPickupCard');
    
    let totalProductsPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = totalProductsPrice * (discountPercent / 100);
    let finalProductsPrice = totalProductsPrice - discountAmount;

    if (method === 'home') {
        homeForm.style.display = 'block';
        pickupForm.style.display = 'none';
        homeCard.classList.add('active');
        pickupCard.classList.remove('active');
        document.getElementById('vfTotal').textContent = finalProductsPrice + 30;
    } else {
        homeForm.style.display = 'none';
        pickupForm.style.display = 'block';
        pickupCard.classList.add('active');
        homeCard.classList.remove('active');
        document.getElementById('pickupTotal').textContent = finalProductsPrice;
    }
};

window.confirmFinalOrder = function() {
    alert("تم استلام طلبك بنجاح! جاري التجهيز.");
    cart = [];
    discountPercent = 0; 
    const promoInput = document.getElementById('promoCodeInput');
    const promoMsg = document.getElementById('promoMsg');
    if(promoInput) promoInput.value = '';
    if(promoMsg) promoMsg.style.display = 'none';
    
    updateCartUI();
    document.getElementById('checkoutModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
};

// ==========================================
// 5. جلب المنتجات (بالشكل الجديد: بادج + سعر قديم)
// ==========================================
async function fetchProducts() {
    const productsGrid = document.getElementById('productsGrid');
    const latestSlider = document.getElementById('latestProductsSlider'); 
    
    if(!productsGrid) return; 

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        productsGrid.innerHTML = '';
        if(latestSlider) latestSlider.innerHTML = ''; 
        
        if(querySnapshot.empty) {
            productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 50px; color: var(--gray);">لا توجد منتجات مضافة حتى الآن.</p>';
            if(latestSlider) latestSlider.innerHTML = '<p style="text-align: center; width: 100%;">لا توجد منتجات حديثة.</p>';
            return;
        }

        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        let recentProductsCount = 0;

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            
            // حساب السعر القديم لو موجود
            const priceHTML = product.oldPrice 
                ? `<span style="text-decoration:line-through; color:#999; font-size:12px; margin-left:5px;">${product.oldPrice}</span> <span class="price">${product.price} ج.م</span>`
                : `<span class="price">${product.price} ج.م</span>`;

            // بادج القسم الفرعي لو موجود
            const subCatBadge = product.subCategory 
                ? `<span style="position:absolute; top:10px; right:10px; background:var(--primary); color:#fff; font-size:10px; padding:3px 8px; border-radius:12px; z-index:2;">${product.subCategory}</span>` 
                : '';

            const card = `
                <div class="card" data-id="${doc.id}" data-category="${product.category}">
                    <a href="product.html?id=${doc.id}" class="product-link" style="position:relative; display:block;">
                        ${subCatBadge}
                        <div class="product-img" style="background-image: url('${product.imageUrl}'); background-size: cover; background-position: center;"></div>
                    </a>
                    <div class="card-content">
                        <a href="product.html?id=${doc.id}" class="product-link">
                            <h3>${product.name}</h3>
                        </a>
                        <p class="brand"><i class="fa-solid fa-tag"></i> الماركة: ${product.brand}</p>
                        <div class="card-footer">
                            <div>${priceHTML}</div>
                            <button class="add-to-cart-btn"><i class="fa-solid fa-cart-plus"></i></button>
                        </div>
                    </div>
                </div>
            `;
            
            productsGrid.innerHTML += card;

            if (product.createdAt) {
                const productDate = new Date(product.createdAt);
                if (productDate >= fiveDaysAgo) {
                    if(latestSlider) latestSlider.innerHTML += card;
                    recentProductsCount++;
                }
            }
        });

        if (latestSlider && recentProductsCount === 0) {
            latestSlider.innerHTML = '<p style="text-align: center; width: 100%; color: var(--gray); padding: 20px;">لم تتم إضافة منتجات جديدة في آخر 5 أيام.</p>';
        }

        attachAddToCartEvents();
        if(latestSlider) setupAutoScroll(latestSlider, 1, 30);

    } catch (error) {
        productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 50px; color: var(--danger);">حدث خطأ أثناء تحميل المنتجات.</p>';
        console.error(error);
    }
}
fetchProducts();

// ==========================================
// 6. جلب الأقسام الرئيسية 
// ==========================================
async function fetchStoreCategories() {
    const dropdown = document.getElementById('categoriesDropdown');
    const slider = document.getElementById('categoriesSlider');
    
    if(!dropdown || !slider) return;

    try {
        const q = query(collection(db, "categories"));
        const querySnapshot = await getDocs(q);
        
        dropdown.innerHTML = '';
        slider.innerHTML = '<div class="sub-cat active" onclick="window.filterProducts(\'all\', this)"><i class="fa-solid fa-border-all"></i> الكل</div>';

        querySnapshot.forEach((docSnap) => {
            const cat = docSnap.data();
            const catUrl = `category.html?name=${encodeURIComponent(cat.name)}`;
            
            dropdown.innerHTML += `<a href="${catUrl}"><i class="${cat.icon || 'fa-solid fa-tag'}"></i> ${cat.name}</a>`;
            slider.innerHTML += `<a href="${catUrl}" class="sub-cat" style="text-decoration:none;"><i class="${cat.icon || 'fa-solid fa-tag'}"></i> ${cat.name}</a>`;
        });
    } catch (error) {
        console.error("Error fetching categories: ", error);
    }
}
fetchStoreCategories();

window.filterProducts = function(categoryName, element = null) {
    if (element) {
        document.querySelectorAll('#categoriesSlider .sub-cat').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }
    const allCards = document.querySelectorAll('#productsGrid .card');
    allCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (categoryName === 'all' || cardCategory === categoryName) {
            card.style.display = 'block'; 
        } else {
            card.style.display = 'none'; 
        }
    });
    const categoriesDropdown = document.getElementById('categoriesDropdown');
    if (categoriesDropdown) categoriesDropdown.classList.remove('show');
};

// ==========================================
// 7. سكرول السلايدر والطلبات السابقة
// ==========================================
function setupAutoScroll(sliderElement, scrollAmount = 1, interval = 30) {
    if (!sliderElement) return;
    let isHovered = false;
    sliderElement.addEventListener('mouseenter', () => isHovered = true);
    sliderElement.addEventListener('mouseleave', () => isHovered = false);
    sliderElement.addEventListener('touchstart', () => isHovered = true, { passive: true });
    sliderElement.addEventListener('touchend', () => isHovered = false);

    setInterval(() => {
        if (!isHovered && sliderElement.scrollWidth > sliderElement.clientWidth) {
            let startPos = sliderElement.scrollLeft;
            sliderElement.scrollBy({ left: -scrollAmount });
            if (sliderElement.scrollLeft === startPos) {
                sliderElement.scrollLeft = 0; 
            }
        }
    }, interval);
}

const scrollRightBtn = document.getElementById('scrollRightBtn');
const scrollLeftBtn = document.getElementById('scrollLeftBtn');
const sliderControlsElement = document.getElementById('latestProductsSlider');

if (scrollRightBtn && sliderControlsElement) {
    scrollRightBtn.addEventListener('click', () => sliderControlsElement.scrollBy({ left: 300, behavior: 'smooth' }));
}
if (scrollLeftBtn && sliderControlsElement) {
    scrollLeftBtn.addEventListener('click', () => sliderControlsElement.scrollBy({ left: -300, behavior: 'smooth' }));
}

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