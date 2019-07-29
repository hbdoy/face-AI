const faceapi = require('face-api.js');
const cv = require('opencv4nodejs');
const request = require('request');
const { canvas, faceDetectionNet, faceDetectionOptions, saveFile } = require('./commons');
const { apiKey } = require('../env');

// open capture from webcam
const devicePort = 0;
const wCap = new cv.VideoCapture(devicePort);

// loop through the capture
const delay = 10;
let allFrames = [];
let tmpTime = Date.now();

var init = (async () => {
    await faceDetectionNet.loadFromDisk('../weights');
    run();
})();

async function run() {
    try {
        let frame = getCameraFrame();

        // transport mat(frame) to buffer
        let buffer = Buffer.from(cv.imencode('.jpg', frame).toString('base64'), 'base64');
        let img = await canvas.loadImage(buffer);
        let detections = await faceapi.detectAllFaces(img, faceDetectionOptions);

        if (detections.length) {
            // console.log("Found Face");
            allFrames.push({ file: buffer, num: detections.length });
        }
        // identify every 6 sec
        if (((Date.now() - tmpTime) / 1000) >= 6) {
            if (allFrames.length > 0) {
                console.log("------ Start Identify ------");
                allFrames = allFrames.sort((a, b) => {
                    // sort by the num of faces
                    return a.num < b.num ? 1 : -1;
                });
                // use the photo of the largest number of faces
                startIdentify(allFrames[0].file, img)
                    .then((res) => {
                        console.log(res);
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
            allFrames = [];
            tmpTime = Date.now();
        }

        // cv.waitKey(delay);
        setTimeout(run, delay);
    }
    catch (e) {
        console.log(e);
    }
}

function _detectFaces(imgBuffer) {
    var options = {
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/octet-stream'
        },
        url: 'https://gssfacedetection.cognitiveservices.azure.com/face/v1.0/detect?returnFaceAttributes=age,gender&recognitionModel=recognition_02',
        body: imgBuffer,
        method: 'POST'
    };
    return new Promise((resolve, reject) => {
        request(options, (err, res, body) => {
            if (err) {
                reject(new Error(err));
            } else {
                resolve(JSON.parse(body));
            }
        })
    })
}

function _identifyPersons(faceIds) {
    let data = {
        "personGroupId": "gss",
        "faceIds": faceIds,
        "maxNumOfCandidatesReturned": 1,
        "confidenceThreshold": 0.5
    };
    let options = {
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/json'
        },
        url: 'https://gssfacedetection.cognitiveservices.azure.com/face/v1.0/identify',
        body: JSON.stringify(data),
        method: 'POST'
    };
    return new Promise((resolve, reject) => {
        request(options, (err, res, body) => {
            if (err) {
                reject(new Error(err));
            } else {
                resolve(JSON.parse(body));
            }
        })
    })
}

function getCameraFrame() {
    // read frames from capture
    let frame = wCap.read()
    // loop back to start on end of stream reached
    if (frame.empty) {
        wCap.reset()
        frame = wCap.read()
    }
    // show image
    // cv.imshow('test', frame)
    return frame;
}

function startIdentify(imgBuffer) {
    let now = new Date().toISOString().replace(/:/g, "").replace(".", "");
    return new Promise(async (resolve, reject) => {
        try {
            let detectResult = await _detectFaces(imgBuffer);
            let allFaceIds = detectResult.map((item) => {
                if (item) {
                    return item.faceId;
                }
            });
            if (allFaceIds[0] && allFaceIds.length > 0) {
                let result = await _identifyPersons(allFaceIds);
                let allPeople = result.map((item) => {
                    if (item && item.candidates.length > 0) {
                        return item.candidates[0];
                    }
                });
                if (allPeople[0]) {
                    console.log(allPeople);
                    // draw picture
                    let img = await canvas.loadImage(imgBuffer);
                    let detections = await faceapi.detectAllFaces(img, faceDetectionOptions);
                    let out = faceapi.createCanvasFromMedia(img);
                    faceapi.draw.drawDetections(out, detections);
                    saveFile(`${now}.jpg`, out.toBuffer('image/jpeg'));
                    resolve(`done, saved results to out/${now}.jpg`);
                } else {
                    reject("Found face, but can't identify any person");
                }
            } else {
                reject("Not found any faceId");
            }
        }
        catch (e) {
            reject(e.toString());
        }
    });
}