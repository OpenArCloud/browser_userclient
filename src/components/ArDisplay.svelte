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

    progress {
        width: 100%;
    }

    .hidden {
        display: none;
    }
</style>

<script>
    import { onMount } from 'svelte';

    import * as THREE from 'three';
    import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

    import { getLocalisationData } from "../core/geoposeServices/immersial.js";

    export let immediate = false;
    export let displayUi = 'none';
    export let isArAvailable = false;
    export let startButtonLabel = 'Start AR Session';

    export let locationData;


    let arAvailableMessage = '';

    let camera, scene, renderer;
    let controller;

    let reticle;

    let doHitTest = true;
    let hitTestSource = null;
    let hitTestSourceRequested = false;

    let container;
    let progressOverlay;
    let progressInfo;
    let progressBar;

    let filterRefs = (filter, refs) => refs.filter(ref => ref.contentType.includes(filter));


    onMount(() => {
        checkArAvailability();

        if (immediate ) {
            startArSession();
            setup3dScene();
            animate();
        }
    })

    async function checkArAvailability() {
        if (navigator.xr) {
            isArAvailable = await navigator.xr.isSessionSupported('immersive-ar')
            arAvailableMessage = isArAvailable ? 'available' : 'not available';
            return isArAvailable;
        }
    }

    function startArSession() {
        navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: {root: container}
        })
            .then((session) => {
                renderer.xr.setReferenceSpaceType('local');
                renderer.xr.setSession(session);
            })
            .catch(error => {
                console.log(error);
            });
    }

    function setup3dScene() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 30);
        camera.position.z = 2;

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);

        renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        container.appendChild( renderer.domElement );

        controller = renderer.xr.getController(0);
        controller.addEventListener('select', handleSelect);
        scene.add(controller);

        reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );

        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);

        window.addEventListener( 'resize', onWindowResize, false );
    }

    function handleSelect() {
        if (reticle.visible) {
            reticle.visible = false;
            doHitTest = false;

            camera.position.x = reticle.position.x;
            camera.position.y = reticle.position.y;

            handleProgress(true, 'Get Location Data ...');

            getLocalisationData()
                .then(localisationData => {
                    handleProgress(true, 'Get Reference Map ...');
                    return loadMap(localisationData);
                })
                .then((localisationData) => {
                    handleProgress(true, 'Get Content ...');
                    return loadContent(localisationData);
                })
                .then(() => handleProgress(false));
        }
    }

    function loadContent(localisationData) {
        const [, , refPose] = localisationData;

        return new Promise((resolve, reject) => {
            new GLTFLoader().load(filterRefs('gltf', locationData.refs)[0].url, (gltf) => {
                const [distance, ] = calcCoordOffset(locationData.geopose.latitude, locationData.geopose.longitude, refPose[0], refPose[1]);

                const gltfScene = gltf.scene;

                gltfScene.position.setFromMatrixPosition(reticle.matrix);
                gltfScene.translateOnAxis(new THREE.Vector3(
                    Math.cos(distance), Math.sin(distance),
                    -(locationData.geopose.ellipsoidHeight - refPose[2]) / distance).normalize(), distance);

                gltfScene.castShadow = true;
                gltfScene.receiveShadow = true;

                scene.add( gltfScene);

                resolve(localisationData);
            }, (progress) => {
                if (progress.lengthComputable) {
                    progressBar.setAttribute('max', progress.total);
                    progressBar.setAttribute('value', progress.loaded);
                } else {
                    // To get intermediate display
                    progressBar.removeAttribute('max');
                    progressBar.removeAttribute('value');
                }
            }, (error) => {
                console.log(error);
                reject(error);
            });
        });
    }

    function loadMap(localisationData) {
        const [mapUrl, mapPose, refPose] = localisationData;

        return new Promise((resolve, reject) => {
            new PLYLoader().load(mapUrl, (geometry) => {
                // Sparse point cloud
                // const material = new THREE.PointsMaterial({ color: 0xDDFF19, vertexColors: THREE.VertexColors, size: 1, sizeAttenuation: false })
                // const mesh = new THREE.Points(geometry, material)

                // Dense point cloud (mesh)
                const material = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: THREE.FaceColors, flatShading: true });
                const mesh = new THREE.Mesh(geometry, material);

                const [distance, ] = calcCoordOffset(mapPose[0], mapPose[1], refPose[0], refPose[1]);

                mesh.position.setFromMatrixPosition(reticle.matrix);
                mesh.translateOnAxis(new THREE.Vector3( Math.cos(distance), -(mapPose[2] - refPose[2]) / distance, Math.sin(distance)).normalize(), distance);

                mesh.castShadow = true;
                mesh.receiveShadow = true;

                scene.add( mesh );

                resolve(localisationData);
            }, (progress) => {
                if (progress.lengthComputable) {
                    progressBar.setAttribute('max', progress.total);
                    progressBar.setAttribute('value', progress.loaded);
                } else {
                    // To get intermediate display
                    progressBar.removeAttribute('max');
                    progressBar.removeAttribute('value');
                }
            }, (error) => {
                console.log(error);
                reject(error);
            });
        });
    }

    function animate() {
        renderer.setAnimationLoop(render);
    }

    function render(timestamp, frame) {
        if (frame) {
            const referenceSpace = renderer.xr.getReferenceSpace();
            const session = renderer.xr.getSession();

            if (hitTestSourceRequested === false) {
                session.requestReferenceSpace( 'viewer' )
                    .then((referenceSpace) => session.requestHitTestSource( {space: referenceSpace}))
                    .then((source) => hitTestSource = source);

                session.addEventListener('end', () => {
                    hitTestSourceRequested = false;
                    hitTestSource = null;
                });

                hitTestSourceRequested = true;
            }

            if (doHitTest && hitTestSource) {
                const hitTestResults = frame.getHitTestResults(hitTestSource);

                if ( hitTestResults.length ) {
                    const hit = hitTestResults[0];

                    reticle.visible = true;
                    reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                } else {
                    reticle.visible = false;
                }
            }
        }

        renderer.render(scene, camera);
    }

    function handleProgress(visible, infoText = '') {
        progressInfo.innerText = infoText;

        if (visible === true) {
            progressOverlay.classList.remove('hidden');
        } else {
            progressOverlay.classList.add('hidden');
        }
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function handleStartClick() {
        startArSession();
        setup3dScene();
        animate();
    }

    function calcCoordOffset(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
        const φ2 = lat2 * Math.PI / 180;
        const λ1 = lon1 * Math.PI / 180;
        const λ2 = lon2 * Math.PI / 180;

        const Δφ = (lat2-lat1) * Math.PI / 180;
        const Δλ = (lon2-lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // in metres

        const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
        const θ = Math.atan2(y, x);

        return [distance, θ];
    }
</script>


{#if displayUi === 'full'}
    <fieldset>
        <legend>AR Session</legend>
        <p>AR {arAvailableMessage}</p>

        {#if isArAvailable}
            <button on:click={handleStartClick}>{startButtonLabel}</button>
        {/if}
    </fieldset>
{:else if displayUi === 'button' && isArAvailable}
    <button on:click={handleStartClick}>{startButtonLabel}</button>
{/if}


<div id="container" bind:this={container}>
    <aside id="overlay" class="hidden" bind:this={progressOverlay}>
        <p bind:this={progressInfo}></p>
        <progress bind:this={progressBar}></progress>
    </aside>
</div>



<svelte:head>
    <script src="https://cdn.jsdelivr.net/gh/nicolaspanel/numjs@0.16.0/dist/numjs.min.js"></script>
</svelte:head>