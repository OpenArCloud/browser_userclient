<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    video {
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: #000;
    }

    canvas {
        display: none;
    }

    #capturewrapper {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100vw;
        text-align: center;
        background-color: rgba(0, 0, 0, 0);
    }

    #capture {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        background-color: rgba(138, 136, 136, 0.5);
    }

    #arcontainer, #cesiumcontainer {
        position: absolute;
        top: 0;
        width: 100vw;
        height: 100vh;
    }

    #arcontainer {
        z-index: 10;
    }
</style>


<script>
    import { onMount } from 'svelte';

    import { Scene } from '../../../third-party/render/scenes/scene.js';
    import { createWebGLContext, Renderer } from '../../../third-party/render/core/renderer.js';
    import { Gltf2Node } from '../../../third-party/render/nodes/gltf2.js';

    import * as Cesium from 'cesium';
    import "cesium/Build/Cesium/Widgets/widgets.css";
    import * as h3 from "h3-js";
    import {getServicesAtLocation} from "ssd-access";
    import {v4 as uuidv4} from "uuid";


    let canAccessCamera = false;
    let cameraStatusMessage = '';

    let camera, captureWrapper, photoCanvas, arContainer;

    let showVideo = false;
    let showAr = false;

    let isArsessionRunning = false;
    let arAvailableMessage = '';
    const available = 'AR available';

    let gl = null;
    let arsession, arRefSpace, arViewerSpace, arHitTestSource = null;
    let arZeroPosition;

    let renderer = null;
    let scene, reticle;

    let viewer = null;
    let doGeotagArZero = false;
    let pose = null;


    const videoWidth = screen.height  * window.devicePixelRatio;
    const videoHeight = screen.width  * window.devicePixelRatio;

    const initialGeoCode = {lat: 8.550262, lon: 48.750253, height: 490};


    onMount(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            canAccessCamera = true;
        } else {
            canAccessCamera = false;
            cameraStatusMessage = "Can't access camera";
        }

        document.addEventListener("fullscreenchange", () => {
            showVideo = !!document.fullscreenElement;
        });

        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar')
                .then((isSupported) => {
                    arAvailableMessage = 'AR not available';
                    if (isSupported) {
                        arAvailableMessage = available;
                    }
                });
        }
    })

    function startVideo() {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                width: videoWidth,
                height: videoHeight,
                facingMode: {
                    exact: 'environment'
                }
            }
        })
            .then((stream) => {
                camera.srcObject = stream;
                document.documentElement.requestFullscreen();
            });
    }

    function capturePhoto() {
        photoCanvas.width = camera.videoWidth;
        photoCanvas.height = camera.videoHeight;
        photoCanvas.getContext("2d").drawImage(camera, 0, 0);

        camera.pause();

        const dataUrl = photoCanvas.toDataURL('image/jpg');
        getPhotoPose(dataUrl);

        // showAr = true;
        // startArSession();
    }

    function startArSession() {
        if (!arsession) {
            scene = new Scene();
            scene.enableStats(false);
            scene.clear = false;

            reticle = new Gltf2Node({url: '/content/reticle/reticle.gltf'});
            reticle.visible = false;
            scene.addNode(reticle);

            navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local', 'hit-test', 'dom-overlay'],
                domOverlay: {root: arContainer}
            })
                .then(onSessionStarted, onRequestSessionError);
        } else {
            arsession.end();
            // cesium.end()
        }
    }

    function onSessionStarted(session) {
        arsession = session;
        arsession.isImmersive = true;
        isArsessionRunning = true;

        session.addEventListener('end', onSessionEnded);
        session.addEventListener('select', onSelect);

        if (!gl) {
            gl = createWebGLContext({
                xrCompatible: true
            });

            renderer = new Renderer(gl);
            scene.setRenderer(renderer);
        }

        // eslint-disable-next-line no-undef
        session.updateRenderState({baseLayer: new XRWebGLLayer(session, gl)});

        session.requestReferenceSpace('viewer').then((refSpace) => {
            arViewerSpace = refSpace;
            session.requestHitTestSource({space: arViewerSpace}).then((hitTestSource) => {
                arHitTestSource = hitTestSource;
            });
        });

        session.requestReferenceSpace('local').then((refSpace) => {
            arRefSpace = refSpace;
            session.requestAnimationFrame(onXRFrame);
        });
    }

    function onSelect() {
        if (viewer === null) {
            // initCesium();
            // doGeotagArZero = true;
        }
    }

    function initCesium() {
        // eslint-disable-next-line no-undef
        Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NjMwMzYwNi1lNTJiLTQwOWItODc0NS0wOGVhMWJjMjBhNWQiLCJpZCI6MjQyNjIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1ODQ5MTY5MjB9.5yH_PV4X2a_yfqoRqXGwAXcIBFN7G0Rg70lbh97Hi-Y";
        window.CESIUM_BASE_URL = '/';

        console.log(Cesium.Ion.defaultAccessToken);

        viewer = new Cesium.Viewer('cesiumcontainer', {
            useDefaultRenderLoop: false,
            selectionIndicator: false,
            homeButton: false,
            sceneModePicker: false,
            infoBox: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            allowTextureFilterAnisotropic: false,
            contextOptions: {
                webgl: {
                    alpha: true,
                    antialias: true,
                    preserveDrawingBuffer: true,
                    failIfMajorPerformanceCaveat: false,
                    depth: true,
                    stencil: false
                },
            },
            targetFrameRate: 60,
            resolutionScale: 0.1,
            orderIndependentTranslucency: true,
            baseLayerPicker: false,
            geocoder: false,
            automaticallyTrackDataSourceClocks: false,
            dataSources: null,
            clock: null,
            terrainShadows: Cesium.ShadowMode.DISABLED,
            skyBox: false,
            skyAtmosphere: false,
            globe: false
        });

        viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;

        viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
                url: Cesium.IonResource.fromAssetId(185752)
            })
        );

        viewer.scene.screenSpaceCameraController.enableRotate = false;
        viewer.scene.screenSpaceCameraController.enableTranslate = false;
        viewer.scene.screenSpaceCameraController.enableZoom = false;
        viewer.scene.screenSpaceCameraController.enableTilt = false;
        viewer.scene.screenSpaceCameraController.enableLook = false;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    }

    function onRequestSessionError(error) {
        console.error(error.message);
    }

    function onSessionEnded() {
        showVideo = false;
        showAr = false;
        viewer = null;

        pose = null;
        gl = null;

        arsession = null;
        isArsessionRunning = false;

        arHitTestSource.cancel();
        arHitTestSource = null;
    }

    function onXRFrame(t, frame) {
        const session = frame.session;

        pose = frame.getViewerPose(arRefSpace);

        reticle.visible = false;
        if (arHitTestSource && pose) {
            let hitTestResults = frame.getHitTestResults(arHitTestSource);
            if (hitTestResults.length > 0) {
                let pose = hitTestResults[0].getPose(arRefSpace);
                reticle.visible = true;
                reticle.matrix = pose.transform.matrix;
            }
        }

        // WebXR
        scene.startFrame();
        session.requestAnimationFrame(onXRFrame);
        scene.drawXRFrame(frame, pose);
        scene.endFrame();


        // Cesium
        if (doGeotagArZero === true) {
            doGeotagArZero = false;

            arZeroPosition = Cesium.Cartesian3.subtract(
                Cesium.Cartesian3.fromDegrees(initialGeoCode.lat, initialGeoCode.lon, initialGeoCode.height),
                new Cesium.Cartesian3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z),
                new Cesium.Cartesian3()
            );
        }

        if (viewer !== null && pose !== null) {
            const position = Cesium.Cartesian3.add(
                arZeroPosition,
                new Cesium.Cartesian3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z),
                new Cesium.Cartesian3()
            );
            const headingPitchRoll = q2e(pose.transform.orientation);

            viewer.scene.camera.setView({
                destination: position,
                orientation: {
                    heading: -headingPitchRoll[0],
                    pitch: headingPitchRoll[2],
                    roll: -headingPitchRoll[1]
                }
            });

            viewer.render();
        }
    }

    function q2e(q1) {
        let heading, attitude, bank;

        const test = q1.x * q1.y + q1.z * q1.w;
        if (test > 0.499) { // singularity at north pole
            heading = 2 * Math.atan2(q1.x, q1.w);
            attitude = Math.PI / 2;
            bank = 0;
            return;
        }
        if (test < -0.499) { // singularity at south pole
            heading = -2 * Math.atan2(q1.x, q1.w);
            attitude = -Math.PI / 2;
            bank = 0;
            return;
        }

        const sqx = q1.x * q1.x;
        const sqy = q1.y * q1.y;
        const sqz = q1.z * q1.z;
        heading = Math.atan2(2 * q1.y * q1.w - 2 * q1.x * q1.z, 1 - 2 * sqy - 2 * sqz);
        attitude = Math.asin(2 * test);
        bank = Math.atan2(2 * q1.x * q1.w - 2 * q1.y * q1.z, 1 - 2 * sqx - 2 * sqz)

        return [heading, attitude, bank]
    }

    function getPhotoPose(photoUrl) {
        const [latAngle, lonAngle] = getCurrentLocation();
        const h3Index = h3.geoToH3(latAngle, lonAngle, 8);

        getCountryCode(latAngle, lonAngle)
            .then((countryCode) => getServicesAtLocation(countryCode, h3Index))
            .then(data => 'http://developer.augmented.city')      // data[0].services[0].url
            .then(serviceUrl => {
                if (!serviceUrl.includes('https://')) {
                    serviceUrl = serviceUrl.replace('http://', 'https://');
                }

                const requestBody = {
                    "id": uuidv4(),
                    "timestamp": Date.now().toLocaleString(),
                    "type": "geopose",
                    "sensors": [{
                        "id": "0",
                        "type": "camera"
                    }, {
                        "id": "1",
                        "type": "geolocation"
                    }],
                    "sensorReadings": [{
                        "timestamp": Date.now().toLocaleString(),
                        "sensorId": "0",
                        "reading": {
                            "sequenceNumber": 0,
                            "imageFormat": "JPG",
                            "imageOrientation": {
                                "mirrored": false,
                                "rotation": 0
                            },
                            "imageBytes": photoUrl.split(',')[1]
                        }
                    },
                        {
                            "timestamp": Date.now().toLocaleString(),
                            "sensorId": "1",
                            "reading": {
                                "latitude": latAngle,
                                "longitude": lonAngle,
                                "altitude": 0
                            }
                        }
                    ]
                };
                const localisationUrl = `${serviceUrl}/scrs/geopose`;
                fetch(localisationUrl, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }

                        return response.json();
                    })
                    .then(data => {
                        console.log(data);

                        startArSession();

                        initCesium();
                        doGeotagArZero = true;
                    })
                    .catch(error => {
                        console.error(error);
                        // geoposeLocationMessage = "No GeoPose found. Maybe the map isn't public";
                    });
            })
    }

    function getCurrentLocation() {
        // Heidelberg Castle
        let thisLoc = [49.410625, 8.715277];

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                thisLoc = [position.coords.latitude, position.coords.longitude];
            }, (error) => {
                console.log(`Location request failed: ${error}`)
                throw new Error(error);
            }, {
                enableHighAccuracy: false
            });
        }
        return thisLoc;
    }

    function getCountryCode(latAngle, lonAngle) {
        return fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latAngle}&lon=${lonAngle}&format=json&zoom=1&email=info%40michaelvogt.eu`)
            .then((response) => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error(response.text());
                }
            })
            .then((data) => {
                const countryCode = data.address.country_code;
                return countryCode === 'de' ? 'it' : countryCode;  // No server in Germany
            })
            .catch((error) => {
                throw new Error(error.statusText());
            });
    }
</script>


<div>
    <p>Introduction of the demo TBD</p>

    <button disabled={canAccessCamera === false || arAvailableMessage !== available ? 'disabled' : ''} on:click={startVideo} >Start</button>
    <span>{cameraStatusMessage}</span><span>{arAvailableMessage}</span>

    <video class:hidden={!showVideo} autoplay bind:this={camera}></video>
    <div id="capturewrapper" class:hidden={showVideo === false || showAr === true} bind:this={captureWrapper}>
        <button id="capture" on:click={capturePhoto}></button>
    </div>

    <div id="arcontainer" class:hidden={!showAr} bind:this={arContainer}>
        <div id="cesiumcontainer"></div>
    </div>

    <canvas bind:this={photoCanvas}></canvas>
</div>



<svelte:head>
    <script src="https://cdn.jsdelivr.net/gh/nicolaspanel/numjs@0.16.0/dist/numjs.min.js"></script>
</svelte:head>