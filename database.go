package main

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var db *sql.DB

func initDatabase() {
	var err error

	db, err = sql.Open("sqlite", "./database/warung.db")
	if err != nil {
		log.Fatal("Gagal membuka database:", err)
	}

	db.SetMaxOpenConns(1)

	if err = db.Ping(); err != nil {
		log.Fatal("Database tidak dapat diakses:", err)
	}

	queries := []string{
		`CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			category TEXT NOT NULL,
			price INTEGER NOT NULL,
			emoji TEXT NOT NULL,
			active INTEGER DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS orders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_name TEXT NOT NULL,
			address TEXT NOT NULL,
			total INTEGER NOT NULL,
			status TEXT DEFAULT 'Menunggu',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS order_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			order_id INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			product_name TEXT NOT NULL,
			price INTEGER NOT NULL,
			quantity INTEGER NOT NULL,
			subtotal INTEGER NOT NULL,
			FOREIGN KEY(order_id) REFERENCES orders(id)
		)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			log.Fatal("Gagal membuat tabel:", err)
		}
	}

	seedProducts()

	log.Println("Database Warung Mama Ilma berhasil disiapkan!")
}

func seedProducts() {
	var count int

	err := db.QueryRow("SELECT COUNT(*) FROM products").Scan(&count)
	if err != nil {
		log.Fatal("Gagal memeriksa produk:", err)
	}

	if count > 0 {
		return
	}

	products := []struct {
		name     string
		category string
		price    int
		emoji    string
	}{
		{"Kentang Goreng", "Gorengan", 5000, "🍟"},
		{"Sosis", "Gorengan", 2000, "🌭"},
		{"Otak-Otak", "Gorengan", 2000, "🍢"},
		{"Dumpling", "Gorengan", 2000, "🥟"},
		{"Nugget", "Gorengan", 2000, "🍗"},

		{"Sosis", "Bakaran", 2000, "🌭"},
		{"Otak-Otak", "Bakaran", 2000, "🍢"},
		{"Fish Roll", "Bakaran", 2000, "🍡"},
		{"Pisang Bakar", "Bakaran", 5000, "🍌"},
		{"Roti Bakar", "Bakaran", 5000, "🍞"},

		{"Seblak", "Spesial", 12000, "🥘"},
	}

	statement, err := db.Prepare(
		"INSERT INTO products (name, category, price, emoji) VALUES (?, ?, ?, ?)",
	)
	if err != nil {
		log.Fatal("Gagal menyiapkan data produk:", err)
	}
	defer statement.Close()

	for _, product := range products {
		_, err := statement.Exec(
			product.name,
			product.category,
			product.price,
			product.emoji,
		)

		if err != nil {
			log.Fatal("Gagal menambahkan produk:", err)
		}
	}

	log.Println("11 produk awal berhasil dimasukkan!")
}
