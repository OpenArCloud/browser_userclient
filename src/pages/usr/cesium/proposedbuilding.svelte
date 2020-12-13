<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    video {
        position: fixed;
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
        position: fixed;
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
        outline: none;
        background-color: rgba(138, 136, 136, 0.5);
    }

    #arcontainer, #cesiumcontainer, #cover {
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
    }

    #arcontainer {
        z-index: 10;
    }

    #cover {
        background-color: #000;
    }
</style>


<script>
    import { onMount } from 'svelte';

    import { Scene } from '../../../third-party/render/scenes/scene.js';
    import { createWebGLContext, Renderer } from '../../../third-party/render/core/renderer.js';
    import { getServicesAtLocation } from "ssd-access";
    import { Gltf2Node } from '../../../third-party/render/nodes/gltf2.js';

    import * as Cesium from 'cesium';

    import * as h3 from "h3-js";
    import {v4 as uuidv4} from "uuid";


    let canAccessCamera = false;
    let cameraStatusMessage = '';

    let camera, captureWrapper, photoCanvas, arContainer;

    let showVideo = false;
    let showAr = false;

    let isArsessionRunning = false;
    let arAvailableMessage = 'AR features required';
    const available = 'AR available';

    let gl = null;
    let arsession, arRefSpace, arViewerSpace, arHitTestSource = null;
    let arZeroPosition = null;

    let renderer = null;
    let scene, reticle;

    let viewer = null;
    let doGeotagArZero = false;
    let pose = null;

    let skipLocalisation = false;
    let serverErrorMessage = '';

    let heightCorrection = 0;
    let initialGeoCode;


    const videoWidth = screen.height  * window.devicePixelRatio;
    const videoHeight = screen.width  * window.devicePixelRatio;


    onMount(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            canAccessCamera = true;
        } else {
            canAccessCamera = false;
            cameraStatusMessage = "Can't access camera";
        }

        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement === false) {
                showVideo = false;
                showAr = false;
            }
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
        if (skipLocalisation === true) {
            showVideo = false;

            // Bad Wildbad
            initialGeoCode = {lat: 48.750196, lon: 8.550324, height: 490};

            startArSession();
            initCesium();

            doGeotagArZero = true;
        } else {
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
                    showVideo = true;
                    document.documentElement.requestFullscreen();
                });
        }
    }

    function capturePhoto() {
        photoCanvas.width = camera.videoWidth;
        photoCanvas.height = camera.videoHeight;
        photoCanvas.getContext("2d").drawImage(camera, 0, 0);

        camera.pause();
        getPhotoPose(photoCanvas.toDataURL('image/jpeg').split(',')[1]);
    }

    function startArSession() {
        if (!arsession) {
            showAr = true;

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

    function initCesium() {
        // eslint-disable-next-line no-undef
        Cesium.Ion.defaultAccessToken = "";
        window.CESIUM_BASE_URL = '/';

        viewer = new Cesium.Viewer('cesiumcontainer', {

            useDefaultRenderLoop: false,
            showRenderLoopErrors: true,
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
            globe: false,
            // terrainProvider: Cesium.createWorldTerrain()
        });

        // viewer.scene.primitives.add(Cesium.createOsmBuildings());

        viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;

        viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
                url: Cesium.IonResource.fromAssetId(185752)
            })
        );

        viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
                url: Cesium.IonResource.fromAssetId(210363)
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
        if (doGeotagArZero === true && pose !== null) {
            doGeotagArZero = false;

            const positions = [Cesium.Cartographic.fromDegrees(initialGeoCode.lon, initialGeoCode.lat)];
            const terrainProvider = Cesium.createWorldTerrain();

            Cesium.sampleTerrainMostDetailed(terrainProvider, positions)
                .then((updatedPositions) => {


                    console.log(updatedPositions);


                    if (skipLocalisation === true) {
                        arZeroPosition = Cesium.Cartesian3.fromDegrees(initialGeoCode.lon, initialGeoCode.lat, updatedPositions[0].height + heightCorrection);
                    } else {
                        arZeroPosition = Cesium.Cartesian3.subtract(
                            Cesium.Cartesian3.fromDegrees(initialGeoCode.lon, initialGeoCode.lat, initialGeoCode.height + heightCorrection),
                            new Cesium.Cartesian3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z),
                            new Cesium.Cartesian3()
                        );
                    }
                });
        }

        if (viewer !== null && arZeroPosition != null && pose !== null) {
            const position = Cesium.Cartesian3.add(
                arZeroPosition,
                new Cesium.Cartesian3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z),
                new Cesium.Cartesian3()
            );
            const headingPitchRoll = q2e(pose.transform.orientation);

