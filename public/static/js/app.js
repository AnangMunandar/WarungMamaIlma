
let products = [];
let cart = [];

const whatsappNumber = "6282210313837";

// Nama gambar masing-masing produk
const productImages = {
    "Gorengan|Kentang Goreng": "01-kentang-goreng.jpg",
    "Gorengan|Sosis": "02-sosis-goreng.jpg",
    "Gorengan|Otak-Otak": "03-otak-otak-goreng.jpg",
    "Gorengan|Dumpling": "04-dumpling.jpg",
    "Gorengan|Nugget": "05-nugget.jpg",
    "Bakaran|Sosis": "06-sosis-bakar.jpg",
    "Bakaran|Otak-Otak": "07-otak-otak-bakar.jpg",
    "Bakaran|Fish Roll": "08-fish-roll.jpg",
    "Bakaran|Pisang Bakar": "09-pisang-bakar.jpg",
    "Bakaran|Roti Bakar": "10-roti-bakar.jpg",
    "Spesial|Seblak": "11-seblak.jpg"
};

// Format harga Rupiah
function formatRupiah(number) {
    return "Rp" + Number(number).toLocaleString("id-ID");
}

// Mengamankan teks HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// Mengambil produk dari database Golang
async function loadProducts() {
    const menuList = document.getElementById("menu-list");

    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Gagal mengambil produk dari server.");
        }

        products = await response.json();
        renderMenu("Semua");

    } catch (error) {
        console.error("Gagal memuat produk:", error);

        if (menuList) {
            menuList.innerHTML = `
                <p style="text-align:center; padding:25px;">
                    Menu belum berhasil dimuat.
                    Silakan muat ulang halaman.
                </p>
            `;
        }
    }
}

