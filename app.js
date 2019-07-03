const express = require('express');
const session = require('express-session');
const app = express();

const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client  = redis.createClient();

const logger = require('morgan');
const bodyParser = require('body-parser');
const formidable = require('formidable');

const fs = require('fs');
const path = require('path');


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
        var formData = { title: null, message: null, image: null };

        if (err) {
            throw err;
        }

        if (fields.title) {
            formData.title = fields.title;
            formData.message = fields.message;

            if (files.image) {
                const image = files.image;
                const imageOriginPath = image.path;
                const imageContent = fs.readFileSync(imageOriginPath);
                const relativePath = `./static`;

                var imageDestinationPath = path.resolve(path.normalize(relativePath));

                switch (fs.existsSync(imageDestinationPath)) {
                    case true:
                        imageDestinationPath += `/${image.name}`;
                        break;
                    case false:
                        fs.mkdirSync(imageDestinationPath);
                        imageDestinationPath += `/${image.name}`;
                }

                fs.writeFileSync(imageDestinationPath, imageContent, (err) => {
                    console.log(err);
                })

                formData.image = relativePath + `/${image.name}`;
            }

            db.query(
                `INSERT INTO "Notes"(title, message, image) VALUES (
                    '${formData.title}',
                    '${formData.message}',
                    '${formData.image}'
                );`, (postgresPOSTError, insertionResponse) => {

                    if (postgresPOSTError) {
                        resp.send(postgresPOSTError);
                        return;
                    }

                    return cacheDB(resp, 'POST');
            })
        }
        else {
            resp.send({ error: 'Incorrect input' })
        }
    })

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
