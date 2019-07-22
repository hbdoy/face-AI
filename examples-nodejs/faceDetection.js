const faceapi = require('face-api.js');
const cv = require('opencv4nodejs');

const { canvas, faceDetectionNet, faceDetectionOptions, saveFile } = require('./commons');

async function run() {
    await faceDetectionNet.loadFromDisk('../weights')

    // open capture from webcam
    const devicePort = 0
    const wCap = new cv.VideoCapture(devicePort)

    // loop through the capture
    const delay = 10
    let done = false

    while (!done) {
        // read frames from capture
        let frame = wCap.read()
        // loop back to start on end of stream reached
        if (frame.empty) {
            wCap.reset()
            frame = wCap.read()
        }
        // show image
        // cv.imshow('test', frame)

        var buffer = Buffer.from(cv.imencode('.jpg', frame).toString('base64'), 'base64')
        const img = await canvas.loadImage(buffer)
        const detections = await faceapi.detectAllFaces(img, faceDetectionOptions)
        // console.log(detections)
        if (detections.length) {
            console.log("Found");
            // const out = faceapi.createCanvasFromMedia(img)

            // faceapi.draw.drawDetections(out, detections)

            // saveFile('faceDetection.jpg', out.toBuffer('image/jpeg'))

            // console.log('done, saved results to out/faceDetection.jpg')
        }

        cv.waitKey(delay)
    }
}

run()

