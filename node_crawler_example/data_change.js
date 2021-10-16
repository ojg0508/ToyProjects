const fs = require('fs');
const path = require('path');

//changeToCsv();
module.exports.changeToCsv = changeToCsv;

function changeToCsv(filePath, fileName) {
    const fileFullPath = path.join(filePath, fileName);
    const readData = fs.readFileSync(fileFullPath);
    const data = JSON.parse(readData.toString());

    //정렬 하기 위해 object 형식을 array로 변환
    let sortable = [];
    for (let name in data) {
        sortable.push([name, data[name]]);
    }

    //횟수가 많은 순으로 정렬
    sortable.sort((a, b) => b[1] - a[1]);

    //순위가 300위 이상은 제거
    sortable = sortable.filter((value, index) => {
        return index > 300 ? false : true;
    });

    //csv 포맷으로 저장
    let writeStream = fs.createWriteStream(fileFullPath + '.csv');
    writeStream.on('open', () => {
        const header = "text,frequency\n";
        writeStream.write(header);
        sortable.forEach(value=>{
            const str = value[0] + "," + value[1] + '\n';
            writeStream.write(str);
        });
        writeStream.end();
    });
}

function readData(fileName) {
    const readFileName = path.join(__dirname, fileName);
    const readData = fs.readFileSync(readFileName);
    return JSON.parse(readData.toString());
}