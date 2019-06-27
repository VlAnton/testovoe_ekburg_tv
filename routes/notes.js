const db = require('../db')

app.get('/api/', (req, res, next) => {
  db.query('SELECT * FROM Todos;', [id], (err, res) => {
    if (err) {
      return next(err)
    }
    res.send(res.rows[0])
  })
})