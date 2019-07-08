const db = require('./db');
const fs = require('fs');
const formidable = require('formidable');


function handleDBCaching(resp, method, client) {
    db.query('SELECT * FROM notes', (postgresGETError, responseToCache) => {
        if (postgresGETError) {
            resp.send({message: 'Couldn\'t get any notes'});
            return;
        }

        client.set('/api/notes', JSON.stringify(responseToCache.rows));

        resp.send(method !== 'GET' ?
                        {method, status: 'success'} :
                        responseToCache.rows);
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
    });
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
                `INSERT INTO notes (title, message, image) VALUES (
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

function getByIDHandler(req, res, client) {
    const id = req.params.id;

    client.get(`/api/notes/${id}`, (err, note) => {
        if (err) {
            res.send(err);
            return;
        }
        if (note === null) {

            client.get('/api/notes', (errr, notes) => {
                if (notes === null) {

                    db.query(`select * from notes \
                    where notes_id = ${id};`, (getErr, getResponse) => {
                        if (getErr) {
                            return res.send(getErr);
                        }
                        if (getResponse === null) {
                            return res.send({error: 'No messages out here'});
                        }
                        note = getResponse.rows.pop();

                        client.set(`/api/notes/${id}`, JSON.stringify(note));

                        res.send(note);
                    });
                }
                else {
                    note = JSON.parse(notes).filter(item => item.notes_id === id).pop();
                    client.set(`/api/notes/${id}`, JSON.stringify(note));

                    res.send(note);
                }
            })
        }
        else {
            res.send(JSON.parse(note));
        }
    })
}

function handleUpdating(res, formData, note, client, files, id) {
    if (formData.image) {
        handleImage(files, formData);
    }

    const data = {
        title: formData.title !== undefined ? formData.title : note.title,
        message: formData.message !== undefined ? formData.message : note.message,
        image: formData.image !== undefined ? formData.image : note.image
    }

    db.query(`update notes \
    set title = '${data.title}', \
    message = '${data.message}', \
    image = '${data.image}' \
    where notes_id = ${id}`, (updateErr, updateResponse) => {
        if (updateErr) {
            res.send(updateErr);
            return;
        }

        return handleDBCaching(res, 'PATCH', client);
    })
}

function patchHandler(req, res, client) {
    const id = req.params.id;
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
        if (err) {
            res.send(err);
        }

        const formData = {
            title: fields.title,
            message: fields.message,
            image: files.image
        };

        client.get(`/api/notes/${id}`, (err, note) => {
            if (note === null) {

                client.get('/api/notes', (errr, notes) => {
                    if (notes === null) {

                        db.query(`select * from notes \
                        where notes_id = ${id}`, (getErr, getResponse) => {
                            if (getErr) {
                                res.send(getErr);
                            }
                            if (getResponse === null) {
                                res.send(getResponse);
                            }
                            let note = getResponse.rows.pop();
                            console.log(note)

                            handleUpdating(res, formData, note, client, files, id);
                        });
                    } else {
                        note = JSON.parse(notes).filter(item => item.notes_id === id).pop();
                        console.log(note)
                        handleUpdating(res, formData, note, client, files, id);
                    }
                })
            } else {
                console.log(note)
                handleUpdating(res, formData, note, client, files, id);
            }
        });
    });
}

module.exports = {
    handleGET: getHandler,
    handlePOST: postHandler,
    handleGETByID: getByIDHandler,
    handlePATCH: patchHandler
}