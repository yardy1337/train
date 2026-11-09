-- Общая библиотека продуктов «Мой тренер». Значения КБЖУ — на 100 г.
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,                 -- штрихкод (если есть)
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  qty TEXT NOT NULL DEFAULT '',     -- фасовка: «200 г», «1 л»
  category TEXT NOT NULL DEFAULT '',
  kcal REAL NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL,
  source TEXT NOT NULL,             -- builtin | off | user
  search TEXT NOT NULL,             -- нормализованные название и бренд для поиска
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS products_source ON products(source);

CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  search, content='products', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, search) VALUES (new.id, new.search);
END;
CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, search) VALUES ('delete', old.id, old.search);
END;
CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, search) VALUES ('delete', old.id, old.search);
  INSERT INTO products_fts(rowid, search) VALUES (new.id, new.search);
END;

-- Ограничение частоты добавления продуктов (без модерации, но от спама).
CREATE TABLE IF NOT EXISTS post_log (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS post_log_ip_ts ON post_log(ip, ts);
