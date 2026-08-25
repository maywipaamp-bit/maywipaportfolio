-- Maywipa.am Portfolio — schema + seed
-- Run with: npm run setup-db (uses .env credentials)

CREATE DATABASE IF NOT EXISTS `maywipa_portfolio`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `maywipa_portfolio`;

-- Single-row profile
CREATE TABLE IF NOT EXISTS profile (
  id        INT PRIMARY KEY DEFAULT 1,
  name      VARCHAR(120) NOT NULL,
  bio       TEXT NOT NULL,
  photo     VARCHAR(255) NOT NULL DEFAULT '',
  footer    VARCHAR(160) NOT NULL DEFAULT '',
  clients_intro VARCHAR(500) NOT NULL DEFAULT '',
  CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Works (ผลงาน)
CREATE TABLE IF NOT EXISTS works (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(160) NOT NULL,
  tags        VARCHAR(255) NOT NULL DEFAULT '',   -- comma separated pills
  category    VARCHAR(60) NOT NULL DEFAULT '',    -- หมวดหมู่ (ตัวกรอง)
  description TEXT NOT NULL,
  thumb       VARCHAR(255) NOT NULL DEFAULT '',   -- grid thumbnail
  cta_label   VARCHAR(80) NOT NULL DEFAULT '',     -- ปุ่มลิงก์ด้านล่าง
  cta_url     VARCHAR(255) NOT NULL DEFAULT '',
  views       INT NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carousel images per work
CREATE TABLE IF NOT EXISTS work_images (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  work_id    INT NOT NULL,
  url        VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Services (บริการ)
CREATE TABLE IF NOT EXISTS services (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  icon       VARCHAR(30) NOT NULL DEFAULT 'document', -- document | table | chart
  title      VARCHAR(160) NOT NULL,
  subtitle   VARCHAR(200) NOT NULL DEFAULT '',
  views      INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clients (ลูกค้า)
CREATE TABLE IF NOT EXISTS clients (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  logo       VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Experience timeline (ประสบการณ์)
CREATE TABLE IF NOT EXISTS experiences (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(160) NOT NULL,
  period     VARCHAR(160) NOT NULL DEFAULT '',
  summary    TEXT NOT NULL DEFAULT (''),
  is_edu     TINYINT(1) NOT NULL DEFAULT 0,  -- education entry = muted dot, no connector
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects under an experience
CREATE TABLE IF NOT EXISTS experience_projects (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  experience_id INT NOT NULL,
  name          VARCHAR(160) NOT NULL,
  meta          VARCHAR(200) NOT NULL DEFAULT '', -- "หน่วยงาน · บทบาท"
  logo          VARCHAR(255) NOT NULL DEFAULT '',
  year          VARCHAR(40) NOT NULL DEFAULT '',
  org           VARCHAR(160) NOT NULL DEFAULT '',
  role          VARCHAR(160) NOT NULL DEFAULT '',
  responsibility VARCHAR(500) NOT NULL DEFAULT '',
  sort_order    INT NOT NULL DEFAULT 0,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact + social rows (ติดต่อ)
CREATE TABLE IF NOT EXISTS contacts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  grp        VARCHAR(20) NOT NULL DEFAULT 'contact', -- contact | social
  icon       VARCHAR(30) NOT NULL DEFAULT 'mail',    -- mail|phone|line|instagram|facebook|tiktok
  label      VARCHAR(80) NOT NULL,
  value      VARCHAR(160) NOT NULL,
  href       VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Images per service (คลิกดูภาพผลงานของบริการ)
CREATE TABLE IF NOT EXISTS service_images (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  url        VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
