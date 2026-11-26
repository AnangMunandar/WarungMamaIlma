package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var (
	db     *sql.DB
	dbOnce sync.Once
	dbErr  error
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

func database() (*sql.DB, error) {
	dbOnce.Do(func() {
		databaseURL := os.Getenv("DATABASE_URL")
		if databaseURL == "" {
			dbErr = errors.New("DATABASE_URL belum diatur")
			return
		}

		db, dbErr = sql.Open("pgx", databaseURL)
		if dbErr != nil {
			return
		}

		db.SetMaxOpenConns(5)
		db.SetMaxIdleConns(2)
		db.SetConnMaxLifetime(5 * time.Minute)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if dbErr = db.PingContext(ctx); dbErr != nil {
			db.Close()
			db = nil
			return
		}
	})

	return db, dbErr
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	switch r.URL.Query().Get("route") {
	case "products":
		productsHandler(w, r)
	case "orders":
		ordersHandler(w, r)
	default:
		http.NotFound(w, r)
	}
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Metode tidak diizinkan", http.StatusMethodNotAllowed)
		return
	}

	database, err := database()
	if err != nil {
		log.Println("Koneksi database:", err)
		http.Error(w, "Database tidak dapat diakses", http.StatusInternalServerError)
		return
	}

	rows, err := database.QueryContext(r.Context(), `
		SELECT id, name, category, price, emoji
		FROM products
		WHERE active = TRUE
		ORDER BY id ASC
	`)
	if err != nil {
		log.Println("Query produk:", err)
		http.Error(w, "Gagal mengambil produk", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	products := make([]Product, 0)

	for rows.Next() {
		var product Product

		if err := rows.Scan(
			&product.ID,
			&product.Name,
			&product.Category,
			&product.Price,
			&product.Emoji,
		); err != nil {
			log.Println("Membaca produk:", err)
			http.Error(w, "Gagal membaca produk", http.StatusInternalServerError)
			return
		}

		products = append(products, product)
	}

	if err := rows.Err(); err != nil {
		log.Println("Membaca baris produk:", err)
		http.Error(w, "Gagal membaca data produk", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
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

	type SavedItem struct {
		ProductID   int64
		ProductName string
		Price       int
		Quantity    int
		Subtotal    int
	}

	seen := make(map[int64]bool)
	savedItems := make([]SavedItem, 0, len(request.Items))
	total := 0

	database, err := database()
	if err != nil {
		log.Println("Koneksi database:", err)
		http.Error(w, "Database tidak dapat diakses", http.StatusInternalServerError)
		return
	}

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

		err := database.QueryRowContext(r.Context(), `
			SELECT name, price
			FROM products
			WHERE id = $1 AND active = TRUE
		`, item.ProductID).Scan(&productName, &price)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				http.Error(w, "Produk tidak ditemukan atau tidak aktif", http.StatusBadRequest)
				return
			}

			log.Println("Memeriksa produk:", err)
			http.Error(w, "Gagal memeriksa produk", http.StatusInternalServerError)
			return
		}

		subtotal := price * item.Quantity
		if price < 0 || subtotal < 0 || total > int(^uint(0)>>1)-subtotal {
			http.Error(w, "Total pesanan tidak valid", http.StatusBadRequest)
			return
		}

		total += subtotal

		savedItems = append(savedItems, SavedItem{
			ProductID:   item.ProductID,
			ProductName: productName,
			Price:       price,
			Quantity:    item.Quantity,
			Subtotal:    subtotal,
		})
	}

	tx, err := database.BeginTx(r.Context(), nil)
	if err != nil {
		log.Println("Memulai transaksi:", err)
		http.Error(w, "Gagal memulai transaksi", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var orderID int64

	err = tx.QueryRowContext(r.Context(), `
		INSERT INTO orders (customer_name, address, total, status)
		VALUES ($1, $2, $3, 'Menunggu')
		RETURNING id
	`, request.CustomerName, request.Address, total).Scan(&orderID)

	if err != nil {
		log.Println("Menyimpan pesanan:", err)
		http.Error(w, "Gagal menyimpan pesanan", http.StatusInternalServerError)
		return
	}

	statement, err := tx.PrepareContext(r.Context(), `
		INSERT INTO order_items
		(order_id, product_id, product_name, price, quantity, subtotal)
		VALUES ($1, $2, $3, $4, $5, $6)
	`)
	if err != nil {
		log.Println("Menyiapkan detail pesanan:", err)
		http.Error(w, "Gagal menyiapkan detail pesanan", http.StatusInternalServerError)
		return
	}
	defer statement.Close()

	for _, item := range savedItems {
		_, err := statement.ExecContext(
			r.Context(),
			orderID,
			item.ProductID,
			item.ProductName,
			item.Price,
			item.Quantity,
			item.Subtotal,
		)

		if err != nil {
			log.Println("Menyimpan detail pesanan:", err)
			http.Error(w, "Gagal menyimpan detail pesanan", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		log.Println("Menyelesaikan transaksi:", err)
		http.Error(w, "Gagal menyelesaikan pesanan", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(OrderResponse{
		OrderID: orderID,
		Total:   total,
		Status:  "Menunggu",
	})
}
