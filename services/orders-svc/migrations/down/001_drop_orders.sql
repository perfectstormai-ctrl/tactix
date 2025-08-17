DROP TABLE IF EXISTS order_comments;
DROP TABLE IF EXISTS order_collab_updates;
DROP TABLE IF EXISTS order_collab_docs;
DROP TABLE IF EXISTS order_sections;
DROP TABLE IF EXISTS order_versions;
DROP TRIGGER IF EXISTS orders_touch_updated ON orders;
DROP FUNCTION IF EXISTS trg_orders_touch_updated;
DROP TABLE IF EXISTS orders;
