const cv = require('opencv4nodejs');

// open capture from webcam
const devicePort = 0;
const wCap = new cv.VideoCapture(devicePort);

// loop through the capture
const delay = 10;
let done = false;
while (!done) {
    // read frames from capture
    let frame = wCap.read();

    // loop back to start on end of stream reached
    if (frame.empty) {
        wCap.reset();
        frame = wCap.read();
    }

    // show image
    cv.imshow('test', frame);

    const key = cv.waitKey(delay);
    done = key !== 255;
}