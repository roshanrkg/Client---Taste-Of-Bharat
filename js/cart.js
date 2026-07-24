/**
 * Taste of Bhaarat - Reactive Shopping Cart & Checkout System
 */
window.TOBCart = (function () {
    const STORAGE_KEY = "tob_cart_v1";
    const FREE_SHIPPING_THRESHOLD = 999;

    // Helper to fetch current cart from localStorage
    function getItems() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Cart localStorage read error:", e);
            return [];
        }
    }

    // Save cart state & dispatch update event
    function saveItems(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.error("Cart localStorage save error:", e);
        }
        window.dispatchEvent(new CustomEvent("cart:updated", { detail: { items } }));
    }

    function addItem(item) {
        const items = getItems();
        const existingIndex = items.findIndex(
            (i) => i.slug === item.slug && i.weight === item.weight
        );

        const qtyToAdd = Number(item.quantity) || 1;

        if (existingIndex > -1) {
            items[existingIndex].quantity = (items[existingIndex].quantity || 1) + qtyToAdd;
        } else {
            items.push({
                slug: item.slug,
                name: item.name,
                weight: item.weight,
                price: Number(item.price),
                quantity: qtyToAdd,
                image: item.image || "/image.png",
            });
        }

        saveItems(items);
        showToast(`Added ${item.name} (${item.weight}) to your basket!`);
        openDrawer();
    }

    function removeItem(slug, weight) {
        const items = getItems().filter(
            (i) => !(i.slug === slug && i.weight === weight)
        );
        saveItems(items);
    }

    function updateQuantity(slug, weight, newQty) {
        const qty = Number(newQty);
        if (qty <= 0) {
            removeItem(slug, weight);
            return;
        }
        const items = getItems().map((i) => {
            if (i.slug === slug && i.weight === weight) {
                return { ...i, quantity: qty };
            }
            return i;
        });
        saveItems(items);
    }

    function clearCart() {
        saveItems([]);
    }

    function getTotal() {
        return getItems().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    function getCount() {
        return getItems().reduce((sum, item) => sum + item.quantity, 0);
    }

    // UI Toast Notification
    function showToast(message) {
        let toast = document.getElementById("tob-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "tob-toast";
            toast.className = "fixed bottom-6 right-6 z-[200] max-w-md bg-spice-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-spice-700 opacity-0 translate-y-4 transition-all duration-300 pointer-events-none";
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<span class="text-spice-500 text-lg">🌿</span> <span class="text-sm font-medium">${message}</span>`;
        toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");

        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
        }, 3000);
    }

    // Dynamic Creation of Slide-over Cart Drawer
    function injectDrawerHTML() {
        if (document.getElementById("cartDrawer")) return;

        const drawerHTML = `
            <div id="cartDrawer" class="fixed inset-0 z-[150] hidden opacity-0 transition-opacity duration-300">
                <!-- Backdrop -->
                <div id="cartBackdrop" class="absolute inset-0 bg-spice-900/40 backdrop-blur-sm"></div>
                
                <!-- Slide-over Panel -->
                <div id="cartPanel" class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 ease-out border-l border-spice-900/10">
                    <!-- Drawer Header -->
                    <div class="p-6 border-b border-spice-900/10 flex items-center justify-between bg-spice-50/50">
                        <div class="flex items-center gap-3">
                            <h2 class="text-2xl font-serif font-bold text-spice-900">Your Basket</h2>
                            <span id="cartDrawerBadge" class="bg-spice-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">0</span>
                        </div>
                        <button id="cartCloseBtn" type="button" class="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-spice-900 hover:bg-white transition-colors text-2xl" aria-label="Close Basket">
                            &times;
                        </button>
                    </div>

                    <!-- Free Shipping Indicator -->
                    <div id="freeShippingContainer" class="bg-spice-50 px-6 py-3 border-b border-spice-900/5 text-xs text-spice-900">
                        <div id="freeShippingText" class="font-medium mb-1"></div>
                        <div class="w-full bg-spice-200 h-1.5 rounded-full overflow-hidden">
                            <div id="freeShippingBar" class="bg-spice-500 h-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>

                    <!-- Cart Item List -->
                    <div id="cartItemsList" class="flex-grow overflow-y-auto p-6 space-y-4">
                        <!-- Items rendered dynamically -->
                    </div>

                    <!-- Drawer Footer / Checkout -->
                    <div id="cartFooter" class="p-6 border-t border-spice-900/10 bg-white space-y-4">
                        <div class="flex justify-between items-center text-gray-600 text-sm">
                            <span>Subtotal</span>
                            <span id="cartSubtotal" class="text-2xl font-serif font-bold text-spice-900">₹0</span>
                        </div>
                        <p class="text-xs text-gray-500">Taxes and delivery calculated at checkout.</p>

                        <div class="grid grid-cols-2 gap-3">
                            <button id="clearCartBtn" type="button" class="border border-spice-900/20 text-gray-600 py-3 rounded-xl font-medium text-sm hover:bg-spice-50 transition-colors">
                                Clear Basket
                            </button>
                            <button id="checkoutBtn" type="button" class="bg-spice-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-spice-700 transition-colors shadow-lg flex items-center justify-center gap-2">
                                <span>Checkout</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MULTI-ITEM CHECKOUT MODAL -->
            <div id="checkoutModal" class="fixed inset-0 z-[160] hidden opacity-0 transition-opacity duration-300 flex items-center justify-center p-4">
                <div id="checkoutBackdrop" class="absolute inset-0 bg-spice-900/50 backdrop-blur-md"></div>
                <div id="checkoutContent" class="relative z-10 bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-spice-100 transform scale-95 transition-transform duration-300 max-h-[90vh] flex flex-col">
                    
                    <div class="p-6 bg-spice-50 border-b border-spice-900/10 flex justify-between items-start shrink-0">
                        <div>
                            <span class="text-xs font-semibold uppercase tracking-wider text-spice-500">Taste of Bhaarat</span>
                            <h3 class="text-2xl font-serif font-bold text-spice-900">Complete Your Order</h3>
                        </div>
                        <button id="checkoutCloseBtn" type="button" class="text-gray-400 hover:text-spice-900 text-3xl font-light leading-none">&times;</button>
                    </div>

                    <div class="p-6 overflow-y-auto space-y-6 flex-grow">
                        <!-- Order Items Summary Box -->
                        <div class="bg-spice-50/60 rounded-2xl p-4 border border-spice-900/5 space-y-3">
                            <h4 class="text-sm font-bold text-spice-900 uppercase tracking-wider">Order Summary</h4>
                            <div id="checkoutSummaryItems" class="space-y-2 text-sm text-gray-700 max-h-40 overflow-y-auto pr-1"></div>
                            <div class="border-t border-spice-900/10 pt-2 flex justify-between font-bold text-spice-900">
                                <span>Total Amount:</span>
                                <span id="checkoutSummaryTotal">₹0</span>
                            </div>
                        </div>

                        <!-- Web3Forms Multi-item Form -->
                        <form id="checkoutForm" action="https://api.web3forms.com/submit" method="POST" class="space-y-4">
                            <input type="hidden" name="access_key" value="9aac3501-bdba-408e-a769-6c2f4f0bddeb">
                            <input type="hidden" name="subject" value="🛍️ New Multi-Item Spice Order!">
                            <input type="hidden" name="Order Details" id="formOrderDetails" value="">
                            <input type="hidden" name="Total Amount" id="formTotalAmount" value="">
                            <input type="checkbox" name="botcheck" class="hidden" style="display:none;">

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-spice-900 mb-1">Full Name *</label>
                                    <input type="text" name="Customer Name" required placeholder="Rahul Sharma" class="w-full bg-gray-50 border border-spice-900/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-spice-500">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-spice-900 mb-1">Phone Number *</label>
                                    <input type="tel" name="Phone Number" required placeholder="+91 98765 43210" class="w-full bg-gray-50 border border-spice-900/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-spice-500">
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-spice-900 mb-1">Email Address (Optional)</label>
                                <input type="email" name="Email" placeholder="rahul@example.com" class="w-full bg-gray-50 border border-spice-900/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-spice-500">
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-spice-900 mb-1">Delivery Address *</label>
                                <textarea name="Delivery Address" required rows="3" placeholder="Full street address, landmark, city & PIN code" class="w-full bg-gray-50 border border-spice-900/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-spice-500 resize-none"></textarea>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-spice-900 mb-1">Preferred Payment Mode</label>
                                <select name="Payment Option" class="w-full bg-gray-50 border border-spice-900/15 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-spice-500">
                                    <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                                    <option value="UPI / QR Code on Delivery">UPI / QR Code on Delivery</option>
                                </select>
                            </div>

                            <button id="checkoutSubmitBtn" type="submit" class="w-full bg-spice-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-spice-700 transition-colors shadow-lg mt-2">
                                Confirm & Submit Order Request
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", drawerHTML);

        // Bind events
        document.getElementById("cartBackdrop").addEventListener("click", closeDrawer);
        document.getElementById("cartCloseBtn").addEventListener("click", closeDrawer);
        document.getElementById("clearCartBtn").addEventListener("click", () => {
            if (confirm("Are you sure you want to clear your basket?")) {
                clearCart();
            }
        });
        document.getElementById("checkoutBtn").addEventListener("click", () => {
            if (getItems().length === 0) {
                alert("Your basket is empty!");
                return;
            }
            closeDrawer();
            openCheckoutModal();
        });

        document.getElementById("checkoutBackdrop").addEventListener("click", closeCheckoutModal);
        document.getElementById("checkoutCloseBtn").addEventListener("click", closeCheckoutModal);

        document.getElementById("checkoutForm").addEventListener("submit", async function (e) {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById("checkoutSubmitBtn");
            const origText = btn.innerHTML;

            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Submitting Order...`;

            try {
                const formData = new FormData(form);
                const res = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    clearCart();
                    closeCheckoutModal();
                    form.reset();
                    showSweetAlert({
                        title: "Order Placed Successfully! 🎉",
                        message: "Thank you for your order! We have received your order details and will contact you shortly to confirm delivery.",
                        buttonText: "Continue Shopping 🌿"
                    });
                } else {
                    throw new Error(data.message || "Failed to submit order");
                }
            } catch (err) {
                console.error("Web3Forms submission error:", err);
                form.submit();
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        });
    }

    function openDrawer() {
        injectDrawerHTML();
        const drawer = document.getElementById("cartDrawer");
        const panel = document.getElementById("cartPanel");
        if (!drawer || !panel) return;

        renderDrawer();
        drawer.classList.remove("hidden");
        requestAnimationFrame(() => {
            drawer.classList.remove("opacity-0");
            panel.classList.remove("translate-x-full");
        });
    }

    function closeDrawer() {
        const drawer = document.getElementById("cartDrawer");
        const panel = document.getElementById("cartPanel");
        if (!drawer || !panel) return;

        drawer.classList.add("opacity-0");
        panel.classList.add("translate-x-full");
        setTimeout(() => {
            drawer.classList.add("hidden");
        }, 300);
    }

    function openCheckoutModal() {
        injectDrawerHTML();
        const modal = document.getElementById("checkoutModal");
        const content = document.getElementById("checkoutContent");
        if (!modal || !content) return;

        const items = getItems();
        const total = getTotal();

        // Populate order details string
        const detailsString = items
            .map((i) => `${i.quantity}x ${i.name} (${i.weight}) @ ₹${i.price} ea = ₹${i.price * i.quantity}`)
            .join("\n");

        document.getElementById("formOrderDetails").value = detailsString;
        document.getElementById("formTotalAmount").value = `₹${total}`;

        document.getElementById("checkoutSummaryTotal").innerText = `₹${total}`;
        document.getElementById("checkoutSummaryItems").innerHTML = items
            .map(
                (i) => `
                <div class="flex justify-between items-center text-xs">
                    <span><strong class="text-spice-900">${i.quantity}x</strong> ${i.name} <span class="text-gray-500">(${i.weight})</span></span>
                    <span class="font-medium text-spice-900">₹${i.price * i.quantity}</span>
                </div>
            `
            )
            .join("");

        modal.classList.remove("hidden");
        requestAnimationFrame(() => {
            modal.classList.remove("opacity-0");
            content.classList.remove("scale-95");
            content.classList.add("scale-100");
        });
    }

    function closeCheckoutModal() {
        const modal = document.getElementById("checkoutModal");
        const content = document.getElementById("checkoutContent");
        if (!modal || !content) return;

        modal.classList.add("opacity-0");
        content.classList.remove("scale-100");
        content.classList.add("scale-95");
        setTimeout(() => {
            modal.classList.add("hidden");
        }, 300);
    }

    function renderDrawer() {
        injectDrawerHTML();
        const items = getItems();
        const total = getTotal();
        const count = getCount();

        const badge = document.getElementById("cartDrawerBadge");
        const list = document.getElementById("cartItemsList");
        const subtotal = document.getElementById("cartSubtotal");
        const freeText = document.getElementById("freeShippingText");
        const freeBar = document.getElementById("freeShippingBar");

        if (badge) badge.innerText = count;
        if (subtotal) subtotal.innerText = `₹${total}`;

        // Free shipping bar calculation
        if (freeText && freeBar) {
            if (total >= FREE_SHIPPING_THRESHOLD) {
                freeText.innerHTML = `🎉 <strong class="text-green-700">Congratulations!</strong> You unlocked FREE Shipping!`;
                freeBar.style.width = "100%";
                freeBar.className = "bg-green-500 h-full transition-all duration-300";
            } else {
                const diff = FREE_SHIPPING_THRESHOLD - total;
                const pct = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);
                freeText.innerHTML = `Add <strong>₹${diff}</strong> more for <strong>FREE Shipping</strong> across India!`;
                freeBar.style.width = `${pct}%`;
                freeBar.className = "bg-spice-500 h-full transition-all duration-300";
            }
        }

        // Render List
        if (!list) return;

        if (items.length === 0) {
            list.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                    <div class="w-20 h-20 bg-spice-50 rounded-full flex items-center justify-center text-3xl">🛒</div>
                    <h3 class="text-xl font-serif font-bold text-spice-900">Your basket is empty</h3>
                    <p class="text-sm text-gray-500 max-w-xs">Looks like you haven't added any authentic spices yet.</p>
                    <a href="/shop/" onclick="TOBCart.closeDrawer()" class="inline-block bg-spice-900 text-white px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase hover:bg-spice-700 transition-colors">
                        Browse Spices
                    </a>
                </div>
            `;
            return;
        }

        list.innerHTML = items
            .map(
                (item) => `
            <div class="flex items-center gap-4 bg-spice-50/40 p-3 rounded-2xl border border-spice-900/5">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-xl shrink-0">
                
                <div class="flex-grow min-w-0">
                    <h4 class="font-serif font-bold text-spice-900 text-base truncate">${item.name}</h4>
                    <div class="text-xs text-gray-500 mb-2">Size: <span class="font-semibold text-spice-700">${item.weight}</span></div>
                    
                    <div class="flex items-center gap-2">
                        <div class="flex items-center border border-spice-900/15 rounded-lg bg-white overflow-hidden">
                            <button type="button" class="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-spice-50" onclick="TOBCart.updateQuantity('${item.slug}', '${item.weight}', ${item.quantity - 1})">-</button>
                            <span class="w-8 text-center text-xs font-bold text-spice-900">${item.quantity}</span>
                            <button type="button" class="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-spice-50" onclick="TOBCart.updateQuantity('${item.slug}', '${item.weight}', ${item.quantity + 1})">+</button>
                        </div>
                        <button type="button" class="text-gray-400 hover:text-red-600 text-xs ml-auto transition-colors" onclick="TOBCart.removeItem('${item.slug}', '${item.weight}')">
                            <i class="fa-regular fa-trash-can"></i> Remove
                        </button>
                    </div>
                </div>

                <div class="text-right shrink-0">
                    <span class="font-bold text-spice-900 text-base">₹${item.price * item.quantity}</span>
                    <span class="block text-[10px] text-gray-400">₹${item.price} ea</span>
                </div>
            </div>
        `
            )
            .join("");
    }

    // Sync Badges across the document
    function updateNavBadges() {
        const count = getCount();
        const badges = document.querySelectorAll("[data-cart-badge]");
        badges.forEach((b) => {
            b.innerText = count;
            if (count > 0) {
                b.classList.remove("hidden");
            } else {
                b.classList.add("hidden");
            }
        });
    }

    // SweetAlert Modal Popup (Tailwind Implementation)
    function showSweetAlert({ title, message, buttonText = "Continue Shopping 🌿", onConfirm = null }) {
        let modal = document.getElementById("tobSweetAlert");
        if (!modal) {
            const modalHTML = `
                <div id="tobSweetAlert" class="fixed inset-0 z-[300] hidden opacity-0 transition-opacity duration-300 flex items-center justify-center p-4">
                    <div id="tobSweetAlertBackdrop" class="absolute inset-0 bg-spice-900/60 backdrop-blur-md"></div>
                    <div id="tobSweetAlertBox" class="relative z-10 bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-spice-100 text-center transform scale-95 transition-transform duration-300 space-y-6">
                        
                        <!-- Pulsing Green Icon Badge -->
                        <div class="relative w-20 h-20 mx-auto flex items-center justify-center">
                            <div class="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-25"></div>
                            <div class="w-20 h-20 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center justify-center text-4xl shadow-inner relative z-10">
                                <i class="fa-solid fa-circle-check"></i>
                            </div>
                        </div>

                        <!-- Content Text -->
                        <div class="space-y-2">
                            <h3 id="tobSweetAlertTitle" class="text-2xl font-serif font-bold text-spice-900 leading-tight">Order Placed Successfully! 🎉</h3>
                            <p id="tobSweetAlertMsg" class="text-sm text-gray-600 leading-relaxed">We have received your order details. Our team will contact you shortly to confirm delivery.</p>
                        </div>

                        <div class="w-12 h-0.5 bg-spice-900/10 mx-auto rounded-full"></div>

                        <!-- Action Button -->
                        <div>
                            <button id="tobSweetAlertBtn" type="button" class="w-full bg-spice-900 hover:bg-spice-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-xl cursor-pointer">
                                Continue Shopping 🌿
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML("beforeend", modalHTML);
            modal = document.getElementById("tobSweetAlert");
        }

        const titleEl = document.getElementById("tobSweetAlertTitle");
        const msgEl = document.getElementById("tobSweetAlertMsg");
        const btnEl = document.getElementById("tobSweetAlertBtn");
        const boxEl = document.getElementById("tobSweetAlertBox");
        const backdrop = document.getElementById("tobSweetAlertBackdrop");

        if (titleEl) titleEl.innerHTML = title;
        if (msgEl) msgEl.innerText = message;
        if (btnEl) btnEl.innerText = buttonText;

        modal.classList.remove("hidden");
        requestAnimationFrame(() => {
            modal.classList.remove("opacity-0");
            boxEl.classList.remove("scale-95");
            boxEl.classList.add("scale-100");
        });

        const closeAlert = () => {
            modal.classList.add("opacity-0");
            boxEl.classList.remove("scale-100");
            boxEl.classList.add("scale-95");
            setTimeout(() => {
                modal.classList.add("hidden");
                if (typeof onConfirm === "function") onConfirm();
            }, 300);
        };

        btnEl.onclick = closeAlert;
        backdrop.onclick = closeAlert;
    }

    // Auto-detect URL ?success=1 or ?success=true
    function checkUrlSuccessParam() {
        const params = new URLSearchParams(window.location.search);
        if (params.has("success") || params.get("success") === "1" || params.get("success") === "true") {
            clearCart();
            showSweetAlert({
                title: "Order Placed Successfully! 🎉",
                message: "We have received your order details. Our team will contact you shortly to confirm delivery.",
                buttonText: "Awesome! 🌿"
            });
            // Clean up URL query parameters without reloading
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    // Auto-initialize listeners
    document.addEventListener("DOMContentLoaded", () => {
        injectDrawerHTML();
        updateNavBadges();
        checkUrlSuccessParam();

        window.addEventListener("cart:updated", () => {
            updateNavBadges();
            renderDrawer();
        });

        // Delegate toggle clicks
        document.addEventListener("click", (e) => {
            const toggle = e.target.closest("[data-cart-toggle]");
            if (toggle) {
                e.preventDefault();
                openDrawer();
            }
        });
    });

    return {
        getItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        getCount,
        openDrawer,
        closeDrawer,
        openCheckoutModal,
        closeCheckoutModal,
        renderDrawer,
        showToast,
        showSweetAlert,
    };
})();
