-- =====================================================================
-- Pen Khon Dee : Seed.sql
-- Sample data for testing (run after Schema.sql)
-- Dates use NOW() / CURRENT_DATE so the data is current every time it is run
-- Amounts and points follow the business rules (10 baht = 1 point)
-- =====================================================================
USE pen_khon_dee;

-- Member levels: Bronze 0 pts, Silver 100 pts (5% off), Gold 300 pts (10% off)
INSERT INTO member_level (level_id, level_name, min_points, discount_percent, benefit) VALUES
(1, 'Bronze',   0,  0.00, 'Earn points to level up'),
(2, 'Silver', 100,  5.00, '5% off every bill'),
(3, 'Gold',   300, 10.00, '10% off every bill');

INSERT INTO customer (customer_id, name, phone, email) VALUES
(1, 'Somchai Jaidee', '0812345601', 'somchai@example.com'),
(2, 'Somying Raksuay', '0812345602', 'somying@example.com'),
(3, 'Wichai Mankong', '0812345603', NULL),
(4, 'Malee Sukjai', '0812345604', NULL),
(5, 'Prasert Thongdee', '0812345605', NULL),
(6, 'Kanokwan Saengthong', '0812345606', 'kanok@example.com'),
(7, 'Thanapol Srisuk', '0812345607', NULL),
(8, 'Arunee Promma', '0812345608', NULL);

-- 4 members (current_points = sum of their point_transaction rows)
INSERT INTO member (member_id, customer_id, level_id, current_points, join_date) VALUES
(1, 1, 1,  80, CURRENT_DATE - INTERVAL 30 DAY),
(2, 2, 3, 343, CURRENT_DATE - INTERVAL 60 DAY),
(3, 3, 1,  20, CURRENT_DATE - INTERVAL 20 DAY),
(4, 4, 1,   0, CURRENT_DATE);

INSERT INTO employee (employee_id, name, phone, username, email, password_hash, role, status) VALUES
(1, 'Somsak Thongchai', '0891111001', 'cashier1', 'cashier1@penkhondee.com', 'SET_IN_STEP_3', 'Cashier', 'Active'),
(2, 'Napa Wongsawat', '0891111002', 'cashier2', 'cashier2@penkhondee.com', 'SET_IN_STEP_3', 'Cashier', 'Active'),
(3, 'Phum Rattanakul', '0891111003', 'server1',  'server1@penkhondee.com',  'SET_IN_STEP_3', 'Server',  'Active'),
(4, 'Praew Siriwan', '0891111004', 'server2',  'server2@penkhondee.com',  'SET_IN_STEP_3', 'Server',  'Active'),
(5, 'Ton Kaewmanee', '0891111005', 'server3',  'server3@penkhondee.com',  'SET_IN_STEP_3', 'Server',  'Inactive'), 
(6, 'Kitchen Screen', NULL,       'kitchen1', 'kitchen1@penkhondee.com', 'SET_IN_STEP_3', 'Kitchen', 'Active');   

-- 10 tables: 2, 4, 7, 8 are occupied (matching the Open orders below)
-- qr_token is the permanent secret printed in each table's QR code (GET /api/tables shows them)
INSERT INTO dining_table (table_id, table_number, capacity, table_status, qr_token) VALUES
(1, 1, 2, 'Available', 'e467864fead0339e71eb0df23ca77df6'),
(2, 2, 2, 'Occupied', '42d6a759197aa48dec1dc4635d0644e9'),
(3, 3, 4, 'Available', '8c583a12c3c19f6030863863f42635e3'),
(4, 4, 4, 'Occupied', 'c078cad7559a3d020497aa0f60751c32'),
(5, 5, 4, 'Available', '98e5a5b96c13971d884a3154cbbbff87'),
(6, 6, 4, 'Available', '3cf699d08d3ba7586e7b10655dacf2f5'),
(7, 7, 6, 'Occupied', '8a8770462faa1e6d585ee44e09987dd5'),
(8, 8, 6, 'Occupied', 'bc614379d5a32c8fa4d97566320c63e0'),
(9, 9, 8, 'Available', '5583b6ed3f7395a074b1bf737fdef7b4'),
(10, 10, 8, 'Available', '09a0da64f1cb4942201e5fd8681ae110');

INSERT INTO category (category_id, category_name) VALUES
(1, 'Main Dishes'),
(2, 'Appetizers'),
(3, 'Beverages'),
(4, 'Desserts');

