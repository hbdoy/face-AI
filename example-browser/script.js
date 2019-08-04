const video = document.getElementById('video');
const apiUrl = "http://localhost:7057/api/Test/UploadPhoto";
let allFrames = [], tmpTime, delaySec = 6;

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('../weights'),
    faceapi.nets.faceLandmark68Net.loadFromUri('../weights'),
    faceapi.nets.faceRecognitionNet.loadFromUri('../weights'),
    faceapi.nets.faceExpressionNet.loadFromUri('../weights')
]).then(startVideo)

function startVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
    tmpTime = Date.now();

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        if (detections.length) {
            // console.log("Found Face");
            let frame = captureImage();
            allFrames.push({ file: frame, num: detections.length });
        }
        // identify every 6 sec
        if (((Date.now() - tmpTime) / 1000) >= delaySec) {
            if (allFrames.length > 0) {
                console.log("------ Start Identify ------");
                allFrames = allFrames.sort((a, b) => {
                    // sort by the num of faces
                    return a.num < b.num ? 1 : -1;
                });
                // use the photo of the largest number of faces
                startIdentify(allFrames[0].file);
            }
            allFrames = [];
            tmpTime = Date.now();
        }

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    }, 100)
})

function captureImage() {
    let canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // var img = document.createElement("img");
    // img.src = canvas.toDataURL();
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
};

function startIdentify(frame) {
    frame.toBlob((blob) => {
        console.log(blob);
        var fd = new FormData();
        let now = new Date().toISOString().replace(/:/g, "").replace(".", "");
        fd.append(`${now}.png`, blob, `${now}.png`);
        fetch(apiUrl,
            {
                method: 'POST',
                body: fd
            })
            .then((response) => response.json())
            .then((jsonData) => {
                console.log(jsonData);
            })
            .catch((err) => {
                console.log(err);
            });
    });
}