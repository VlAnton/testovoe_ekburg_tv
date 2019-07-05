const db = require('./db');
const fs = require('fs');
const formidable = require('formidable');


function handleDBCaching(resp, method, client) {
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

function getHandler(resp, client) {
    client.get('/api/notes', (err, notes) => {
        if (err) {     
            return handleDBCaching(resp, 'GET', client);
        }

        switch (notes) {
            case null:
                return handleDBCaching(resp, 'GET', client);

            default:
                resp.send(JSON.parse(notes));
        }
    });
}

function postHandler(req, resp, client) {
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
                handleImage(files, formData, client);
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
        
                    return handleDBCaching(resp, 'POST', client);
            });
        }
        else {
            resp.send({ error: 'Incorrect input' });
        }
    })
}

module.exports = {
    handleGET: getHandler,
    handlePOST: postHandler
}