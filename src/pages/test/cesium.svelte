<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    #container {
        position: relative;
    }

    #overlay {
        position: absolute;
        bottom: 10px;
        margin: 10px;
        width: 85vw;
        background-color: white;
        border-radius: 10px;
        padding: 0 20px 20px;
    }

    #cesium {
        position: absolute;
        top: 0;
        width: 100vw;
        height: 100vh;
    }

    #pose {
        background-color: rgba(234, 98, 55, 0.33);
    }

    progress {
        width: 100%;
    }

    .hidden {
        display: none;
    }
</style>


<script>
    import { onMount } from 'svelte';

    import * as Cesium from 'cesium';
    import "cesium/Build/Cesium/Widgets/widgets.css";

    window.CESIUM_BASE_URL = '/';
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NjMwMzYwNi1lNTJiLTQwOWItODc0NS0wOGVhMWJjMjBhNWQiLCJpZCI6MjQyNjIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1ODQ5MTY5MjB9.5yH_PV4X2a_yfqoRqXGwAXcIBFN7G0Rg70lbh97Hi-Y';


    let isArsessionRunning = false;
    let arAvailableMessage = '';

    let progressOverlay;
    let progressInfo;
    let progressBar;

    let gl = null;
    let arsession = null;
    let arRefSpace = null;

    let container, cesium, posedebug;
    let viewer;

    let lastPose = null;
    let poseX, poseY, poseZ, heading;


    onMount(() => {
        checkArAvailability();
    })

    function checkArAvailability() {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar')
                .then((isSupported) => {
                    arAvailableMessage = 'not available';
                    if (isSupported) {
                        arAvailableMessage = 'available';
                    }
                });
        }
    }

    function startArSession() {
        if (!arsession) {
            navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: {root: container}
            })
                .then(onSessionStarted, onRequestSessionError);
        } else {
            arsession.end();
        }
    }

    function onSessionStarted(session) {
        arsession = session;
        arsession.isImmersive = true;
        isArsessionRunning = true;

        cesium.classList.remove('hidden');

        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NjMwMzYwNi1lNTJiLTQwOWItODc0NS0wOGVhMWJjMjBhNWQiLCJpZCI6MjQyNjIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1ODQ5MTY5MjB9.5yH_PV4X2a_yfqoRqXGwAXcIBFN7G0Rg70lbh97Hi-Y';

        viewer = new Cesium.Viewer('cesium', {
            useDefaultRenderLoop: false,
            selectionIndicator : false,
            homeButton:false,
            sceneModePicker:false,
            infoBox : false,
            navigationHelpButton:false,
            navigationInstructionsInitiallyVisible:false,
            animation : false,
            timeline : false,
            fullscreenButton : false,
            allowTextureFilterAnisotropic:false,
            contextOptions:{
                webgl: {
                    alpha: true,
                    antialias: true,
                    preserveDrawingBuffer : true,
                    failIfMajorPerformanceCaveat: false,
                    depth:true,
                    stencil:false
                },
            },
            targetFrameRate:60,
            resolutionScale:0.1,
            orderIndependentTranslucency : true,
            baseLayerPicker : false,
            geocoder : false,
            automaticallyTrackDataSourceClocks: false,
            dataSources: null,
            clock: null,
            terrainShadows: Cesium.ShadowMode.DISABLED,
            skyBox: false,
            skyAtmosphere: false,
            globe:false
        });

        viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;

        // Add Cesium OSM Buildings, a global 3D buildings layer.
        viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
            url : 'https://kartta.hel.fi/3d/datasource-data/e9cfc1bb-a015-4a73-b741-7535504c61bb/tileset.json'
        }));

