package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

var db *sql.DB

func initDatabase() {
	// Membaca file .env saat dijalankan secara lokal.
	// Di Vercel, DATABASE_URL akan dibaca dari Environment Variables.
	_ = godotenv.Load()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL belum diatur!")
	}

	var err error

	// Menghubungkan Go ke PostgreSQL Supabase.
	db, err = sql.Open("pgx", databaseURL)
	if err != nil {
		log.Fatal("Gagal membuka koneksi Supabase:", err)
	}

	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)

	// Memeriksa koneksi database.
	if err = db.Ping(); err != nil {
		log.Fatal("Database Supabase tidak dapat diakses:", err)
	}

	log.Println("====================================")
	log.Println("Koneksi PostgreSQL Supabase berhasil!")
	log.Println("Database Warung Mama Ilma siap digunakan!")
	log.Println("====================================")
}
