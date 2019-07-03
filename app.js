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

const db = require('./db');


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'ssshhhhh',
    store: new redisStore({ host: 'localhost', port: 8000, client: client, ttl :  260}),
    saveUninitialized: false,
    resave: false
}));


function cachingDBHandler(resp, method) {
    db.query('SELECT * FROM "Notes"', (postgresGETError, responseToCache) => {
        if (postgresGETError) {
            resp.send({message: 'Couldn\'t get any notes'});
            return;
        }

        client.set('/api/notes', JSON.stringify(responseToCache.rows));

        resp.send(method == 'POST' ? responseToCache.rows.pop() : responseToCache.rows);
    });
}

function handleImage(files, formData) {
    const imageDestinationPath = '/var/www/static';
    const image = files.image;
    const imageOriginPath = image.path;
    const imageContent = fs.readFileSync(imageOriginPath);

    if (!fs.existsSync(imageDestinationPath)) {
        fs.mkdirSync(imageDestinationPath);
    }

    formData.image = imageDestinationPath + `/${image.name}`;

    fs.writeFile(formData.image, imageContent, (err) => {
        console.log(err);
    })
}


function insertData(formData, resp) {
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

            return cachingDBHandler(resp, 'POST');
    })
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
                handleImage(files, formData);
            }

            return insertData(formData, resp);
        }
        else {
            resp.send({ error: 'Incorrect input' });
        }
    })

});

app.get('/api/notes', (req, resp, next) => {
    client.get('/api/notes', (err, notes) => {
        if (err) {     
            return cachingDBHandler(resp, 'GET');
        }

        switch (notes) {
            case null:
                return cachingDBHandler(resp, 'GET');

            default:
                resp.send(JSON.parse(notes));
        }
    })
})

app.listen(8080);
