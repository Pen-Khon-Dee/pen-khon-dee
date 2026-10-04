-- =====================================================================
-- Pen Khon Dee : Restaurant Front-of-House Management System
-- Schema.sql  (MySQL 8.0.16+)
-- Creates the database and all 13 tables
-- Note: Order -> orders, Table -> dining_table
--       because ORDER and TABLE are reserved words in MySQL
-- =====================================================================

DROP DATABASE IF EXISTS pen_khon_dee;
CREATE DATABASE pen_khon_dee
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE pen_khon_dee;

-- ---------------------------------------------------------------------
-- Group 1: Membership
-- ---------------------------------------------------------------------

CREATE TABLE member_level (
  level_id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  level_name        VARCHAR(50)   NOT NULL UNIQUE,
  min_points        INT UNSIGNED  NOT NULL UNIQUE,
  discount_percent  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  benefit           VARCHAR(255)  NULL,
  CONSTRAINT chk_level_discount CHECK (discount_percent BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE customer (
  customer_id  INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  phone        VARCHAR(20)   NOT NULL UNIQUE,      -- customers are looked up by phone, must be unique
  email        VARCHAR(100)  NULL                  -- optional
) ENGINE=InnoDB;

CREATE TABLE member (
  member_id       INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  customer_id     INT UNSIGNED  NOT NULL UNIQUE,   -- UNIQUE = one member per customer (1:1)
  level_id        INT UNSIGNED  NOT NULL,
  current_points  INT UNSIGNED  NOT NULL DEFAULT 0,
  join_date       DATE          NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT fk_member_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_member_level    FOREIGN KEY (level_id)    REFERENCES member_level(level_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Group 5: Employees (created early: reservation and orders reference it)
-- ---------------------------------------------------------------------

CREATE TABLE employee (
  employee_id    INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  phone          VARCHAR(20)   NULL,
  username       VARCHAR(50)   NOT NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,           -- bcrypt hash, never the plain password
  role           ENUM('Server','Cashier')   NOT NULL,
  status         ENUM('Active','Inactive')  NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Group 2: Tables and reservations
-- ---------------------------------------------------------------------

CREATE TABLE dining_table (
  table_id      INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  table_number  INT UNSIGNED      NOT NULL UNIQUE,
  capacity      TINYINT UNSIGNED  NOT NULL,
  table_status  ENUM('Available','Occupied') NOT NULL DEFAULT 'Available',
  CONSTRAINT chk_table_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE reservation (
  reservation_id        INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  customer_id           INT UNSIGNED      NOT NULL,
  employee_id           INT UNSIGNED      NOT NULL,   -- Cashier who took the booking
  reservation_datetime  DATETIME          NOT NULL,   -- holds the tables for 2 hours from this time
  number_of_guests      TINYINT UNSIGNED  NOT NULL,
  reservation_status    ENUM('Confirmed','Seated','Cancelled','No-show')
                        NOT NULL DEFAULT 'Confirmed',
  CONSTRAINT chk_reservation_guests CHECK (number_of_guests > 0),
  CONSTRAINT fk_reservation_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_reservation_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
  INDEX idx_reservation_datetime (reservation_datetime)
) ENGINE=InnoDB;

-- Bridge table: Reservation <-> Table (M:N)
CREATE TABLE reservation_table (
  reservation_id  INT UNSIGNED  NOT NULL,
  table_id        INT UNSIGNED  NOT NULL,
  PRIMARY KEY (reservation_id, table_id),
  CONSTRAINT fk_rt_reservation FOREIGN KEY (reservation_id)
    REFERENCES reservation(reservation_id) ON DELETE CASCADE,
  CONSTRAINT fk_rt_table FOREIGN KEY (table_id)
    REFERENCES dining_table(table_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Group 3: Menu
-- ---------------------------------------------------------------------

CREATE TABLE category (
  category_id    INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  category_name  VARCHAR(50)   NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE menu (
  menu_id              INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  category_id          INT UNSIGNED   NOT NULL,
  menu_name            VARCHAR(100)   NOT NULL,
  price                DECIMAL(10,2)  NOT NULL,
  availability_status  ENUM('Available','Sold_Out','Discontinued')
                       NOT NULL DEFAULT 'Available',
  CONSTRAINT chk_menu_price CHECK (price >= 0),
  CONSTRAINT fk_menu_category FOREIGN KEY (category_id) REFERENCES category(category_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Group 4: Orders
-- ---------------------------------------------------------------------

CREATE TABLE orders (
  order_id         INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  customer_id      INT UNSIGNED   NULL,              -- NULL = anonymous walk-in
  employee_id      INT UNSIGNED   NOT NULL,          -- Cashier who opened the order
  order_datetime   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- time the guests were seated
  order_status     ENUM('Open','Closed','Cancelled') NOT NULL DEFAULT 'Open',
  payment_status   ENUM('Unpaid','Paid')             NOT NULL DEFAULT 'Unpaid',
  discount_amount  DECIMAL(10,2)  NOT NULL DEFAULT 0,
  total_amount     DECIMAL(10,2)  NOT NULL DEFAULT 0,  -- amount after discount (calculated by backend)
  CONSTRAINT chk_orders_amounts CHECK (discount_amount >= 0 AND total_amount >= 0),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_orders_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
  INDEX idx_orders_status (order_status, payment_status)
) ENGINE=InnoDB;

-- Bridge table: Order <-> Table (M:N)
CREATE TABLE order_table (
  order_id  INT UNSIGNED  NOT NULL,
  table_id  INT UNSIGNED  NOT NULL,
  PRIMARY KEY (order_id, table_id),
  CONSTRAINT fk_ot_order FOREIGN KEY (order_id)
    REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_ot_table FOREIGN KEY (table_id)
    REFERENCES dining_table(table_id)
) ENGINE=InnoDB;

CREATE TABLE order_item (
  order_item_id  INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  order_id       INT UNSIGNED   NOT NULL,
  menu_id        INT UNSIGNED   NOT NULL,
  quantity       INT UNSIGNED   NOT NULL,
  unit_price     DECIMAL(10,2)  NOT NULL,            -- copied from menu.price at order time
  subtotal       DECIMAL(10,2)  GENERATED ALWAYS AS (quantity * unit_price) STORED,
  item_status    ENUM('Pending','Served','Cancelled') NOT NULL DEFAULT 'Pending',
  note           VARCHAR(255)   NULL,
  CONSTRAINT chk_item_quantity CHECK (quantity > 0),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id)
    REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_item_menu FOREIGN KEY (menu_id) REFERENCES menu(menu_id),
  INDEX idx_item_status (item_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Point history (created last: references member and orders)
-- ---------------------------------------------------------------------

CREATE TABLE point_transaction (
  point_transaction_id  INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  member_id             INT UNSIGNED  NOT NULL,
  order_id              INT UNSIGNED  NOT NULL,
  points                INT           NOT NULL,      -- Adjust may be negative
  type                  ENUM('Earn','Adjust') NOT NULL DEFAULT 'Earn',
  transaction_date      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pt_member FOREIGN KEY (member_id) REFERENCES member(member_id),
  CONSTRAINT fk_pt_order  FOREIGN KEY (order_id)  REFERENCES orders(order_id)
) ENGINE=InnoDB;