DROP TABLE IF EXISTS notes;
CREATE TABLE notes
(
    notes_id BIGSERIAL NOT NULL,
    title CHARACTER VARYING NOT NULL,
    message CHARACTER VARYING DEFAULT 'empty message',
    image TEXT
);