// Menampilkan menu produk
function renderMenu(category = "Semua") {
    const menuList = document.getElementById("menu-list");

    if (!menuList) return;

    const filteredProducts = category === "Semua"
        ? products
        : products.filter(product => product.category === category);

    if (filteredProducts.length === 0) {
        menuList.innerHTML = `
            <p style="text-align:center; padding:25px;">
                Belum ada produk pada kategori ini.
            </p>
        `;
        return;
    }

    menuList.innerHTML = filteredProducts.map(product => {
        const imageName =
            productImages[`${product.category}|${product.name}`];

        const imageHTML = imageName
            ? `
                <img
                    src="/static/images/${imageName}"
                    alt="${escapeHTML(product.name)}"
                    onerror="this.style.display='none'"
                >
            `
            : `<span>${escapeHTML(product.emoji || "🍴")}</span>`;

        return `
            <div class="menu-card">
                <div class="food-picture">
                    ${imageHTML}
                </div>

                <div class="food-info">
                    <span class="food-category">
                        ${escapeHTML(product.category)}
                    </span>

                    <h3>${escapeHTML(product.name)}</h3>

                    <div class="food-price">
                        ${formatRupiah(product.price)}
                    </div>

                    <button
                        type="button"
                        class="add-button"
                        onclick="addToCart(${Number(product.id)})"
                    >
                        + Tambah
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

// Filter kategori menu
function filterMenu(category, button) {
    document.querySelectorAll(".category").forEach(item => {
        item.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    renderMenu(category);
}

// Popup pilihan tingkat kepedasan

function addToCart(id) {
    const product = products.find(
        item => Number(item.id) === Number(id)
    );

    if (!product) return;

    document.getElementById("spicy-modal")?.remove();

    // Deteksi khusus produk Roti Bakar
    const isRotiBakar = product.name
        .toLowerCase()
        .includes("roti bakar");

    // Pilihan otomatis berdasarkan produk
    const options = isRotiBakar
        ? [
            { name: "Coklat", icon: "🍫" },
            { name: "Blueberry", icon: "🫐" },
            { name: "Strawberry", icon: "🍓" }
        ]
        : [
            { name: "Pedas", icon: "🌶️" },
            { name: "Sedang", icon: "🌶️" },
            { name: "Tidak Pedas", icon: "😊" }
        ];

    const quantities = {};

    options.forEach(option => {
        quantities[option.name] = 0;
    });

    const modal = document.createElement("div");
    modal.id = "spicy-modal";

    const shadow = modal.attachShadow({ mode: "open" });

    shadow.innerHTML = `
        <style>
            :host {
                all: initial;
            }

            * {
                box-sizing: border-box;
                font-family: Arial, sans-serif;
            }

            .backdrop {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 15px;
                background: rgba(48, 37, 31, .65);
                backdrop-filter: blur(5px);
                opacity: 0;
                visibility: hidden;
                transition: opacity .35s ease, visibility .35s ease;
            }

            .backdrop.show {
                opacity: 1;
                visibility: visible;
            }

            .popup {
                position: relative;
                width: 100%;
                max-width: 390px;
                max-height: 90vh;
                padding: 25px;
                overflow-y: auto;
                border-radius: 25px;
                background: #FFF8F0;
                color: #55331F;
                border: 1px solid #EAD8C8;
                box-shadow: 0 25px 80px rgba(48,37,31,.25);
                transform: translateY(28px) scale(.92);
                transition: transform .4s cubic-bezier(.2,.8,.2,1);
            }

            .backdrop.show .popup {
                transform: translateY(0) scale(1);
            }

            .popup::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 5px;
                background: linear-gradient(
                    90deg, #C98755, #E9B58E, #C98755
                );
            }

            .header {
                text-align: center;
                margin: -25px -25px 22px;
                padding: 25px 18px 22px;
                background: linear-gradient(
                    135deg, #FFF0DF, #F8D8BD, #EFC09E
                );
                border-bottom: 1px solid #EAD8C8;
                border-radius: 24px 24px 18px 18px;
            }

            .title {
                margin: 0 0 9px;
                color: #55331F;
                font-size: 21px;
                font-weight: 800;
            }

            .description {
                margin: 0;
                color: #765C49;
                font-size: 13px;
                line-height: 1.7;
            }

            .product-name {
                display: inline-block;
                margin-top: 5px;
                color: #A96335;
                font-weight: 700;
            }

            .options {
                display: flex;
                flex-direction: column;
                gap: 11px;
            }

            .option {
                width: 100%;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 13px 11px;
                border: 1.5px solid #EAD8C8;
                border-radius: 16px;
                background: #FFFDFA;
                transition: all .25s ease;
            }

            .option:focus-within {
                border-color: #C98755;
                background: #FFF8F0;
                box-shadow: 0 5px 15px rgba(201,135,85,.10);
            }

            .option-icon {
                width: 40px;
                height: 40px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 13px;
                background: #F4E3D3;
                font-size: 21px;
            }

            .option-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .option-info strong {
                color: #55331F;
                font-size: 13px;
            }

            .quantity-control {
                display: flex;
                align-items: center;
                gap: 7px;
                flex-shrink: 0;
            }

            .quantity-button {
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: none;
                border-radius: 9px;
                background: #F4E5D8;
                color: #A96335;
                font-size: 20px;
                font-weight: 700;
                cursor: pointer;
                transition: all .2s ease;
            }

            .quantity-button:hover {
                background: #EBC9AE;
            }

            .quantity-button:active {
                transform: scale(.88);
            }

            .quantity-value {
                min-width: 17px;
                text-align: center;
                color: #55331F;
                font-size: 14px;
                font-weight: 800;
            }

            .add-selected {
                width: 100%;
                margin-top: 20px;
                padding: 14px;
                border: none;
                border-radius: 14px;
                background: linear-gradient(135deg, #C98755, #A96335);
                color: white;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 6px 15px rgba(201,135,85,.18);
                transition: all .2s ease;
            }

            .add-selected:hover:not(:disabled) {
                transform: translateY(-2px);
            }

            .add-selected:disabled {
                opacity: .5;
                cursor: not-allowed;
                box-shadow: none;
            }

            .cancel {
                width: 100%;
                margin-top: 10px;
                padding: 12px;
                border: none;
                border-radius: 12px;
                background: #F1E5D9;
                color: #76533E;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
            }

            .cancel:hover {
                background: #EAD6C4;
            }

            @media (max-width: 400px) {
                .popup {
                    padding: 20px;
                }

                .header {
                    margin: -20px -20px 20px;
                }

                .title {
                    font-size: 19px;
                }

                .option {
                    padding: 11px 9px;
                    gap: 8px;
                }

                .option-icon {
                    width: 35px;
                    height: 35px;
                    font-size: 19px;
                }

                .quantity-control {
                    gap: 5px;
                }

                .quantity-button {
                    width: 28px;
                    height: 28px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation: none !important;
                    transition: none !important;
                }
            }
        </style>

        <div class="backdrop">
            <div class="popup" role="dialog" aria-modal="true"
                 aria-labelledby="spicy-title">

                <div class="header">
                    <h3 class="title" id="spicy-title">
                        ${isRotiBakar ? "Pilih Rasa" : "Pilih Tingkat Kepedasan"}
                    </h3>

                    <p class="description">
                        Atur jumlah sesuai selera kamu
                        <br>
                        <span class="product-name">
                            ${escapeHTML(product.name)}
                        </span>
                    </p>
                </div>

                <div class="options">
                    ${options.map(option => `
                        <div class="option">
                            <span class="option-icon">${option.icon}</span>

                            <span class="option-info">
                                <strong>${option.name}</strong>
                            </span>

                            <div class="quantity-control">
                                <button class="quantity-button minus"
                                    type="button"
                                    data-level="${option.name}"
                                    aria-label="Kurangi ${option.name}">−</button>

                                <span class="quantity-value"
                                    data-value="${option.name}"
                                    aria-live="polite">0</span>

                                <button class="quantity-button plus"
                                    type="button"
                                    data-level="${option.name}"
                                    aria-label="Tambah ${option.name}">+</button>
                            </div>
                        </div>
                    `).join("")}
                </div>

                <button class="add-selected" type="button" disabled>
                    Tambahkan ke Keranjang
                </button>

                <button class="cancel" type="button">Batal</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const backdrop = shadow.querySelector(".backdrop");
    const addButton = shadow.querySelector(".add-selected");
    const cancelButton = shadow.querySelector(".cancel");

    requestAnimationFrame(() => {
        backdrop.classList.add("show");
    });

    let closed = false;

    // Memperbarui jumlah pilihan
    function updateQuantity(level) {
        const valueElement = shadow.querySelector(
            `[data-value="${level}"]`
        );

        valueElement.textContent = quantities[level];

        const total = Object.values(quantities).reduce(
            (sum, value) => sum + value,
            0
        );

        addButton.disabled = total === 0;

        addButton.textContent = total > 0
            ? `Tambahkan ${total} Item ke Keranjang`
            : "Tambahkan ke Keranjang";
    }

    // Tombol tambah jumlah
    shadow.querySelectorAll(".plus").forEach(button => {
        button.addEventListener("click", () => {
            if (closed) return;

            const level = button.dataset.level;

            quantities[level]++;
            updateQuantity(level);
        });
    });

    // Tombol kurang jumlah
    shadow.querySelectorAll(".minus").forEach(button => {
        button.addEventListener("click", () => {
            if (closed) return;

            const level = button.dataset.level;

            if (quantities[level] > 0) {
                quantities[level]--;
                updateQuantity(level);
            }
        });
    });

    // Menutup popup
    function closeModal() {
        if (closed) return;

        closed = true;
        backdrop.classList.remove("show");

        document.removeEventListener("keydown", handleEscape);

        setTimeout(() => modal.remove(), 400);
    }

    function handleEscape(event) {
        if (event.key === "Escape") {
            closeModal();
        }
    }

    document.addEventListener("keydown", handleEscape);

    cancelButton.addEventListener("click", closeModal);

    backdrop.addEventListener("click", event => {
        if (event.target === backdrop) {
            closeModal();
        }
    });

    // Tambahkan pilihan ke keranjang
    addButton.addEventListener("click", () => {
        if (closed) return;

        Object.entries(quantities).forEach(([level, quantity]) => {
            if (quantity <= 0) return;

            const existing = cart.find(item =>
                Number(item.id) === Number(id) &&
                item.spicyLevel === level
            );

            if (existing) {
                existing.quantity += quantity;
            } else {
                cart.push({
                    ...product,
                    quantity,
                    spicyLevel: level
                });
            }
        });

        renderCart();

        const cartCount = document.getElementById("cart-count");

        if (cartCount) {
            cartCount.animate(
                [
                    { transform: "scale(1)" },
                    { transform: "scale(1.5)" },
                    { transform: "scale(1)" }
                ],
                { duration: 300 }
            );
        }

        closeModal();
    });
}

// Mengubah jumlah produk di keranjang
function changeQuantity(index, amount) {
    if (!cart[index]) return;

    cart[index].quantity += amount;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    renderCart();
}

// Menampilkan keranjang dengan desain minimalis
function renderCart() {
    const cartItems = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const cartTotal = document.getElementById("cart-total");
    const cartPanel = document.getElementById("cart-panel");

    if (!cartItems || !cartCount || !cartTotal) return;

    // Memastikan warna keranjang tetap Warm Cream
    if (cartPanel) {
        cartPanel.style.setProperty(
            "background", "#FFF8F0", "important"
        );
        cartPanel.style.setProperty(
            "background-color", "#FFF8F0", "important"
        );
        cartPanel.style.setProperty(
            "color", "#55331F", "important"
        );
    }

    cartItems.style.setProperty(
        "background", "#FFF8F0", "important"
    );
    cartItems.style.setProperty(
        "color", "#55331F", "important"
    );

    const totalQuantity = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const totalPrice = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    cartCount.textContent = totalQuantity;
    cartTotal.textContent = formatRupiah(totalPrice);

    // Tampilan ketika keranjang kosong
    if (cart.length === 0) {
       cartItems.innerHTML = `
    <div class="empty-cart">
        <p>Belum Ada Pesanan</p>
    </div>
`;
        return;
    }

    // Tampilan produk dalam keranjang
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${escapeHTML(item.name)}</h4>
                <small>${escapeHTML(item.spicyLevel)}</small>
                <p>${formatRupiah(item.price * item.quantity)}</p>
            </div>

            <div class="quantity">
                <button
                    type="button"
                    onclick="changeQuantity(${index}, -1)"
                    aria-label="Kurangi jumlah"
                >−</button>

                <span>${item.quantity}</span>

                <button
                    type="button"
                    onclick="changeQuantity(${index}, 1)"
                    aria-label="Tambah jumlah"
                >+</button>
            </div>
        </div>
    `).join("");
}

// Popup konfirmasi pembatalan pesanan
function showCancelOrderModal() {
    return new Promise(resolve => {
        document.getElementById("cancel-order-modal")?.remove();

        const modal = document.createElement("div");
        modal.id = "cancel-order-modal";

        const shadow = modal.attachShadow({ mode: "open" });

        shadow.innerHTML = `
            <style>
                :host {
                    all: initial;
                }

                * {
                    box-sizing: border-box;
                    font-family: Arial, sans-serif;
                }

                .backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                    background: rgba(48,37,31,.60);
                    backdrop-filter: blur(5px);
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity .35s ease,
                                visibility .35s ease;
                }

                .backdrop.show {
                    opacity: 1;
                    visibility: visible;
                }

                .popup {
                    position: relative;
                    width: 100%;
                    max-width: 370px;
                    padding: 28px 24px 23px;
                    border-radius: 24px;
                    background: #FFF8F0;
                    color: #55331F;
                    border: 1px solid #EAD8C8;
                    box-shadow: 0 25px 80px rgba(48,37,31,.25);
                    text-align: center;
                    transform: translateY(25px) scale(.94);
                    transition: transform .4s cubic-bezier(.2,.8,.2,1);
                    overflow: hidden;
                }

                .backdrop.show .popup {
                    transform: translateY(0) scale(1);
                }

                .popup::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 5px;
                    background: linear-gradient(
                        90deg, #C98755, #E9B58E, #C98755
                    );
                }

                .icon {
                    width: 72px;
                    height: 72px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 18px;
                    border-radius: 23px;
                    background: linear-gradient(
                        145deg, #F8E8D9, #F1D5BE
                    );
                    font-size: 32px;
                }

                .eyebrow {
                    display: block;
                    margin-bottom: 8px;
                    color: #C98755;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 2px;
                }

                .title {
                    margin: 0 0 10px;
                    color: #55331F;
                    font-size: 20px;
                    font-weight: 800;
                }

                .description {
                    margin: 0 0 23px;
                    color: #887D75;
                    font-size: 13px;
                    line-height: 1.7;
                }

                .buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                button {
                    width: 100%;
                    padding: 14px;
                    border: none;
                    border-radius: 14px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all .25s ease;
                }

                .confirm {
                    background: linear-gradient(
                        135deg, #C98755, #B87345
                    );
                    color: white;
                }

                .confirm:hover {
                    transform: translateY(-2px);
                }

                .cancel {
                    background: #F1E5D9;
                    color: #76533E;
                }

                .cancel:hover {
                    background: #EAD6C4;
                }

                button:active {
                    transform: scale(.97);
                }

                @media (max-width: 400px) {
                    .popup {
                        padding: 25px 19px 20px;
                    }

                    .title {
                        font-size: 19px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    *, *::before, *::after {
                        animation: none !important;
                        transition: none !important;
                    }
                }
            </style>

            <div class="backdrop">
                <div class="popup"
                     role="dialog"
                     aria-modal="true"
                     aria-labelledby="cancel-title">

                    <div class="icon">🛒</div>

                    <span class="eyebrow">WARUNG MAMA ILMA</span>

                    <h3 class="title" id="cancel-title">
                        Batalkan Pesanan?
                    </h3>

                    <p class="description">
                        Apakah kamu yakin ingin membatalkan
                        seluruh pesanan di keranjang?
                        <br>
                        <strong>
                            Semua produk akan dihapus dari keranjang.
                        </strong>
                    </p>

                    <div class="buttons">
                        <button class="confirm" type="button">
                            Ya, Batalkan Pesanan
                        </button>

                        <button class="cancel" type="button">
                            Tidak, Kembali
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const backdrop = shadow.querySelector(".backdrop");
        let closed = false;

        function closeModal(result) {
            if (closed) return;

            closed = true;
            backdrop.classList.remove("show");

            document.removeEventListener("keydown", handleEscape);

            setTimeout(() => {
                modal.remove();
                resolve(result);
            }, 350);
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                closeModal(false);
            }
        }

        shadow.querySelector(".confirm").addEventListener("click", () => {
            closeModal(true);
        });

        shadow.querySelector(".cancel").addEventListener("click", () => {
            closeModal(false);
        });

        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) {
                closeModal(false);
            }
        });

        document.addEventListener("keydown", handleEscape);

        requestAnimationFrame(() => {
            backdrop.classList.add("show");
        });
    });
}

