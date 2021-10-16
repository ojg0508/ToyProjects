
const mecab = require('mecab-ya');
const request = require('request');
const { parse } = require('node-html-parser');
// const seedUrl = 'https://blog.ncsoft.com/';
const seedUrl = 'http://146.56.138.212:3000';

let mecabResult = new Map();

onePageTest();

async function onePageTest() {
    await getHtmlAndMecab(seedUrl);

    let sortable = [];
    for (let name in mecabResult) {
        sortable.push([name, mecabResult[name]]);
    }
    sortable.sort((a, b) => b[1] - a[1]);
    console.log(sortable);
}

async function getHtmlAndMecab(url) {
    const response = await getResponse(url);
    if (response.request.responseContent.statusCode != 200) return null;

    const root = parse(response?.body);
    if (!root) return;
    let elements = root.querySelector('body')?.querySelectorAll('*');
    if (!elements) {
        elements = root.querySelector('html')?.querySelectorAll('*');
        if (!elements) elements = root.querySelectorAll('*');
    }
    for (let i = 0; i < elements?.length; i++) {
        if (elements[i].rawTagName != "script") {
            try {
                await asyncMecab(elements[i].innerText);
            } catch (e) { }
        }
    }
}

async function getResponse(url) {
    const options = {
        url: url,
        method: 'GET',
        timeout: 10000,
    };
    try {
        return new Promise((resolve, reject) => {
            request.get(options, function (err, resp) {
                if (err) reject(err);
                else resolve(resp);
            });
        });
    } catch (e) { return null; }
}

async function asyncMecab(text) {
    return new Promise((res, rej) => {
        mecab.pos(text, function (err, result) {
            result?.forEach(value => {
                if (value[1].indexOf('NN'/*명사*/) == 0
                    || value[1] == "SL" || value[1] == "OL"     //외국어
                    || value[1] == "SH" || value[1] == "OH"     //한자
                    || value[1] == "SN" || value[1] == "ON")    //숫자
                {
                    if (!mecabResult[value[0]]) mecabResult[value[0]] = 1;
                    else mecabResult[value[0]]++;
                }
            });
            res();
        });
    });
}