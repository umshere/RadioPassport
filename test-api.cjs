const https = require('https');

const mirrors = [
  "https://de1.api.radio-browser.info/json/stations/topclicks?limit=40&hidebroken=true",
  "https://nl1.api.radio-browser.info/json/stations/topclicks?limit=40&hidebroken=true",
  "https://at1.api.radio-browser.info/json/stations/topclicks?limit=40&hidebroken=true"
];

function checkMirror(url) {
    return new Promise((resolve) => {
        console.log(`Checking ${url}...`);
        https.get(url, { headers: { 'User-Agent': 'TestScript/1.0' } }, (res) => {
            console.log(`${url} Status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        console.log(`${url} returned ${json.length} stations.`);
                        resolve(true);
                    } catch (e) {
                         console.error(`${url} Failed to parse JSON`);
                         resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        }).on('error', (e) => {
            console.error(`${url} Error: ${e.message}`);
            resolve(false);
        });
    });
}

async function run() {
    for (const mirror of mirrors) {
        await checkMirror(mirror);
    }
}

run();