INSERT INTO menu (menu_id, category_id, menu_name, price, availability_status) VALUES
(1,  1, 'Shrimp Fried Rice',           89.00, 'Available'),
(2,  1, 'Basil Pork with Fried Egg',   69.00, 'Available'),
(3,  1, 'Pad Thai with Shrimp',        99.00, 'Available'),
(4,  1, 'Chicken Rice',                59.00, 'Sold_Out'),      -- sold out today
(5,  2, 'Fish Sauce Fried Chicken',    129.00, 'Available'),
(6,  2, 'Fried Spring Rolls',          79.00, 'Available'),
(7,  2, 'Glass Noodle Salad',          109.00, 'Available'),
(8,  2, 'Papaya Salad',                69.00, 'Available'),
(9,  3, 'Thai Iced Tea',               45.00, 'Available'),
(10, 3, 'Iced Coffee',                 50.00, 'Available'),
(11, 3, 'Drinking Water',              15.00, 'Available'),
(12, 3, 'Coconut Water',               55.00, 'Discontinued'),  -- no longer sold
(13, 4, 'Mango Sticky Rice',           99.00, 'Available'),
(14, 4, 'Bua Loy with Sweet Egg',      59.00, 'Available'),
(15, 4, 'Coconut Ice Cream',           49.00, 'Available'),
(16, 4, 'Tub Tim Grob',                55.00, 'Available');

-- Reservations: one of every status
INSERT INTO reservation (reservation_id, customer_id, employee_id, reservation_datetime, number_of_guests, reservation_status) VALUES
(1, 5, 1, CURRENT_DATE - INTERVAL 1 DAY + INTERVAL 18 HOUR,                       2, 'Seated'),
(2, 7, 2, CURRENT_DATE - INTERVAL 2 DAY + INTERVAL 19 HOUR,                       4, 'No-show'),
(3, 8, 1, CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 12 HOUR,                       3, 'Cancelled'),
(4, 1, 2, NOW() + INTERVAL 1 HOUR,                                             4, 'Confirmed'),  -- table 5 will show a warning
(5, 2, 1, CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 19 HOUR,                      10, 'Confirmed'),  -- booking across 2 tables
(6, 3, 2, CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 12 HOUR + INTERVAL 30 MINUTE,  2, 'Confirmed');

INSERT INTO reservation_table (reservation_id, table_id) VALUES
(1, 1), (2, 3), (3, 6), (4, 5), (5, 9), (5, 10), (6, 1);

-- Orders 1-8: paid (Closed/Paid)   Orders 9-11: guests still seated (Open/Unpaid)
INSERT INTO orders (order_id, customer_id, employee_id, order_datetime, order_status, payment_status, discount_amount, total_amount) VALUES
(1,  2,    1, NOW() - INTERVAL 10 DAY,  'Closed', 'Paid',   0.00, 1439.00),  -- Bronze 0%
(2,  2,    2, NOW() - INTERVAL 7 DAY,   'Closed', 'Paid',  61.80, 1174.20),  -- Silver 5%
(3,  1,    1, NOW() - INTERVAL 5 DAY,   'Closed', 'Paid',   0.00,  326.00),
(4,  NULL, 2, NOW() - INTERVAL 4 DAY,   'Closed', 'Paid',   0.00,  114.00),  -- walk-in
(5,  2,    1, NOW() - INTERVAL 3 DAY,   'Closed', 'Paid',  43.70,  830.30),  -- Silver 5%
(6,  3,    2, NOW() - INTERVAL 2 DAY,   'Closed', 'Paid',   0.00,  208.00),
(7,  1,    1, NOW() - INTERVAL 1 DAY,   'Closed', 'Paid',   0.00,  485.00),
(8,  5,    2, CURRENT_DATE - INTERVAL 1 DAY + INTERVAL 18 HOUR + INTERVAL 5 MINUTE,
                                        'Closed', 'Paid',   0.00,  168.00),  -- from reservation #1, not a member
(9,  NULL, 1, NOW() - INTERVAL 50 MINUTE,  'Open', 'Unpaid', 0.00,  233.00),  -- normal
(10, 4,    2, NOW() - INTERVAL 230 MINUTE, 'Open', 'Unpaid', 0.00,  238.00),  -- almost out of time (yellow)
(11, NULL, 1, NOW() - INTERVAL 250 MINUTE, 'Open', 'Unpaid', 0.00,  373.00);  -- over time (red)

INSERT INTO order_table (order_id, table_id) VALUES
(1, 5), (1, 6),            -- combined tables
(2, 3), (3, 1), (4, 2), (5, 4), (6, 1), (7, 2), (8, 1),
(9, 2), (10, 4),
(11, 7), (11, 8);          -- combined tables

