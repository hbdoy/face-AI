import * as faceapi from 'face-api.js';
import * as cv from 'opencv4nodejs';

import { canvas, faceDetectionNet, faceDetectionOptions, saveFile } from './commons';


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
    // cv.imshow('test', frame);

    const img = await canvas.loadImage(frame)

    const detections = await faceapi.detectAllFaces(img, faceDetectionOptions)
    if (detections.length) {
      const out = faceapi.createCanvasFromMedia(img) as any

      faceapi.draw.drawDetections(out, detections)

      saveFile('faceDetection.jpg', out.toBuffer('image/jpeg'))

      console.log('done, saved results to out/faceDetection.jpg')
    }

    // const key = cv.waitKey(delay)
    done = true;
  }
  // const img = await canvas.loadImage('../images/bbt1.jpg')
}

run()