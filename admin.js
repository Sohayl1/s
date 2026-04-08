import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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
            createdAt: new Date()
        });

        form.reset();
        successMsg.style.display = 'block';
        
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("حدث خطأ أثناء حفظ المنتج.");
    } finally {
        submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج في قاعدة البيانات';
        submitBtn.disabled = false;
    }
});