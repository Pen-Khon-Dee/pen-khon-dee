-- =====================================================================
-- Pen Khon Dee : Restaurant Front-of-House Management System
-- Schema.sql  (MySQL 8.0.16+)
-- Creates the database and all 13 tables
-- =====================================================================

DROP DATABASE IF EXISTS pen_khon_dee;
CREATE DATABASE pen_khon_dee;
USE pen_khon_dee;

-- ---------------------------------------------------------------------
-- Group 1: Membership
-- ---------------------------------------------------------------------

CREATE TABLE member_level (
  level_id          INT           AUTO_INCREMENT PRIMARY KEY,
  level_name        VARCHAR(50)   NOT NULL UNIQUE,
  min_points        INT           NOT NULL UNIQUE,
  discount_percent  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  benefit           VARCHAR(255)  NULL,
  CONSTRAINT chk_level_points   CHECK (min_points >= 0),
  CONSTRAINT chk_level_discount CHECK (discount_percent BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE customer (
  customer_id  INT           AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  phone        VARCHAR(20)   NOT NULL UNIQUE,     
  email        VARCHAR(100)  NULL                  
) ENGINE=InnoDB;

CREATE TABLE member (
  member_id       INT   AUTO_INCREMENT PRIMARY KEY,
  customer_id     INT   NOT NULL UNIQUE,          
  level_id        INT   NOT NULL,
  current_points  INT   NOT NULL DEFAULT 0,
  join_date       DATE  NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT chk_member_points  CHECK (current_points >= 0),
  CONSTRAINT fk_member_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_member_level    FOREIGN KEY (level_id)    REFERENCES member_level(level_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Group 5: Employees (created early: reservation and orders reference it)
-- ---------------------------------------------------------------------

CREATE TABLE employee (
  employee_id    INT           AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  phone          VARCHAR(20)   NULL,
  username       VARCHAR(50)   NOT NULL UNIQUE,
  email          VARCHAR(160)  NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,          
  role           VARCHAR(10)   NOT NULL,
  status         VARCHAR(10)   NOT NULL DEFAULT 'Active',
  CONSTRAINT chk_employee_role   CHECK (role IN ('Server', 'Cashier', 'Kitchen')),
  CONSTRAINT chk_employee_status CHECK (status IN ('Active', 'Inactive'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Group 2: Tables and reservations
-- ---------------------------------------------------------------------

CREATE TABLE dining_table (
  table_id      INT          AUTO_INCREMENT PRIMARY KEY,
  table_number  INT          NOT NULL UNIQUE,
  capacity      INT          NOT NULL,
  table_status  VARCHAR(10)  NOT NULL DEFAULT 'Available',
  qr_token      CHAR(32)     NOT NULL UNIQUE,      
  CONSTRAINT chk_table_number   CHECK (table_number > 0),
  CONSTRAINT chk_table_capacity CHECK (capacity > 0),
  CONSTRAINT chk_table_status   CHECK (table_status IN ('Available', 'Occupied'))
) ENGINE=InnoDB;

CREATE TABLE reservation (
  reservation_id        INT          AUTO_INCREMENT PRIMARY KEY,
  customer_id           INT          NOT NULL,
  employee_id           INT          NOT NULL,     
  reservation_datetime  DATETIME     NOT NULL,     
  number_of_guests      INT          NOT NULL,
  reservation_status    VARCHAR(10)  NOT NULL DEFAULT 'Confirmed',
  CONSTRAINT chk_reservation_guests CHECK (number_of_guests > 0),
  CONSTRAINT chk_reservation_status
    CHECK (reservation_status IN ('Confirmed', 'Seated', 'Cancelled', 'No-show')),
  CONSTRAINT fk_reservation_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_reservation_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
  INDEX idx_reservation_datetime (reservation_datetime)
) ENGINE=InnoDB;


CREATE TABLE reservation_table (
  reservation_id  INT  NOT NULL,
  table_id        INT  NOT NULL,
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
  category_id    INT          AUTO_INCREMENT PRIMARY KEY,
  category_name  VARCHAR(50)  NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE menu (
  menu_id              INT            AUTO_INCREMENT PRIMARY KEY,
  category_id          INT            NOT NULL,
  menu_name            VARCHAR(100)   NOT NULL,
  price                DECIMAL(10,2)  NOT NULL,
  availability_status  VARCHAR(15)    NOT NULL DEFAULT 'Available',
  CONSTRAINT chk_menu_price  CHECK (price >= 0),
  CONSTRAINT chk_menu_status CHECK (availability_status IN ('Available', 'Sold_Out', 'Discontinued')),
  CONSTRAINT fk_menu_category FOREIGN KEY (category_id) REFERENCES category(category_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Group 4: Orders
-- ---------------------------------------------------------------------

CREATE TABLE orders (
  order_id         INT            AUTO_INCREMENT PRIMARY KEY,
  customer_id      INT            NULL,           
  employee_id      INT            NOT NULL,       
  order_datetime   DATETIME       NOT NULL,       
  order_status     VARCHAR(10)    NOT NULL DEFAULT 'Open',
  payment_status   VARCHAR(10)    NOT NULL DEFAULT 'Unpaid',
  discount_amount  DECIMAL(10,2)  NOT NULL DEFAULT 0,
  total_amount     DECIMAL(10,2)  NOT NULL DEFAULT 0, 
  CONSTRAINT chk_orders_status  CHECK (order_status IN ('Open', 'Closed', 'Cancelled')),
  CONSTRAINT chk_orders_payment CHECK (payment_status IN ('Unpaid', 'Paid')),
  CONSTRAINT chk_orders_amounts CHECK (discount_amount >= 0 AND total_amount >= 0),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
  CONSTRAINT fk_orders_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
  INDEX idx_orders_status (order_status, payment_status)
) ENGINE=InnoDB;


CREATE TABLE order_table (
  order_id  INT  NOT NULL,
  table_id  INT  NOT NULL,
  PRIMARY KEY (order_id, table_id),
  CONSTRAINT fk_ot_order FOREIGN KEY (order_id)
    REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_ot_table FOREIGN KEY (table_id)
    REFERENCES dining_table(table_id)
) ENGINE=InnoDB;

CREATE TABLE order_item (
  order_item_id  INT            AUTO_INCREMENT PRIMARY KEY,
  order_id       INT            NOT NULL,
  menu_id        INT            NOT NULL,
  quantity       INT            NOT NULL,
  unit_price     DECIMAL(10,2)  NOT NULL,         
  subtotal       DECIMAL(10,2)  NOT NULL,          
  item_status    VARCHAR(10)    NOT NULL DEFAULT 'Pending',  
  note           VARCHAR(255)   NULL,
  CONSTRAINT chk_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_item_subtotal CHECK (subtotal = quantity * unit_price),
  CONSTRAINT chk_item_status   CHECK (item_status IN ('Pending', 'Ready', 'Served', 'Cancelled')),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id)
    REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_item_menu FOREIGN KEY (menu_id) REFERENCES menu(menu_id),
  INDEX idx_item_status (item_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Point history (created last: references member and orders)
-- ---------------------------------------------------------------------

CREATE TABLE point_transaction (
  point_transaction_id  INT          AUTO_INCREMENT PRIMARY KEY,
  member_id             INT          NOT NULL,
  order_id              INT          NULL UNIQUE,  
  points                INT          NOT NULL, 
  type                  VARCHAR(10)  NOT NULL DEFAULT 'Earn',
  transaction_date      DATETIME     NOT NULL,  

  CONSTRAINT chk_pt_type CHECK (type IN ('Earn', 'Adjust')),
  CONSTRAINT chk_pt_earn CHECK (
    (type = 'Earn'   AND order_id IS NOT NULL AND points > 0) OR
    (type = 'Adjust' AND order_id IS NULL     AND points <> 0)
  ),
  CONSTRAINT fk_pt_member FOREIGN KEY (member_id) REFERENCES member(member_id),
  CONSTRAINT fk_pt_order  FOREIGN KEY (order_id)  REFERENCES orders(order_id)
) ENGINE=InnoDB;