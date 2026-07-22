-- Zakladni navrh tabulek pro "Miluj svuj hydrant"
-- Rozpracuj podle potreby az budes resit databazi.

-- users: id, username, email, password_hash, created_at
-- hydrants: id, user_id, title, photo_path, city, lat, lng, created_at
-- likes: id, user_id, hydrant_id, created_at
-- comments: id, user_id, hydrant_id, text, created_at
