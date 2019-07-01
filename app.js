const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const redis = require('redis');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

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

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
        if (err) {
            throw err;
        }
        console.log(files.image)
        return;

        if (fields.title && fields.message || files.image) {
            // const imageBytesArr = files.image ?
            //     [].slice.call(fs.readFileSync(files.image.path)) :
            //     null;
            db.query(
                `INSERT INTO "Notes"(title, message) VALUES (
                    '${fields.title}',
                    '${fields.message}'
                );`,
                (postgresPOSTError, insertionResponse) => {
                    if (postgresPOSTError) {
                        // throw postgresPOSTError;
                        return resp.send(postgresPOSTError);
                    }
        
                    return cacheDB(resp, 'POST')
                }
            )
        }
    })
    // console.log(fields);
    // return
    // db.query(
    //     `INSERT INTO "Notes"(title, message)
    //     VALUES ('${req.body.title}', '${req.body.message}');`,

    //     (postgresPOSTError, insertionResponse) => {
    //         if (postgresPOSTError) {
    //             resp.send(insertionResponse);
    //             return;
    //         }

    //         return cacheDB(resp, 'POST')
    //     }
    // )
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