/*
        // Remove when pose gets applied to Cesium viewer
        viewer.scene.screenSpaceCameraController.enableRotate = false;
        viewer.scene.screenSpaceCameraController.enableTranslate = false;
        viewer.scene.screenSpaceCameraController.enableZoom = false;
        viewer.scene.screenSpaceCameraController.enableTilt = false;
        viewer.scene.screenSpaceCameraController.enableLook = false;
*/

        viewer.camera.flyTo({
            // TODO: Always keep camera 2m above ground
            destination : Cesium.Cartesian3.fromDegrees(24.953270, 60.167598, 10),
            orientation : {
                heading : Cesium.Math.toRadians(0.0),
                pitch : Cesium.Math.toRadians(0.0),
            }
        });

        session.addEventListener('end', onSessionEnded);
        const canvas = document.createElement('canvas');
        gl = canvas.getContext('webgl', {
            xrCompatible: true
        });

        // eslint-disable-next-line no-undef
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
        session.requestReferenceSpace('local').then((refSpace) => {
            arRefSpace = refSpace;
            session.requestAnimationFrame(onXRFrame);
        });
    }

    function onRequestSessionError(error) {
        console.error(error.message);
    }

    function onSessionEnded() {
        cesium.classList.add('hidden');
        posedebug.classList.add('hidden');

        lastPose = null;

        arsession = null;
        isArsessionRunning = false;

        gl = null;
    }

    function onXRFrame(t, frame) {
        const session = frame.session;
        session.requestAnimationFrame(onXRFrame);

        lastPose = frame.getViewerPose(arRefSpace);
        if (lastPose !== null) {
            poseX = Math.round(lastPose.transform.position.x * 100) / 100;
            poseY = Math.round(lastPose.transform.position.y * 100) / 100;
            poseZ = Math.round(lastPose.transform.position.z * 100) / 100;
            [heading, ,] = q2e(lastPose.transform.orientation);
        }

        viewer.render();
    }

    function q2e(q1) {
        let heading, attitude, bank;

        const test = q1.x*q1.y + q1.z*q1.w;
        if (test > 0.499) { // singularity at north pole
            heading = 2 * Math.atan2(q1.x,q1.w);
            attitude = Math.PI/2;
            bank = 0;
            return;
        }
        if (test < -0.499) { // singularity at south pole
            heading = -2 * Math.atan2(q1.x,q1.w);
            attitude = - Math.PI/2;
            bank = 0;
            return;
        }
        const sqx = q1.x*q1.x;
        const sqy = q1.y*q1.y;
        const sqz = q1.z*q1.z;
        heading = Math.atan2(2*q1.y*q1.w-2*q1.x*q1.z , 1 - 2*sqy - 2*sqz);
        attitude = Math.asin(2*test);
        bank = Math.atan2(2*q1.x*q1.w-2*q1.y*q1.z , 1 - 2*sqx - 2*sqz)

        return [heading, attitude, bank]
    }


    function handleProgress(visible, infoText = '') {
        progressInfo.innerText = infoText;

        if (visible === true) {
            progressOverlay.classList.remove('hidden');
        } else {
            progressOverlay.classList.add('hidden');
        }
    }
</script>


    <fieldset>
        <legend>AR Session</legend>
        <p>AR {arAvailableMessage}</p>

        <button on:click={startArSession}>start</button>
    </fieldset>


<div id="container" bind:this={container}>
    <aside id="overlay" class="hidden" bind:this={progressOverlay}>
        <p bind:this={progressInfo}></p>
        <progress bind:this={progressBar}></progress>
    </aside>

    {#if lastPose !== null}
        <div id="pose" bind:this={posedebug}>
            <ul id="mine">
                <li>X: {poseX}</li>
                <li>Y: {poseY}</li>
                <li>Z: {poseZ}</li>
            </ul>
            <p>Heading: {Math.round(heading * 100) / 100}</p>
        </div>
    {/if}

    <div id="cesium" class="hidden" bind:this={cesium}></div>
</div>



<svelte:head>
    <script src="https://cdn.jsdelivr.net/gh/nicolaspanel/numjs@0.16.0/dist/numjs.min.js"></script>
</svelte:head>