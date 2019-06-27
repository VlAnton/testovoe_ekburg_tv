const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client  = redis.createClient();

const app = express();
// const router = express.Router();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'ssshhhhh',
    store: new redisStore({ host: 'localhost', port: 8000, client: client, ttl :  260}),
    saveUninitialized: false,
    resave: false
}));

const db = require('./db')

// app.use('/',router);

function cacheDB(resp, method) {
    db.query('SELECT * FROM "Notes"', (postgresGETError, responseToCache) => {
        if (postgresGETError) {
            resp.send({message: 'Couldn\'t get any notes'});
            return;
        }

        client.set('/api/notes', JSON.stringify(responseToCache.rows));

        resp.send(method == 'POST' ? responseToCache.rows.pop() : responseToCache.rows);
    });
}

app.post('/api/notes', (req, resp, next) => {
    console.log(req.body);
    db.query(
        `INSERT INTO "Notes"(title, message)
        VALUES ('${req.body.title}', '${req.body.message}');`,

        (postgresPOSTError, insertionResponse) => {
            if (postgresPOSTError) {
                resp.send(insertionResponse);
                return;
            }

            return cacheDB(resp, 'POST')
        }
    )
});

app.get('/api/notes', (req, resp, next) => {
    client.get('/api/notes', (err, notes) => {
        if (err) {
            return cacheDB(resp, 'GET');
        }
        switch (notes) {
            case null:
                return cacheDB(resp, 'GET');

            default:
                resp.send(JSON.parse(notes));
        }
    })
})

app.listen(8080);
