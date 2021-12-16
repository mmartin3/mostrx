const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')
const app = express()
const helmet = require('helmet')

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index', { drug: '' }))
  .get('/about', (req, res) => res.render('pages/landing/index'))
  .get('/rx/:drug', (req, res) => res.render('pages/index', { drug: req.params.drug }))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(helmet())

const routes = require('./routes/routes.js')(app, fs)

const server = app.listen(process.env.PORT || 3001, () => {
  console.log('listening on port %s...', server.address().port);
})

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
  });
