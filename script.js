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
const navItems = document.querySelectorAll('.nav-item');
// ربط زرار "حسابي" في الموبايل
const mobileAccountBtn = document.getElementById('mobileAccountBtn');

if (mobileAccountBtn) {
    mobileAccountBtn.addEventListener('click', (e) => {
        e.preventDefault(); // عشان نمنع الرابط (#) إنه يرفع الصفحة لفوق
        
        const loginBtn = document.getElementById('loginBtn');
        const userProfileBtn = document.getElementById('userProfileBtn');
        
        // لو زرار "تسجيل الدخول" العادي ظاهر (يعني اليوزر لسه مسجلش دخول)
        if (loginBtn && window.getComputedStyle(loginBtn).display !== 'none') {
            loginBtn.click(); // بنعمل Click وهمي على زرار الديسكتوب
        } 
        // لو اليوزر مسجل دخول بالفعل (يعني زرار البروفايل هو اللي ظاهر)
        else if (userProfileBtn && window.getComputedStyle(userProfileBtn).display !== 'none') {
            userProfileBtn.click(); 
        }
    });
}

const mobileCategoriesBtn = document.getElementById('mobileCategoriesBtn');
const myOrdersBtn = document.getElementById('myOrdersBtn');
const ordersModal = document.getElementById('ordersModal');
const ordersList = document.getElementById('ordersList');

// ---- منطق السلة (Global Cart Logic) ----
let cart = [];
try {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (!Array.isArray(cart)) cart = [];
} catch(e) {
    cart = [];
}
let discountPercent = 0;
updateCartUI();

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
// 4. منطق سلة المشتريات (Global)
// ==========================================
window.attachAddToCartEvents = function() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.removeEventListener('click', handleAddToCart);
        btn.addEventListener('click', handleAddToCart);
    });
}

function handleAddToCart(e) {
    e.preventDefault();
    const card = this.closest('.card');
    
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

    const originalIcon = this.innerHTML;
    this.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => { this.innerHTML = originalIcon; }, 1000);
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

window.applyPromoCode = function() {
    const inputEl = document.getElementById('promoCodeInput');
    if (!inputEl) return;
    
    const code = inputEl.value.trim().toUpperCase();
    const msg = document.getElementById('promoMsg');
    
    const validCodes = {
        'NOUR10': 10,
        'EID20': 20,
        'FREE': 100
    };

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
    
    const checkoutModal = document.getElementById('checkoutModal');
    if(checkoutModal && checkoutModal.style.display === 'block') {
        window.toggleCheckoutForm();
    }
};