async function cancelOrder() {
    // Jika keranjang kosong, kembali ke menu pesanan
    if (cart.length === 0) {
        toggleCart();
        return;
    }

    // Jika ada pesanan, tampilkan konfirmasi pembatalan
    const confirmed = await showCancelOrderModal();

    if (!confirmed) return;

    cart = [];
    renderCart();

    toggleCart();
}

// Membuka dan menutup keranjang
function toggleCart() {
    const panel = document.getElementById("cart-panel");
    const overlay = document.getElementById("cart-overlay");

    if (!panel || !overlay) return;

    panel.classList.toggle("open");
    overlay.classList.toggle("show");
}

// Popup nama dan alamat pelanggan

function showCheckoutModal() {
    return new Promise(resolve => {
        document.getElementById("checkout-modal")?.remove();

        const modal = document.createElement("div");
        modal.id = "checkout-modal";

        const shadow = modal.attachShadow({ mode: "open" });

        shadow.innerHTML = `
            <style>
                :host {
                    all: initial;
                }

                * {
                    box-sizing: border-box;
                    font-family: Arial, sans-serif;
                }

                .backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                    background: rgba(48,37,31,.55);
                    backdrop-filter: blur(5px);
                    opacity: 0;
                    visibility: hidden;
                    transition: .3s ease;
                }

                .backdrop.show {
                    opacity: 1;
                    visibility: visible;
                }

                .popup {
                    width: 100%;
                    max-width: 390px;
                    padding: 26px 23px 22px;
                    border-radius: 23px;
                    background: #FFF8F0;
                    border: 1px solid #EAD8C8;
                    box-shadow: 0 20px 60px rgba(48,37,31,.2);
                    transform: translateY(20px) scale(.96);
                    transition: .3s ease;
                    overflow: hidden;
                }

                .backdrop.show .popup {
                    transform: translateY(0) scale(1);
                }

                .header {
                    margin: -26px -23px 22px;
                    padding: 23px 18px 20px;
                    text-align: center;
                    background: linear-gradient(
                        135deg, #FFF0DF, #F8D8BD, #EFC09E
                    );
                    border-bottom: 1px solid #EAD8C8;
                }

                .title {
                    margin: 0 0 8px;
                    color: #55331F;
                    font-size: 20px;
                    font-weight: 800;
                }

                .description {
                    margin: 0;
                    color: #765C49;
                    font-size: 12px;
                    line-height: 1.6;
                }

                .field {
                    margin-bottom: 16px;
                }

                label {
                    display: block;
                    margin-bottom: 8px;
                    color: #55331F;
                    font-size: 13px;
                    font-weight: 700;
                }

                input {
                    display: block;
                    width: 100%;
                    padding: 13px 14px;
                    border: 1.5px solid #EAD8C8;
                    border-radius: 12px;
                    outline: none;
                    background: #FFFDFA;
                    color: #55331F;
                    font-size: 13px;
                    transition: .2s ease;
                }

                input:focus {
                    border-color: #C98755;
                    box-shadow: 0 0 0 3px rgba(201,135,85,.12);
                }

                input::placeholder {
                    color: #B5A397;
                }

                .error {
                    min-height: 16px;
                    margin: -3px 0 10px;
                    color: #B94A3A;
                    font-size: 11px;
                }

                .submit {
                    width: 100%;
                    padding: 14px;
                    border: none;
                    border-radius: 13px;
                    background: linear-gradient(
                        135deg, #C98755, #B87345
                    );
                    color: white;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: .2s ease;
                }

                .submit:hover {
                    transform: translateY(-2px);
                }

                .cancel {
                    width: 100%;
                    margin-top: 10px;
                    padding: 12px;
                    border: none;
                    border-radius: 12px;
                    background: #F1E5D9;
                    color: #76533E;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .cancel:hover {
                    background: #EAD6C4;
                }

                @media (max-width: 400px) {
                    .popup {
                        padding: 23px 18px 19px;
                    }

                    .header {
                        margin: -23px -18px 20px;
                    }

                    .title {
                        font-size: 18px;
                    }
                }
            </style>

            <div class="backdrop">
                <form class="popup">
                    <div class="header">
                        <h3 class="title">Detail Pemesanan</h3>
                        <p class="description">
                            Masukkan nama kamu untuk melanjutkan pesanan
                        </p>
                    </div>

                    <div class="field">
                        <label for="customer-name">Nama Kamu</label>
                        <input
                            id="customer-name"
                            type="text"
                            placeholder="Masukkan nama kamu"
                            maxlength="100"
                            autocomplete="name"
                            required
                        >
                    </div>

                    <p class="error" aria-live="polite"></p>

                    <button class="submit" type="submit">
                        Lanjutkan Pesanan →
                    </button>

                    <button class="cancel" type="button">Batal</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const backdrop = shadow.querySelector(".backdrop");
        const form = shadow.querySelector("form");
        const nameInput = shadow.querySelector("#customer-name");
        const error = shadow.querySelector(".error");
        const cancelButton = shadow.querySelector(".cancel");

        let closed = false;

        function closeModal(result) {
            if (closed) return;

            closed = true;
            backdrop.classList.remove("show");

            document.removeEventListener("keydown", handleEscape);

            setTimeout(() => modal.remove(), 300);
            resolve(result);
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                closeModal(null);
            }
        }

        form.addEventListener("submit", event => {
            event.preventDefault();

            const customerName = nameInput.value.trim();

            if (!customerName) {
                error.textContent = "Nama pelanggan wajib diisi.";
                nameInput.focus();
                return;
            }

            closeModal({
                customerName
            });
        });

        cancelButton.addEventListener("click", () => {
            closeModal(null);
        });

        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) {
                closeModal(null);
            }
        });

        document.addEventListener("keydown", handleEscape);

        requestAnimationFrame(() => {
            backdrop.classList.add("show");
            nameInput.focus();
        });
    });
}

// Checkout dan simpan pesanan
async function checkout() {
    if (cart.length === 0) {
        showEmptyCartModal();
        return;
    }

    // Tampilkan popup nama dan alamat pelanggan
    const customerData = await showCheckoutModal();

    // Jika pelanggan menekan Batal
    if (!customerData) {
        return;
    }

    const customerName = customerData.customerName;

    // Gabungkan produk dengan ID sama untuk database
    const groupedItems = {};

    cart.forEach(item => {
        const productId = Number(item.id);
        if (groupedItems[productId]) {
            groupedItems[productId].quantity += item.quantity;
        } else {
            groupedItems[productId] = {
                product_id: productId,
                quantity: item.quantity
            };
        }
    });

    const orderItems = Object.values(groupedItems);

    const button = document.querySelector(".checkout-button");

    if (button) {
        button.disabled = true;
        button.textContent = "Memproses Pesanan...";
    }

    try {
        // Simpan pesanan ke database Golang
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
            customer_name: customerName,
            items: orderItems
        })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                errorText || "Gagal menyimpan pesanan."
            );
        }

        const result = await response.json();

        const total = cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        // Membuat pesan WhatsApp
        let message = `*PESANAN WARUNG MAMA ILMA*\n\n`;

        message += `Nama: ${customerName}\n`;
        message += `*DETAIL PESANAN*\n`;

        cart.forEach((item, index) => {
            message += `${index + 1}. ${item.name}\n`;
            message += `   Level: ${item.spicyLevel}\n`;
            message += `   ${item.quantity} x ${formatRupiah(item.price)}\n`;
            message += `   Subtotal: ${formatRupiah(item.price * item.quantity)}\n\n`;
        });

        message += `*TOTAL: ${formatRupiah(total)}*\n`;
        message += `Terima kasih`;

        const whatsappURL =
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

        // Kosongkan keranjang
        cart = [];
        renderCart();

        // Tutup panel keranjang
        document.getElementById("cart-panel")?.classList.remove("open");
        document.getElementById("cart-overlay")?.classList.remove("show");

        // Tampilkan popup keberhasilan khusus
        showOrderSuccessModal(result.order_id, whatsappURL);

        // PENTING:
        // Jangan tambahkan window.location.href di sini.
        // WhatsApp dibuka melalui tombol pada popup keberhasilan.

    } catch (error) {

    console.error("Checkout gagal:", error);

    showOrderErrorModal(
        error.message || "Terjadi kesalahan saat menyimpan pesanan."
    );

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Pesan Sekarang →";
        }
    }
}


// Tombol masuk ke halaman utama warung
function setupOpeningScreen() {
    const openingScreen = document.getElementById("opening-screen");
    const enterButton = document.getElementById("enter-button");

    if (!openingScreen || !enterButton) return;

    enterButton.addEventListener("click", function () {
        openingScreen.style.transition =
            "opacity .5s ease, visibility .5s ease";

        openingScreen.style.opacity = "0";
        openingScreen.style.visibility = "hidden";
        openingScreen.style.pointerEvents = "none";

        document.body.style.overflow = "";

        setTimeout(() => {
            openingScreen.style.display = "none";
        }, 550);
    });
}

// Jalankan website
document.addEventListener("DOMContentLoaded", function () {
    setupOpeningScreen();
    loadProducts();
    renderCart();
});


function showOrderErrorModal(message) {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = `
        <style>
            * {
                box-sizing: border-box;
                font-family: Arial, sans-serif;
            }

            .overlay {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(48, 37, 31, 0.45);
                backdrop-filter: blur(4px);
                animation: fadeIn .25s ease;
            }

            .popup {
                width: 100%;
                max-width: 340px;
                padding: 26px 22px;
                border: 1px solid #EAD8C8;
                border-radius: 20px;
                background: #FFF8F0;
                color: #55331F;
                text-align: center;
                box-shadow: 0 15px 45px rgba(0,0,0,.18);
                animation: popupIn .3s ease;
            }

            .icon {
                width: 58px;
                height: 58px;
                margin: 0 auto 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: #FFF0DF;
                font-size: 30px;
            }

            h3 {
                margin: 0 0 9px;
                font-size: 18px;
                font-weight: 800;
            }

            p {
                margin: 0 0 22px;
                color: #887D75;
                font-size: 13px;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }

            button {
                width: 100%;
                padding: 13px;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #C98755, #B87345);
                color: white;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
            }

            button:active {
                transform: scale(.97);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes popupIn {
                from {
                    opacity: 0;
                    transform: translateY(15px) scale(.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        </style>

        <div class="overlay">
            <div class="popup">
                <div class="icon">⚠️</div>
                <h3>Pesanan Gagal</h3>
                <p>${String(message).replace(/[&<>"']/g, char => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                })[char])}</p>
                <button type="button">Mengerti</button>
            </div>
        </div>
    `;

    document.body.appendChild(host);

    shadow.querySelector("button").addEventListener("click", () => {
        host.remove();
    });

    shadow.querySelector(".overlay").addEventListener("click", event => {
        if (event.target.classList.contains("overlay")) {
            host.remove();
        }
    });
}

// Mencegah menu seleksi teks dan menu konteks saat ditekan lama
document.addEventListener("contextmenu", function(event) {
    if (
        event.target.tagName !== "INPUT" &&
        event.target.tagName !== "TEXTAREA"
    ) {
        event.preventDefault();
    }
});

// Mencegah seleksi teks pada halaman
document.addEventListener("selectstart", function(event) {
    if (
        event.target.tagName !== "INPUT" &&
        event.target.tagName !== "TEXTAREA"
    ) {
        event.preventDefault();
    }
});

// Mencegah gambar diseret
document.addEventListener("dragstart", function(event) {
    event.preventDefault();
});
// =====================================
// PERLINDUNGAN ZOOM SAFARI IPHONE
// TANPA MENGGANGGU PULL TO REFRESH
// =====================================

(function preventIOSGestures() {

    // Mencegah zoom dengan gerakan beberapa jari
    document.addEventListener("gesturestart", function(event) {
        event.preventDefault();
    }, { passive: false });

    document.addEventListener("gesturechange", function(event) {
        event.preventDefault();
    }, { passive: false });

    document.addEventListener("gestureend", function(event) {
        event.preventDefault();
    }, { passive: false });

})();
function showOrderSuccessModal(orderId, whatsappURL) {
    const oldModal = document.getElementById("order-success-modal");
    oldModal?.remove();

    const modal = document.createElement("div");
    modal.id = "order-success-modal";

    const shadow = modal.attachShadow({ mode: "open" });

    shadow.innerHTML = `
        <style>
            :host {
                all: initial;
            }

            * {
                box-sizing: border-box;
                font-family: Arial, sans-serif;
            }

            .backdrop {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 18px;
                background: rgba(48,37,31,.60);
                backdrop-filter: blur(5px);
                opacity: 0;
                visibility: hidden;
                transition: opacity .35s ease,
                            visibility .35s ease;
            }

            .backdrop.show {
                opacity: 1;
                visibility: visible;
            }

            .popup {
                position: relative;
                width: 100%;
                max-width: 370px;
                padding: 28px 24px 23px;
                border-radius: 24px;
                background: #FFF8F0;
                color: #55331F;
                border: 1px solid #EAD8C8;
                box-shadow: 0 25px 80px rgba(48,37,31,.25);
                text-align: center;
                transform: translateY(25px) scale(.94);
                transition: transform .4s cubic-bezier(.2,.8,.2,1);
                overflow: hidden;
            }

            .backdrop.show .popup {
                transform: translateY(0) scale(1);
            }

            .popup::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 5px;
                background: linear-gradient(
                    90deg, #C98755, #E9B58E, #C98755
                );
            }

            .icon {
                width: 72px;
                height: 72px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 18px;
                border-radius: 23px;
                background: linear-gradient(
                    145deg, #F8E8D9, #F1D5BE
                );
                color: #A96335;
                font-size: 35px;
                font-weight: 800;
            }

            .eyebrow {
                display: block;
                margin-bottom: 8px;
                color: #C98755;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 2px;
            }

            .title {
                margin: 0 0 10px;
                color: #55331F;
                font-size: 20px;
                font-weight: 800;
            }

            .description {
                margin: 0 0 17px;
                color: #887D75;
                font-size: 13px;
                line-height: 1.7;
            }

            .order-number {
                display: inline-block;
                margin-bottom: 22px;
                padding: 10px 18px;
                border: 1px solid #EAD8C8;
                border-radius: 12px;
                background: #FFF0DF;
                color: #A96335;
                font-size: 16px;
                font-weight: 800;
            }

            button {
                width: 100%;
                padding: 14px;
                border: none;
                border-radius: 14px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all .25s ease;
            }

            .whatsapp {
                background: linear-gradient(
                    135deg, #C98755, #B87345
                );
                color: white;
            }

            .whatsapp:hover {
                transform: translateY(-2px);
            }

            .close {
                margin-top: 10px;
                background: #F1E5D9;
                color: #76533E;
            }

            .close:hover {
                background: #EAD6C4;
            }

            button:active {
                transform: scale(.97);
            }

            @media (max-width: 400px) {
                .popup {
                    padding: 25px 19px 20px;
                }

                .title {
                    font-size: 19px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation: none !important;
                    transition: none !important;
                }
            }
        </style>

        <div class="backdrop">
            <div class="popup" role="dialog" aria-modal="true">
                <div class="icon">✓</div>

                <span class="eyebrow">WARUNG MAMA ILMA</span>

                <h3 class="title">
                    Pesanan Berhasil Disimpan!
                </h3>

                <p class="description">
                    Terima kasih sudah memesan.
                    Pesanan kamu berhasil dicatat.
                </p>

                <div class=>
                </div>

                <button class="whatsapp" type="button">
                    Kirim Pesanan ke WhatsApp →
                </button>

                <button class="close" type="button">
                    Tutup
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const backdrop = shadow.querySelector(".backdrop");

    function closeModal() {
        backdrop.classList.remove("show");
        setTimeout(() => modal.remove(), 350);
    }

    shadow.querySelector(".whatsapp").addEventListener("click", () => {
        closeModal();
        window.location.href = whatsappURL;
    });

    shadow.querySelector(".close").addEventListener("click", closeModal);

    backdrop.addEventListener("click", event => {
        if (event.target === backdrop) {
            closeModal();
        }
    });

    requestAnimationFrame(() => {
        backdrop.classList.add("show");
    });
}