-- subtotal = quantity * unit_price (checked by chk_item_subtotal)
INSERT INTO order_item (order_id, menu_id, quantity, unit_price, subtotal, item_status, note) VALUES
(1, 3, 4, 99.00, 396.00, 'Served', NULL), (1, 5, 2, 129.00, 258.00, 'Served', NULL), (1, 13, 3, 99.00, 297.00, 'Served', NULL),
(1, 9, 6, 45.00, 270.00, 'Served', NULL), (1, 7, 2, 109.00, 218.00, 'Served', NULL),
(2, 1, 4, 89.00, 356.00, 'Served', NULL), (2, 6, 3, 79.00, 237.00, 'Served', NULL), (2, 10, 4, 50.00, 200.00, 'Served', NULL),
(2, 14, 4, 59.00, 236.00, 'Served', NULL), (2, 8, 3, 69.00, 207.00, 'Served', 'No peanuts'),
(3, 2, 2, 69.00, 138.00, 'Served', 'Less spicy'), (3, 9, 2, 45.00, 90.00, 'Served', NULL), (3, 15, 2, 49.00, 98.00, 'Served', NULL),
(4, 3, 1, 99.00, 99.00, 'Served', NULL), (4, 11, 1, 15.00, 15.00, 'Served', NULL),
(5, 5, 2, 129.00, 258.00, 'Served', NULL), (5, 7, 2, 109.00, 218.00, 'Served', NULL), (5, 13, 2, 99.00, 198.00, 'Served', NULL),
(5, 16, 2, 55.00, 110.00, 'Served', NULL), (5, 9, 2, 45.00, 90.00, 'Served', NULL),
(6, 8, 1, 69.00, 69.00, 'Served', NULL), (6, 1, 1, 89.00, 89.00, 'Served', NULL), (6, 10, 1, 50.00, 50.00, 'Served', NULL),
(7, 3, 2, 99.00, 198.00, 'Served', NULL), (7, 6, 1, 79.00, 79.00, 'Served', NULL), (7, 9, 2, 45.00, 90.00, 'Served', NULL),
(7, 14, 2, 59.00, 118.00, 'Served', NULL),
(8, 2, 2, 69.00, 138.00, 'Served', NULL), (8, 11, 2, 15.00, 30.00, 'Served', NULL),
(9, 1, 1, 89.00, 89.00, 'Served',  NULL), (9, 9, 1, 45.00, 45.00, 'Served', NULL), (9, 13, 1, 99.00, 99.00, 'Ready', NULL),
(10, 2, 2, 69.00, 138.00, 'Served',  NULL), (10, 4, 1, 59.00, 59.00, 'Cancelled', 'Sold out after ordering'),
(10, 10, 2, 50.00, 100.00, 'Served', NULL),
(11, 5, 1, 129.00, 129.00, 'Served', NULL), (11, 7, 1, 109.00, 109.00, 'Pending', NULL), (11, 9, 3, 45.00, 135.00, 'Served', NULL);

-- points = floor(total_amount / 10), only for Paid orders of members
INSERT INTO point_transaction (member_id, order_id, points, type, transaction_date) VALUES
(2, 1, 143, 'Earn', NOW() - INTERVAL 10 DAY + INTERVAL 2 HOUR),  -- total 143 -> promoted to Silver
(2, 2, 117, 'Earn', NOW() - INTERVAL 7 DAY  + INTERVAL 2 HOUR),  -- total 260
(1, 3,  32, 'Earn', NOW() - INTERVAL 5 DAY  + INTERVAL 1 HOUR),
(2, 5,  83, 'Earn', NOW() - INTERVAL 3 DAY  + INTERVAL 2 HOUR),  -- total 343 -> promoted to Gold
(3, 6,  20, 'Earn', NOW() - INTERVAL 2 DAY  + INTERVAL 1 HOUR),
(1, 7,  48, 'Earn', NOW() - INTERVAL 1 DAY  + INTERVAL 1 HOUR);  -- total 80

-- =====================================================================
-- Checks to run afterwards (each query can be executed on its own)
-- =====================================================================

-- Report 1: upcoming Confirmed reservations and the tables they hold
SELECT r.reservation_id, c.name, r.reservation_datetime, r.number_of_guests, t.table_number
FROM reservation r
JOIN customer c          ON c.customer_id = r.customer_id
JOIN reservation_table rt ON rt.reservation_id = r.reservation_id
JOIN dining_table t      ON t.table_id = rt.table_id
WHERE r.reservation_status = 'Confirmed'
ORDER BY r.reservation_datetime, t.table_number;

-- Report 2: items on table 4's order
SELECT m.menu_name, oi.quantity, oi.unit_price, oi.subtotal, oi.item_status, oi.note
FROM dining_table t
JOIN order_table ot ON ot.table_id = t.table_id
JOIN orders o       ON o.order_id = ot.order_id AND o.order_status = 'Open'
JOIN order_item oi  ON oi.order_id = o.order_id
JOIN menu m         ON m.menu_id = oi.menu_id
WHERE t.table_number = 4;

-- Report 3: payment status of occupied tables
SELECT t.table_number, o.order_id, o.order_datetime, o.payment_status, o.total_amount
FROM dining_table t
JOIN order_table ot ON ot.table_id = t.table_id
JOIN orders o       ON o.order_id = ot.order_id
WHERE o.order_status = 'Open'
ORDER BY t.table_number;

-- Report 4: best-selling menu items (paid orders, cancelled items not counted)
SELECT m.menu_name, SUM(oi.quantity) AS units_sold, SUM(oi.subtotal) AS revenue
FROM order_item oi
JOIN menu m   ON m.menu_id = oi.menu_id
JOIN orders o ON o.order_id = oi.order_id
WHERE o.payment_status = 'Paid' AND oi.item_status <> 'Cancelled'
GROUP BY m.menu_id, m.menu_name
ORDER BY revenue DESC
LIMIT 5;

SELECT m.member_id, m.current_points, SUM(pt.points) AS sum_points
FROM member m
JOIN point_transaction pt ON pt.member_id = m.member_id
GROUP BY m.member_id, m.current_points
HAVING m.current_points <> SUM(pt.points);