const mecab = require('mecab-ya');
const request = require('request');
const { parse } = require('node-html-parser');
const fs = require('fs');
const path = require('path');
const DomParser = require('dom-parser');
const parser = new DomParser();

const dataChage = require('./data_change');

// const seedUrl = 'https://www.naver.com';
// const seedUrl = 'https://blog.ncsoft.com/';
// const seedUrl = 'https://jaegeun.tistory.com/';
const seedUrl = 'http://146.56.138.212:3000';

let seedOriginHost;
let resultUrlsArray = [];
let skipUrlsArray = new Set();
let mecabResult = new Map();

const fileNameSaveUrl = 'urls_my_blog';
const fileNameSaveWord = 'word_result_my_blog';
const savePath = path.join(__dirname, "saveData");

crawling();

async function crawling() {
    //URL 수집하기
    console.time('crawl time');
    await crawlWebPage();
    console.timeEnd('crawl time');
    //수집한 URL 파일로 저장 - 선택사항
    saveData(resultUrlsArray, fileNameSaveUrl);

    //URL들 방문해서 단어 추출하기
    //resultUrlsArray = readData(fileNameSaveUrl);   //저장한 URL 데이터 가져오기
    console.time('mecab time');
    for (let i = 0; i < resultUrlsArray.length; i++) {
        await mecabUrlPage(resultUrlsArray[i]);
    }
    console.timeEnd('mecab time');
    //추출한 단어 파일로 저장 - 선택사항
    saveData(mecabResult, fileNameSaveWord);

    //정렬 하기
    //mecabResult = readData(fileNameSaveWord);    //저장한 단어 데이터 가져오기
    let sortable = [];
    for (let name in mecabResult) {
        sortable.push([name, mecabResult[name]]);
    }
    sortable.sort((a, b) => b[1] - a[1]);

    //데이터 csv로 변환
    dataChage.changeToCsv(savePath, fileNameSaveWord);
    //출력
    //console.log(sortable);
}

function saveData(data, fileName) {    
    if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath, {recursive:true});
    }
    const saveFileName = path.join(savePath, fileName);
    fs.writeFileSync(saveFileName, JSON.stringify(data));
}

function readData(fileName) {
    const readFileName = path.join(savePath, fileName);
    const readData = fs.readFileSync(readFileName);
    return JSON.parse(readData.toString());
}

async function mecabUrlPage(url) {
    const response = await getResponse(url);
    if (response.request.responseContent.statusCode != 200) return;

    const root = parse(response?.body);
    if (!root) return;

    let elements = root.querySelector('body')?.querySelectorAll('*');
    if (!elements) {
        elements = root.querySelector('html')?.querySelectorAll('*');
        if (!elements) elements = root.querySelectorAll('*');
    }
    // console.log(elements);
    for (let i = 0; i < elements?.length; i++) {
        if (elements[i].rawTagName != "script") {
            try {
               await asyncMecab(elements[i].innerText);
            } catch(e) {}
        }
    }
}

async function asyncMecab(text) {
    return new Promise((res, rej) => {
        mecab.pos(text, function (err, result) {
            result?.forEach(value => {
                if (value[1].indexOf('NN'/*명사*/) == 0
                    //|| value[1].indexOf('NP'/*대명사*/) == 0 || value[1].indexOf('NR'/*수사*/) == 0
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

async function crawlWebPage() {
    try {
        seedOriginHost = await getSeedOriginHost(seedUrl);
        await bfs();
        console.log('after bfs');
        console.log(resultUrlsArray);
    } catch (e) {
        console.log(e);
    }
}

async function getSeedOriginHost(seedUrl) {
    const response = await getResponse(seedUrl);
    console.log(response.request.originalHost);
    return response?.request.originalHost;
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
                if (err) {
                    reject(err);
                } else {
                    resolve(resp);
                }
            });
        });
    } catch (e) {
        return null;
    }
}

async function bfs() {
    let cur = 0;
    resultUrlsArray.push(seedUrl);
    while (cur < resultUrlsArray.length) {
        try {
            const tempUrls = await getUrlLinks(resultUrlsArray[cur++]);
            await getFilteredUrls(tempUrls);
        } catch (e) {}
    }
}

async function getUrlLinks(url) {
    try {
        const response = await getResponse(url);
        if (response.request.responseContent.statusCode != 200) return null;
        const dom = parser.parseFromString(response.body);
        const aList = dom.getElementsByTagName('a');
        let urlList = aList.map(el => {
            const url = el.getAttribute('href')
            if(url == null || url.indexOf('#') == 0 || url == 'javascript:;') {
                return null;
            } else if (url?.indexOf('http') == 0){
                return url;
            }
            const protocol = response.request.req.protocol;
            const hostUrl = response.request.originalHost;
            if (url.indexOf('/') == 0) {
                return protocol + "//" + hostUrl + url;
            } else {
                return protocol + "//" + hostUrl + "/" + url;
            }
        });
        return urlList.filter(url=>url!=undefined);
    } catch (e) {
        return null;
    }
}

async function getFilteredUrls(urls) {
    for (let i = 0; i < urls?.length; i++) {
        try {
            const newUrl = removeLastSlash(urls[i]);
            if (skipUrlsArray.has(newUrl)) {
                console.log("skip url");
                continue;
            }
            skipUrlsArray.add(newUrl);
            console.log("newUrl:", newUrl);
            if (resultUrlsArray.includes(newUrl) == false) {
                const response = await getResponse(urls[i]);
                if (seedOriginHost == response.request.originalHost) {
                    console.log("url push(urls[i]) : ", urls[i]);
                    resultUrlsArray.push(urls[i]);
                }
            }
        } catch (e) {
            return null;
        }
    }
}

function removeLastSlash(url) {
    if (url == '/') {
        return url.slice(0, -1);
    } else {
        return url;
    }
}







// testFunc();
async function testFunc() {
    console.log(seedUrl);
    await mecabUrlPage(seedUrl);
    console.log(mecabResult);
}

    // const options = {
    //     url: url,
    //     headers: { 'Content-Type': 'content=text/html; charset=utf-8'},
    //     method: 'GET',
    //     encoding: null,
    //     timeout: 10000,
    // };


    // 단어만 찾아주는 nouns 하지만 영어는 찾아주진 않는다.
    // mecab.nouns(root.querySelector('body').innerText, function (err, result) {
    // mecab.nouns("test 오재근입니다. 안녕하세요. 이건 꽃인가", function (err, result) {
    //     result.forEach(value=>{
    //         if (!mecabResult[value]) mecabResult[value] = 1;
    //         else mecabResult[value]++;
        
    //     });
    //         console.log(mecabResult["꽃"]);
    // });