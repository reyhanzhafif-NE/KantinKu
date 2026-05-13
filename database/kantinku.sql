-- KantinKu — Database Schema
-- Import file ini untuk setup database dari awal

CREATE DATABASE IF NOT EXISTS kantinku
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kantinkupro;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transaksi (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  jenis       ENUM('income','expense') NOT NULL,
  jumlah      BIGINT NOT NULL,
  keterangan  VARCHAR(255) NOT NULL,
  kategori    VARCHAR(100) DEFAULT NULL,
  waktu       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_waktu   (waktu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;