function updateCartUI() {
    try { localStorage.setItem('cart', JSON.stringify(cart)); } catch(e) {}
    
    const cartItemsContainer = document.querySelector('.cart-items');
    const totalPriceElement = document.querySelector('.total-price span:last-child');
    const cartBadge = document.querySelector('.cart-badge');

    if(cartBadge) cartBadge.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    
    let total = 0;
    
    if(cartItemsContainer) {
        cartItemsContainer.innerHTML = '';
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
    } else {
        cart.forEach(item => { total += item.price * item.quantity; });
    }

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

window.confirmFinalOrder = async function() {
    const user = auth.currentUser;
    
    if (!user) {
        alert("يجب تسجيل الدخول أولاً لإتمام الطلب!");
        return;
    }
    
    // التحقق من البيانات
    const methodEl = document.querySelector('input[name="checkoutMethod"]:checked');
    if (!methodEl) {
        alert("يرجى اختيار طريقة الاستلام");
        return;
    }
    
    const method = methodEl.value;
    let phone = '', address = '';
    
    if (method === 'home') {
        phone = document.getElementById('vfPhone')?.value || '';
        address = document.getElementById('vfAddress')?.value || '';
        if (!phone || !address) {
            alert("يرجى إدخال رقم الهاتف والعنوان للتوصيل");
            return;
        }
    }
    
    // حساب الإجمالي
    let totalProductsPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = totalProductsPrice * (discountPercent / 100);
    let finalTotal = totalProductsPrice - discountAmount;
    
    if (method === 'home') finalTotal += 30; // رسوم التوصيل
    
    const orderData = {
        userId: user.uid,
        customerName: user.displayName || 'عميل',
        customerEmail: user.email || '',
        phone: phone,
        address: address,
        items: [...cart], // نسخة من المنتجات
        totalAmount: finalTotal,
        discountPercent: discountPercent,
        paymentMethod: method === 'home' ? 'vodafone' : 'pickup',
        status: 'pending', // pending, completed, cancelled
        orderDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    
    try {
        // حفظ الطلب في فايربيس
        await addDoc(collection(db, "orders"), orderData);
        
        
        alert("🎉 تم استلام طلبك بنجاح! رقم الطلب قيد المراجعة.");
        
        // تفريغ السلة
        cart = [];
        discountPercent = 0;
        
        const promoInput = document.getElementById('promoCodeInput');
        const promoMsg = document.getElementById('promoMsg');
        if(promoInput) promoInput.value = '';
        if(promoMsg) promoMsg.style.display = 'none';
        
        updateCartUI();
        document.getElementById('checkoutModal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        
    } catch (error) {
        console.error("Error placing order:", error);
        alert("حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.");
    }
};

// ==========================================
// جلب المنتجات للصفحة الرئيسية
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
            
            const priceHTML = product.oldPrice 
                ? `<span style="text-decoration:line-through; color:#999; font-size:12px; margin-left:5px;">${product.oldPrice}</span> <span class="price">${product.price} ج.م</span>`
                : `<span class="price">${product.price} ج.م</span>`;

            const subCatBadge = product.subCategory 
                ? `<span style="position:absolute; top:10px; right:10px; background:var(--primary); color:#fff; font-size:10px; padding:3px 8px; border-radius:12px; z-index:2;">${product.subCategory}</span>` 
                : '';

            const card = `
                <div class="card" data-id="${doc.id}" data-category="${product.category}" data-subcategory="${product.subCategory || ''}">
                    <a href="product.html?id=${doc.id}" class="product-link" style="position:relative; display:block;">
                        ${subCatBadge}
                        <div class="product-img" style="background-image: url('${product.imageUrl}'); background-size: cover; background-position: center;"></div>
                    </a>
                    <div class="card-content">
                        <a href="product.html?id=${doc.id}" class="product-link">
                            <h3>${product.name}</h3>
                        </a>
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

        window.attachAddToCartEvents();

        if(latestSlider) setupAutoScroll(latestSlider, 1, 30);

    } catch (error) {
        productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 50px; color: var(--danger);">حدث خطأ أثناء تحميل المنتجات.</p>';
        console.error(error);
    }
}

fetchProducts();

// ==========================================
// برمجة أسهم التمرير
// ==========================================
const scrollRightBtn = document.getElementById('scrollRightBtn');
const scrollLeftBtn = document.getElementById('scrollLeftBtn');
const sliderControlsElement = document.getElementById('latestProductsSlider');

if (scrollRightBtn && sliderControlsElement) {
    scrollRightBtn.addEventListener('click', () => {
        sliderControlsElement.scrollBy({ left: 300, behavior: 'smooth' });
    });
}

if (scrollLeftBtn && sliderControlsElement) {
    scrollLeftBtn.addEventListener('click', () => {
        sliderControlsElement.scrollBy({ left: -300, behavior: 'smooth' });
    });
}

// ==========================================
// جلب طلبات المستخدم
// ==========================================
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

// ==========================================
// جلب الأقسام الديناميكية وعمل الفلترة
// ==========================================
async function fetchStoreCategories() {
    const dropdown = document.getElementById('categoriesDropdown');
    const slider = document.getElementById('categoriesSlider');
    
    if(!dropdown || !slider) return;

    try {
        const q = query(collection(db, "categories"));
        const querySnapshot = await getDocs(q);
        
        dropdown.innerHTML = '';
        slider.innerHTML = '<div class="sub-cat active" onclick="window.filterProducts(\'all\', this)">الكل</div>';

        querySnapshot.forEach((docSnap) => {
            const cat = docSnap.data();
            const catUrl = `category.html?name=${encodeURIComponent(cat.name)}`;
            
            dropdown.innerHTML += `
                <a href="${catUrl}">
                    <i class="${cat.icon}"></i> ${cat.name}
                </a>
            `;
            
            slider.innerHTML += `
                <a href="${catUrl}" class="sub-cat" style="text-decoration:none;">
                    <i class="${cat.icon}"></i> ${cat.name}
                </a>
            `;
        });
    } catch (error) {
        console.error("Error fetching categories: ", error);
    }
}

fetchStoreCategories();

window.filterProducts = function(filterName, element = null) {
    if (element) {
        document.querySelectorAll('#categoriesSlider .sub-cat').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }

    const allCards = document.querySelectorAll('#productsGrid .card');
    
    allCards.forEach(card => {
        const mainCat = card.getAttribute('data-category');
        const subCat = card.getAttribute('data-subcategory');
        
        if (filterName === 'all' || mainCat === filterName || subCat === filterName) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });

    const dropdown = document.getElementById('categoriesDropdown');
    if (dropdown) dropdown.classList.remove('show');
};

// ==========================================
// التمرير التلقائي
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

// ==========================================
// نظام الأقسام الشامل (القائمة الجديدة)
// ==========================================
const fullCategoriesMenu = document.getElementById('fullCategoriesMenu');
const catsSidebar = document.getElementById('catsSidebar');
const catsContent = document.getElementById('catsContent');

let isMenuLoaded = false;

async function loadDynamicCategoriesMenu() {
    if (!catsSidebar || !catsContent) return;

    catsSidebar.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--primary);"><i class="fa-solid fa-spinner fa-spin"></i></div>';
    catsContent.innerHTML = '';

    try {
        const catQuery = query(collection(db, "categories"));
        const catSnap = await getDocs(catQuery);
        let dynamicCategories = [];

        catSnap.forEach(docSnap => {
            dynamicCategories.push({
                id: docSnap.id,
                name: docSnap.data().name,
                subCats: []
            });
        });

        const subCatQuery = query(collection(db, "subCategories"));
        const subCatSnap = await getDocs(subCatQuery);

        subCatSnap.forEach(docSnap => {
            const subData = docSnap.data();
            const parentCat = dynamicCategories.find(c => c.name === subData.parentCategory);
            if (parentCat) {
                parentCat.subCats.push({ 
                    name: subData.name,
                    imageUrl: subData.imageUrl || null // جلب الصورة لو موجودة
                });
            }
        });

        catsSidebar.innerHTML = '';
        dynamicCategories.forEach((cat, index) => {
            const tab = document.createElement('div');
            tab.className = `cat-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = cat.name;
            tab.onclick = () => {
                document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderDynamicContent(cat);
            };
            catsSidebar.appendChild(tab);
        });

        if (dynamicCategories.length > 0) {
            renderDynamicContent(dynamicCategories[0]);
        }

        isMenuLoaded = true;

    } catch (error) {
        console.error("Error loading categories menu:", error);
        catsSidebar.innerHTML = '<p style="color:red; font-size:12px; padding:10px; text-align:center;">حدث خطأ في جلب الأقسام</p>';
    }
}

