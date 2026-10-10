USE pen_khon_dee;

ALTER TABLE orders
  MODIFY employee_id INT UNSIGNED NULL,
  ADD COLUMN customer_order_token_hash CHAR(64) NULL UNIQUE
    COMMENT 'SHA-256 hash of the customer access token';
