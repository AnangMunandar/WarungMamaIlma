
package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

type Product struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
	Price    int    `json:"price"`
	Emoji    string `json:"emoji"`
}

type OrderItemRequest struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

type OrderRequest struct {
	CustomerName string             `json:"customer_name"`
	Address      string             `json:"address"`
	Items        []OrderItemRequest `json:"items"`
}

type OrderResponse struct {
	OrderID int64  `json:"order_id"`
	Total   int    `json:"total"`
	Status  string `json:"status"`
}

func main() {
	initDatabase()
	defer db.Close()

	http.HandleFunc("/", homeHandler)

	http.Handle("/static/", http.StripPrefix(
		"/static/",
		http.FileServer(http.Dir("./static")),
	))

	http.HandleFunc("/api/products", productsHandler)
	http.HandleFunc("/api/orders", ordersHandler)

	log.Println("====================================")
	log.Println("Warung Mama Ilma berjalan!")
	log.Println("Buka: http://localhost:8080")
	log.Println("====================================")

	log.Fatal(http.ListenAndServe("0.0.0.0:8080", nil))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Metode tidak diizinkan", http.StatusMethodNotAllowed)
		return
	}

	http.ServeFile(w, r, "./templates/index.html")
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Metode tidak diizinkan", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Query(`
		SELECT id, name, category, price, emoji
		FROM products
		WHERE active = TRUE
		ORDER BY id ASC
	`)
	if err != nil {
		http.Error(w, "Gagal mengambil produk", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	products := make([]Product, 0)

	for rows.Next() {
		var product Product

		err := rows.Scan(
			&product.ID,
			&product.Name,
			&product.Category,
			&product.Price,
			&product.Emoji,
		)
		if err != nil {
			http.Error(w, "Gagal membaca produk", http.StatusInternalServerError)
			return
		}

		products = append(products, product)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Gagal membaca data produk", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Metode tidak diizinkan", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	var request OrderRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&request); err != nil {
		http.Error(w, "Format pesanan tidak valid", http.StatusBadRequest)
		return
	}

	request.CustomerName = strings.TrimSpace(request.CustomerName)
	request.Address = strings.TrimSpace(request.Address)

	// Nama wajib diisi, alamat tidak diwajibkan.
	if request.CustomerName == "" {
		http.Error(w, "Nama pelanggan wajib diisi", http.StatusBadRequest)
		return
	}

	if len(request.CustomerName) > 100 {
		http.Error(w, "Nama pelanggan terlalu panjang", http.StatusBadRequest)
		return
	}

	if len(request.Items) == 0 || len(request.Items) > 50 {
		http.Error(w, "Jumlah jenis produk tidak valid", http.StatusBadRequest)
		return
	}

	seen := make(map[int64]bool)
	total := 0

	type SavedItem struct {
		ProductID   int64
		ProductName string
		Price       int
		Quantity    int
		Subtotal    int
	}

	savedItems := make([]SavedItem, 0, len(request.Items))

	for _, item := range request.Items {
		if item.ProductID <= 0 || item.Quantity < 1 || item.Quantity > 100 {
			http.Error(w, "Produk atau jumlah pesanan tidak valid", http.StatusBadRequest)
			return
		}

		if seen[item.ProductID] {
			http.Error(w, "Produk tidak boleh dikirim berulang", http.StatusBadRequest)
			return
		}
		seen[item.ProductID] = true

		var productName string
		var price int

		err := db.QueryRow(`
			SELECT name, price
			FROM products
			WHERE id = $1 AND active = TRUE
		`, item.ProductID).Scan(&productName, &price)

		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "Produk tidak ditemukan atau tidak aktif", http.StatusBadRequest)
				return
			}

			http.Error(w, "Gagal memeriksa produk", http.StatusInternalServerError)
			return
		}

		subtotal := price * item.Quantity
		total += subtotal

		savedItems = append(savedItems, SavedItem{
			ProductID:   item.ProductID,
			ProductName: productName,
			Price:       price,
			Quantity:    item.Quantity,
			Subtotal:    subtotal,
		})
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Gagal memulai transaksi", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// PostgreSQL menggunakan RETURNING untuk mengambil ID baru.
	var orderID int64

	err = tx.QueryRow(`
		INSERT INTO orders (customer_name, address, total, status)
		VALUES ($1, $2, $3, 'Menunggu')
		RETURNING id
	`, request.CustomerName, request.Address, total).Scan(&orderID)

	if err != nil {
		http.Error(w, "Gagal menyimpan pesanan", http.StatusInternalServerError)
		return
	}

	statement, err := tx.Prepare(`
		INSERT INTO order_items
		(order_id, product_id, product_name, price, quantity, subtotal)
		VALUES ($1, $2, $3, $4, $5, $6)
	`)
	if err != nil {
		http.Error(w, "Gagal menyiapkan detail pesanan", http.StatusInternalServerError)
		return
	}
	defer statement.Close()

	for _, item := range savedItems {
		_, err := statement.Exec(
			orderID,
			item.ProductID,
			item.ProductName,
			item.Price,
			item.Quantity,
			item.Subtotal,
		)

		if err != nil {
			http.Error(w, "Gagal menyimpan detail pesanan", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Gagal menyelesaikan pesanan", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(OrderResponse{
		OrderID: orderID,
		Total:   total,
		Status:  "Menunggu",
	})
}