function renderDynamicContent(category) {
    catsContent.innerHTML = '';
    
    if(!category.subCats || category.subCats.length === 0) {
        catsContent.innerHTML = '<p style="text-align:center; padding: 40px 20px; color:#333;"><i class="fa-solid fa-folder-open" style="font-size:40px; margin-bottom:10px; opacity:0.5;"></i><br>لا توجد أقسام فرعية هنا بعد</p>';
        return;
    }

    const groupTitle = document.createElement('div');
    groupTitle.className = 'subcat-group-title';
    groupTitle.innerHTML = `أقسام ${category.name} <i class="fa-solid fa-angle-left"></i>`;
    
    const grid = document.createElement('div');
    grid.className = 'subcat-grid';

    category.subCats.forEach(sub => {
        const itemLink = document.createElement('a');
        itemLink.href = `category.html?name=${encodeURIComponent(category.name)}&sub=${encodeURIComponent(sub.name)}`; 
        itemLink.className = 'subcat-item';
        
        // استخدام الصورة لو موجودة، غير كده نعرض أيقونة افتراضية
        const imageContent = sub.imageUrl 
            ? `<img src="${sub.imageUrl}" alt="${sub.name}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`
            : `<i class="fa-solid fa-tags" style="font-size:28px; color:var(--primary);"></i>`;
        
        itemLink.innerHTML = `
            <div style="width: 100%; aspect-ratio: 1/1; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${imageContent}
            </div>
            <span style="color: #000; font-weight: 700;">${sub.name}</span>
        `;
        itemLink.onclick = () => {
            fullCategoriesMenu.style.display = 'none';
            if(mobileCategoriesBtn) mobileCategoriesBtn.classList.remove('active');
        };
        grid.appendChild(itemLink);
    });

    catsContent.appendChild(groupTitle);
    catsContent.appendChild(grid);
}

if (mobileCategoriesBtn) {
    mobileCategoriesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(typeof closeAllModals === 'function') closeAllModals();
        
        if (fullCategoriesMenu.style.display === 'none' || fullCategoriesMenu.style.display === '') {
            fullCategoriesMenu.style.display = 'flex';
            mobileCategoriesBtn.classList.add('active');
            
            if(!isMenuLoaded) {
                loadDynamicCategoriesMenu();
            }
        } else {
            fullCategoriesMenu.style.display = 'none';
            mobileCategoriesBtn.classList.remove('active');
        }
    });
}

const closeFullCatsBtn = document.getElementById('closeFullCatsBtn');
if (closeFullCatsBtn) {
    closeFullCatsBtn.addEventListener('click', () => {
        fullCategoriesMenu.style.display = 'none';
        if(mobileCategoriesBtn) mobileCategoriesBtn.classList.remove('active');
    });
}