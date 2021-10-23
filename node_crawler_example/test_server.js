const express = require('express');
const app = express();
const port = 2000;
const test = require('./one_page_test')

var bodyParser = require('body-parser')

// app.use(express.urlencoded());
app.use(express.json());

var cors = require('cors')

var allowlist = ['https://jaegeun.tistory.com']
var corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (allowlist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}

app.post('/analize' , cors(corsOptionsDelegate), (req, res) => {
    console.log(req.body);
    console.log("/analize post 요청");

    let recvUrl = req.body.url;

    console.log(recvUrl);
    console.log(req.body.option);
    test.AnalyzePage(req.body.url, req.body.option).then((data) => {
        res.send(data);
    }).catch(e => {
        console.log(e);
        res.send('url error');
    })
});


app.post('/search' , (req, res) => {
    console.log(req.body);
    console.log("/search post 요청");

    let recvUrl = req.body.url;
    let searchUrl;
    if (recvUrl[recvUrl.length - 1] === '/') {
        searchUrl = recvUrl + 'sitemap.xml';
    } else {
        searchUrl = recvUrl + '/' + 'sitemap.xml';
    }
    console.log(searchUrl);
    test.searchSiteMap(searchUrl).then(() => {
        res.send(test.url());
    }).catch(e => {
        console.log(e);
        res.send('url error');
    })
});

const path = require('path');

app.get('/' , (req, res) => {
    console.log('get / request')
    res.sendFile(path.join(__dirname, 'test.html'));
});


app.listen(port, () => {
    console.log(`server listen http://localhost:${port}`);
});