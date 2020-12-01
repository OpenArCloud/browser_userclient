<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    #container {
        position: relative;
    }

    #cesium {
        position: absolute;
        top: 0;
        width: 100vw;
        height: 100vh;
    }

    #pose {
        /*display: none;*/
        background-color: rgba(234, 98, 55, 0.33);
    }

    #coord {
        /*display: none;*/
        background-color: rgba(234, 55, 98, 0.33);
    }

    #coords {
        /*display: none;*/
    }

    .hidden {
        display: none;
    }
</style>


<script>
    import { onMount } from 'svelte';

    import { Scene } from '../../../third-party/render/scenes/scene.js';
    import { createWebGLContext, Renderer } from '../../../third-party/render/core/renderer.js';
    import {    Gltf2Node } from '../../../third-party/render/nodes/gltf2.js';

    import * as Cesium from 'cesium';
    import "cesium/Build/Cesium/Widgets/widgets.css";

    // eslint-disable-next-line no-undef
    Cesium.Ion.defaultAccessToken = oscp_client.env["CESIUM_DEV_KEY"];
    window.CESIUM_BASE_URL = '/';


    let isArsessionRunning = false;
    let arAvailableMessage = '';
    const available = 'available';

    let gl = null;
    let arsession, arRefSpace, arViewerSpace, arHitTestSource = null;
    let arZeroPosition;

    let container, cesium;
    let doGeotagArZero = false;
    let viewer = null;

    let pose = null, coord = null;

    let renderer = null;
    let scene, reticle;

    let xValue = 'z', yValue = 'y', zValue = 'x';
    let xMinus = false, yMinus = false, zMinus = false;
    let xZero = false, yZero = false, zZero = false;

    let showLog = false;

    const initialGeoCode = {lat: 24.951102, lon: 60.167931, height: 7};


    onMount(() => {
        checkArAvailability();
    })

    function checkArAvailability() {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar')
                .then((isSupported) => {
                    arAvailableMessage = 'not available';
                    if (isSupported) {
                        arAvailableMessage = available;
                    }
                });
        }
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
                domOverlay: {root: container}
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
            initCesium();
            doGeotagArZero = true;
        }
    }

    function initCesium() {
        cesium.classList.remove('hidden');

        viewer = new Cesium.Viewer('cesium', {
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
            url: 'https://kartta.hel.fi/3d/datasource-data/e9cfc1bb-a015-4a73-b741-7535504c61bb/tileset.json'
        }));

        viewer.scene.screenSpaceCameraController.enableRotate = false;
        viewer.scene.screenSpaceCameraController.enableTranslate = false;
        viewer.scene.screenSpaceCameraController.enableZoom = false;
        viewer.scene.screenSpaceCameraController.enableTilt = false;
        viewer.scene.screenSpaceCameraController.enableLook = false;
    }

    function onRequestSessionError(error) {
        console.error(error.message);
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
                new Cesium.Cartesian3(evaluateCoord(pose, xValue, xMinus, xZero), evaluateCoord(pose, yValue, yMinus, yZero), evaluateCoord(pose, zValue, zMinus, zZero)),
                new Cesium.Cartesian3()
            );
        }

        if (viewer !== null && pose !== null) {
            const position = Cesium.Cartesian3.add(
                arZeroPosition,
                new Cesium.Cartesian3(evaluateCoord(pose, xValue, xMinus, xZero), evaluateCoord(pose, yValue, yMinus, yZero), evaluateCoord(pose, zValue, zMinus, zZero)),
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

            console.log(`X: ${xValue}:${xMinus}:${xZero} - Y: ${yValue}:${yMinus}:${yZero} - Z: ${zValue}:${zMinus}:${zZero}`);

            coord = viewer.scene.camera.position;

            viewer.render();
        }
    }

    function evaluateCoord(pose, coord, minus, zero) {
        const minusValue = minus === true ? -1 : 1;

        if (zero === true) {
            return 0;
        } else {
            switch (coord) {
                case 'x':
                    return pose.transform.position.x * minusValue;
                case 'y':
                    return pose.transform.position.y * minusValue;
                case 'z':
                    return pose.transform.position.z * minusValue;
            }
        }
    }

    function onSessionEnded() {
        cesium.classList.add('hidden');
        viewer = null;

        pose = null;
        coord = null;
        gl = null;

        arsession = null;
        isArsessionRunning = false;

        arHitTestSource.cancel();
        arHitTestSource = null;
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

    function round(position) {
            return Math.round(position * 100) / 100;
    }
</script>


<div>
    <p>Introduction of the demo TBD</p>
    <fieldset>
        <legend>AR Session</legend>
        <p>AR {arAvailableMessage}</p>

        <button on:click={startArSession} class:hidden={arAvailableMessage !== available}>start</button>
        <input type="checkbox" bind:checked={showLog} /><lavel>Show log</lavel>
    </fieldset>
</div>


<div id="container" bind:this={container}>
    {#if pose !== null}
        <div id="pose" class:hidden={!showLog}>
            <ul>
                <li>X: {round(pose.transform.position.x)}</li>
                <li>Y: {round(pose.transform.position.y)}</li>
                <li>Z: {round(pose.transform.position.z)}</li>
            </ul>
        </div>
    {/if}

    {#if coord !== null}
        <div id="coord" class:hidden={!showLog}>
            <ul id="mine">
                <li>X: {round(coord.x)}</li>
                <li>Y: {round(coord.y)}</li>
                <li>Z: {round(coord.z)}</li>
            </ul>
        </div>
    {/if}

    <div id="coords">
        <div>
            <input type="radio" bind:group="{xValue}" value="{'x'}" />
            <input type="radio" bind:group="{xValue}" value="{'y'}" />
            <input type="radio" bind:group="{xValue}" value="{'z'}" />
            <input type="checkbox" bind:checked="{xMinus}" />
            <input type="checkbox" bind:checked="{xZero}" />
        </div>
        <div>
            <input type="radio" bind:group="{yValue}" value="{'x'}" />
            <input type="radio" bind:group="{yValue}" value="{'y'}" />
            <input type="radio" bind:group="{yValue}" value="{'z'}" />
            <input type="checkbox" bind:checked="{yMinus}" />
            <input type="checkbox" bind:checked="{yZero}" />
        </div>
        <div>
            <input type="radio" bind:group="{zValue}" value="{'x'}" />
            <input type="radio" bind:group="{zValue}" value="{'y'}" />
            <input type="radio" bind:group="{zValue}" value="{'z'}" />
            <input type="checkbox" bind:checked="{zMinus}" />
            <input type="checkbox" bind:checked="{zZero}" />
        </div>
    </div>

    <div id="cesium" class="hidden" bind:this={cesium}></div>
</div>


<svelte:head>
    <script src="https://cdn.jsdelivr.net/gh/nicolaspanel/numjs@0.16.0/dist/numjs.min.js"></script>
</svelte:head>