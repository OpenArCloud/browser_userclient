<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    #cesiumContainer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
    }
</style>


<script>
    import { onMount } from 'svelte';

    import { goto } from '@sveltech/routify';

    import { geopose, imageDataBase64, imageRotation } from "./geoposestore.js";

    import * as Cesium from 'cesium';

    // eslint-disable-next-line no-undef
    // Cesium.Ion.defaultAccessToken = oscp_client.env["CESIUM_KEY"];
    Cesium.Ion.defaultAccessToken = '';
    window.CESIUM_BASE_URL = '/';


    let viewer;
    let isPhotoTranslucent = false;

    let flags = {
        looking: false,
        moveForward: false,
        moveBackward: false,
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: false,
    };

    const planeSize = $imageRotation !== 'none' ? [2, 3.54] : [3.54, 2]


    onMount(() => {
        // Straight from Cesium sample code...
        document.addEventListener("keydown", (e) => {
                const flagName = getFlagForKeyCode(e.keyCode);
                if (typeof flagName !== "undefined") flags[flagName] = true;
            }, false
        );

        document.addEventListener("keyup", (e) => {
                const flagName = getFlagForKeyCode(e.keyCode);
                if (typeof flagName !== "undefined") flags[flagName] = false;
            }, false
        );

        const terrainProvider = Cesium.createWorldTerrain();

        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: terrainProvider,
            showRenderLoopErrors: true,
        });

        viewer.canvas.focus();

        if ($geopose.ecefPose !== undefined) {
            const positions = [Cesium.Cartographic.fromCartesian(
                new Cesium.Cartesian3($geopose.ecefPose.position.x, $geopose.ecefPose.position.y, $geopose.ecefPose.position.z))];

            Cesium.sampleTerrainMostDetailed(terrainProvider, positions)
                .then(updatedPositions => {
                    const photoElement = document.createElement('img');
                    photoElement.src = $imageDataBase64;

                    viewer.scene.primitives.add(Cesium.createOsmBuildings());

                    // Convert base of coordinates from GeoPose to what Cesium needs
                    const position = new Cesium.Cartesian3($geopose.ecefPose.position.x, $geopose.ecefPose.position.y, $geopose.ecefPose.position.z);
                    const orientation = new Cesium.Quaternion($geopose.ecefPose.orientation.x,
                        $geopose.ecefPose.orientation.y, $geopose.ecefPose.orientation.z, $geopose.ecefPose.orientation.w);

                    const local2fixed = Cesium.Transforms.northWestUpToFixedFrame(position);

                    // TODO: Adapt when more accurate height is sent from GeoPose service
                    const higher_position = Cesium.Matrix4.multiplyByPoint(local2fixed,
                        new Cesium.Cartesian3(0, 0, updatedPositions[0].height + 1.7), {});

                    const mat3 = Cesium.Matrix4.getMatrix3(local2fixed, {});

                    const fixed2local = Cesium.Quaternion.fromRotationMatrix(Cesium.Matrix3.inverse(mat3, {}));
                    const localOrientation = Cesium.Quaternion.multiply(fixed2local, orientation, {});
                    const headingPitchRoll = Cesium.HeadingPitchRoll.fromQuaternion(localOrientation);

                    // Move Cesium camera to position and orientation as reported from GeoPose services
                    viewer.camera.flyTo({
                        destination: higher_position,
                        orientation: {
                            heading: headingPitchRoll.heading,
                            pitch: headingPitchRoll.pitch,
                        },
                        complete: () => {
                            viewer.scene.camera.moveBackward(3);
                        }
                    });

                    const normal =  Cesium.Cartesian3.clone(new Cesium.Cartesian3(-1.0, 0.0, 0.0));

                    let planeOrientation = orientation;
                    if ($imageRotation !== 'none') {
                        const rotation = $imageRotation === 'left' ? -0.5 : $imageRotation === 'right' ? 0.5 : 1;
                        planeOrientation = Cesium.Quaternion.multiply(orientation,
                            Cesium.Quaternion.fromAxisAngle(new Cesium.Cartesian3(1, 0, 0), rotation * Math.PI), {});
                    }

                    // Position photo at the location it was shot
                    const planeEntity = viewer.entities.add({
                        position: higher_position,
                        orientation: planeOrientation,
                        plane: {
                            plane: new Cesium.Plane(normal, 0.0),
                            dimensions: new Cesium.Cartesian2(planeSize[0], planeSize[1]),
                            material: new Cesium.ImageMaterialProperty({
                                image: photoElement
                            }),
                            outline: true,
                            outlineColor: Cesium.Color.BLACK,
                        },
                    });

                    // Handler for translucency toggle for the photo
                    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
                    handler.setInputAction(movement => {
                        const pickedObject = viewer.scene.pick(movement.position);
                        if (Cesium.defined(pickedObject) && pickedObject.id === planeEntity) {
                            isPhotoTranslucent = !isPhotoTranslucent;
                            planeEntity.plane.material.color = isPhotoTranslucent ?
                                Cesium.Color.fromRgba(0x88ffffff) : Cesium.Color.fromRgba(0xffffffff);
                        }
                    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                    viewer.clock.onTick.addEventListener(() => {
                        const camera = viewer.camera;

                        // Change movement speed based on the distance of the camera to the surface of the ellipsoid.
                        const ellipsoid = viewer.scene.globe.ellipsoid;
                        const cameraHeight = ellipsoid.cartesianToCartographic(camera.position).height;
                        const moveRate = cameraHeight / 100.0;

                        if (flags.moveForward) camera.moveForward(moveRate);
                        if (flags.moveBackward) camera.moveBackward(moveRate);
                        if (flags.moveUp) camera.moveUp(moveRate);
                        if (flags.moveDown) camera.moveDown(moveRate);
                        if (flags.moveLeft) camera.moveLeft(moveRate);
                        if (flags.moveRight) camera.moveRight(moveRate);
                    });

                    // Add frustum
                    viewer.entities.add({
                       position: higher_position,
                       orientation: orientation,
                       model: {
                         uri: '/content/frustum.gltf',
                         scale: 0.01,
                         shadows: Cesium.ShadowMode.DISABLED
                       }
                     });
                })
                .otherwise((error) => console.log(error));
        } else {
            $goto('../localizephoto');
        }
    })

    function getFlagForKeyCode(keyCode) {
        switch (keyCode) {
            case 38: // up arrow key
                return "moveForward";
            case 40:  // down arrow key
                return "moveBackward";
            case 39: // right arrow key
                return "moveRight";
            case 37: // left arrow key
                return "moveLeft";
            default:
                return undefined;
        }
    }
</script>


<div id="cesiumContainer" tabindex="0"></div>


<svelte:head>
    <link rel="stylesheet" href="/Widgets/widgets.css" />
</svelte:head>
