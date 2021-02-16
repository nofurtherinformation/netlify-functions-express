import express from 'express'
import awsServerlessExpress from 'aws-serverless-express'
import cors from 'cors'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import compression from 'compression'
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware'
const sqlite3 = require('sqlite3').verbose();
import * as jsgeoda from 'jsgeoda';
import customLogger from './utils/logger'
import binaryMimeTypes from './utils/binaryMimeTypes'

const app = express()
const router = express.Router()

/* We need to set our base path for express to match on our function route */
const functionName = 'server'
const basePath = `/.netlify/functions/${functionName}/`

router.use(compression())

app.use(morgan(customLogger))

// get date range helper
function getDateRange(start, end) {
  const startString = `${start-100}`;
  const endString = `${end-100}`;
  const currDate = new Date(startString.slice(0,4), startString.slice(4,6), startString.slice(6,8));
  const endDate = new Date(endString.slice(0,4), endString.slice(4,6), endString.slice(6,8));
  var dateArray = [];
  while (currDate < endDate) {
    dateArray.push(currDate.toISOString().slice(0,10));
    currDate.setDate(currDate.getDate() + 1);
  }
  return dateArray.join('","')
}

// connect to db
const db = new sqlite3.Database('../usaFactsCovid.db', err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database");
});

const tableTree = {
  "confirmed": {
    "usafacts":{
      "county":"cases",
      "state":"usaFactsCasesCounty"
    }
  },
  "deaths": {
    "usafacts":{
      "county":"deaths",
      "state":"usaFactsCasesCounty"
    }
  }
}

// make sqlite function like postgres
db.query = function (sql, params) {
  var that = this;
  return new Promise(function (resolve, reject) {
      that.all(sql, params, function (error, rows) {
      if (error)
          reject(error);
      else
          resolve({ rows: rows });
      });
  });
};

router.get('/users', (req, res) => {
  res.json(tableTree)
})

router.get('/', (req, res) => {
  const html = `
    <html>
      <head></head>
      <body>
        <h1>
          ⊂◉‿◉つ I'm using Express in a lambda via '${functionName}'
        </h1>

        <a href='/.netlify/functions/${functionName}/users'>
          View users route
        </a>
      </body>
    </html>
  `
  // send back HTML
  res.send(html)
})

app.use(basePath, router)

// Apply express middlewares
router.use(cors())
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))
router.use(awsServerlessExpressMiddleware.eventContext())

// Initialize awsServerlessExpress
const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes)

// Export lambda handler
exports.handler = (event, context) => {
  return awsServerlessExpress.proxy(server, event, context)
}
