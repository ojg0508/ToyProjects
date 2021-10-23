
const mecab = require('mecab-ya');
const request = require('request');
const { parse } = require('node-html-parser');
// const seedUrl = 'https://blog.ncsoft.com/';
// const seedUrl = 'http://146.56.138.212:3000';
const seedUrl = 'https://jaegeun.tistory.com/sitemap.xml'






// AnalyzePage(seedUrl);

async function AnalyzePage(url, option) {
    let mecabResult = new Map();
    await getHtmlAndMecab(url, option, mecabResult);

    let sortable = [];
    for (let name in mecabResult) {
        sortable.push([name, mecabResult[name]]);
    }
    sortable.sort((a, b) => b[1] - a[1]);
    console.log(sortable);
    return sortable;
}


module.exports = {
    searchSiteMap: searchSiteMap,
    AnalyzePage: AnalyzePage,
    url: getUrl,
};

// test();
let resUrl = [];
async function test() {
    console.log("???")
    await searchSiteMap(seedUrl);
    console.log(resUrl)
    AnalyzePage(resUrl[0]);
}

function getUrl() {
    return resUrl;
}

async function searchSiteMap(url) {
    const response = await getResponse(url);
    if (response.request.responseContent.statusCode != 200) return null;

    const root = parse(response?.body);
    if (!root) return;
    let elements = root.querySelectorAll('url');
    elements.forEach((value, idx)=>{
        const ind = parse(value.innerHTML);
        let loc = null;
        let lastmod = null
        let filterData = value.childNodes.filter(v=>{
            if (v.rawTagName != undefined) return true;
            else return false;
        });
        if (filterData.length == 2) {
            filterData.forEach(v=>{
                if (v.rawTagName === 'loc') {
                    resUrl.push(v.innerText);
                }
            })
        }
    })
    
};

async function getHtmlAndMecab(url, option, mecabResult) {
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
                await asyncMecab(elements[i].innerText, option, mecabResult);
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

async function asyncMecab(text, option, mecabResult) {
    return new Promise((res, rej) => {
        mecab.pos(text, function (err, result) {
            result?.forEach(value => {
                

                if ((option.ko == true) &&
                    (value[1].indexOf('NN'/*명사*/) == 0))   //한국어
                {
                    console.log(`option.ko:${option.ko}`)
                    if (!mecabResult[value[0]]) mecabResult[value[0]] = 1;
                    else mecabResult[value[0]]++;
                }

                if ((option.en == true) &&
                    (value[1] == "SL" || value[1] == "OL"))     //외국어
                {
                    if (!mecabResult[value[0]]) mecabResult[value[0]] = 1;
                    else mecabResult[value[0]]++;
                }

                if ((option.han == true) &&
                    (value[1] == "SH" || value[1] == "OH"))     //한자
                {
                    if (!mecabResult[value[0]]) mecabResult[value[0]] = 1;
                    else mecabResult[value[0]]++;
                }
                
                if ((option.num == true) &&
                    (value[1] == "SN" || value[1] == "ON"))     //숫자
                {
                    if (!mecabResult[value[0]]) mecabResult[value[0]] = 1;
                    else mecabResult[value[0]]++;
                }
            });
            res();
        });
    });
}