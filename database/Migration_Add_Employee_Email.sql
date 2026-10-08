-- Run this once on an existing pen_khon_dee database before using the shared login.
-- New databases created from Schema.sql already have the email column.
USE pen_khon_dee;

SET @has_employee_email = (
  SELECT COUNT(*)
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'employee'
     AND column_name = 'email'
);

SET @employee_email_ddl = IF(
  @has_employee_email = 0,
  'ALTER TABLE employee ADD COLUMN email VARCHAR(160) NULL UNIQUE',
  'SELECT 1'
);
PREPARE employee_email_stmt FROM @employee_email_ddl;
EXECUTE employee_email_stmt;
DEALLOCATE PREPARE employee_email_stmt;

UPDATE employee
   SET email = CONCAT(LOWER(username), '@penkhondee.com')
 WHERE email IS NULL OR email = '';