/*
            console.log(Cesium.Cartographic.fromCartesian(position).latitude * 180 / Math.PI,
                Cesium.Cartographic.fromCartesian(position).longitude * 180 / Math.PI, headingPitchRoll);
*/

            // TODO: Request correct camera height from Cesium
            viewer.scene.camera.setView({
                destination: position,
                orientation: {
                    heading: -headingPitchRoll[0] + Math.PI / 2,
                    pitch: headingPitchRoll[2],
                    roll: -headingPitchRoll[1]
                }
            });

            viewer.resize();
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
        let h3Index;
        let latAngle;
        let lonAngle;

        getCurrentLocation()
            .then(position => {
                latAngle = position[0];
                lonAngle = position[1];

                h3Index = h3.geoToH3(latAngle, lonAngle, 8);
                return getCountryCode(latAngle, lonAngle);
            })
            .then((countryCode) => getServicesAtLocation(countryCode, h3Index))
            .then(data => 'http://developer.augmented.city')      // data[0].services[0].url
            .then(serviceUrl => {
                if (!serviceUrl.includes('https://')) {
                    serviceUrl = serviceUrl.replace('http://', 'https://');
                }

                const requestBody = {
                    "id": uuidv4(),
                    "timestamp": Date.now().toString(),
                    "type": "geopose",
                    "sensors": [{
                        "id": "0",
                        "type": "camera"
                    }, {
                        "id": "1",
                        "type": "geolocation"
                    }],
                    "sensorReadings": [{
                        "timestamp": Date.now().toString(),
                        "sensorId": "0",
                        "reading": {
                            "sequenceNumber": 0,
                            "imageFormat": "JPG",
                            "imageOrientation": {
                                "mirrored": false,
                                "rotation": 0
                            },
                            "imageBytes": photoUrl
                        }
                    },
                        {
                            "timestamp": Date.now().toString(),
                            "sensorId": "1",
                            "reading": {
                                "latitude": latAngle,
                                "longitude": lonAngle,
                                "altitude": 0
                            }
                        }
                    ]
                };
                const localisationUrl = `${serviceUrl}/scrs/geopose_objs`;
                fetch(localisationUrl, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Localisation failed');
                        }

                        return response.json();
                    })
                    .then(data => {
                        console.log(data);

                        showVideo = false;

                        initialGeoCode = {lat: 48.750196, lon: 8.550324, height: 490};

                        startArSession();
                        initCesium();

                        doGeotagArZero = true;
                    })
                    .catch(error => {
                        console.error(error);
                        serverErrorMessage = error.toLocaleString();
                        showVideo = false;
                    });
            })
    }

    function getCurrentLocation() {
        // Heidelberg Castle
        let thisLoc = [49.410625, 8.715277];

        return new Promise((resolve, reject) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition((position) => {
                    resolve([position.coords.latitude, position.coords.longitude]);
                }, (error) => {
                    console.log(`Location request failed: ${error}`)
                    reject(error);
                }, {
                    enableHighAccuracy: true,
                    maximumAge: 0
                });
            } else {
                resolve(thisLoc);
            }
        });
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
    <div id="cover" class:hidden={!showVideo && !showAr}></div>

    <video class:hidden={!showVideo} autoplay bind:this={camera}></video>

    <div id="capturewrapper" class:hidden={showVideo === false || showAr === true} bind:this={captureWrapper}>
        <button id="capture" on:click={capturePhoto}></button>
    </div>

    <div id="arcontainer" class:hidden={!showAr} bind:this={arContainer}>
        <div id="cesiumcontainer"></div>
    </div>

    <div class="contentwrapper">
        <h2>Proposed building in AR</h2>
        <p>
            Inspired by the proposed building tutorial from the Cesium website, this experiment recreates it in AR
            space.
            Replacing the virtual terrain and buildings with the real world environment, the effect of the proposed
            building to the surrounding can be seen very clearly.
        </p>
        <dl class="processlist">
            <dt>The process to determine the current location and orientation of the device is like this:</dt>
            <dd>Take a photo with the device camera</dd>
            <dd>Request the available services from the regional Spatial Services Discovery</dd>
            <dd>Choose a GeoPose service and request the GeoPose from the photo</dd>
            <dd>Forward the poses received from WebXR to Cesium</dd>
        </dl>
        <p>
            As the current location is determined by a photo from the current location, and available services are
            requested from the Spatial Services Discovery, this experiment can be used everywhere a GeoPose service is
            available.
        </p>

        <button disabled={canAccessCamera === false || arAvailableMessage !== available ? 'disabled' : ''}
                on:click={startVideo}>Start
        </button>
        <!--    <input type="checkbox" bind:checked={skipLocalisation} />-->

        <div class="statusmessage">{cameraStatusMessage}</div>
        <div class="statusmessage">{arAvailableMessage}</div>
        <div class="statusmessage">{serverErrorMessage}</div>
        <!--    <div><input bind:value={heightCorrection} /></div>-->
    </div>

    <canvas bind:this={photoCanvas}></canvas>
</div>



<svelte:head>
    <script src="https://cdn.jsdelivr.net/gh/nicolaspanel/numjs@0.16.0/dist/numjs.min.js"></script>
    <link rel="stylesheet" href="/Widgets/widgets.css" />
</svelte:head>