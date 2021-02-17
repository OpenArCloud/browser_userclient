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

    const planeSize = $imageRotation !== 'none' ? [2, 3.54] : [3.54, 2]


    onMount(() => {
        const terrainProvider = Cesium.createWorldTerrain();

        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: terrainProvider,
            showRenderLoopErrors: true,
        });

        if ($geopose.ecef !== undefined) {
            const positions = [Cesium.Cartographic.fromCartesian(
                new Cesium.Cartesian3($geopose.ecef.x, $geopose.ecef.y, $geopose.ecef.z))];

            Cesium.sampleTerrainMostDetailed(terrainProvider, positions)
                .then(updatedPositions => {
                    const photoElement = document.createElement('img');
                    photoElement.src = $imageDataBase64;

                    viewer.scene.primitives.add(Cesium.createOsmBuildings());

                    // Convert base of coordinates from GeoPose to what Cesium needs
                    const position = new Cesium.Cartesian3($geopose.ecef.x, $geopose.ecef.y, $geopose.ecef.z);
                    const orientation = new Cesium.Quaternion($geopose.ecef.quaternion[0],
                        $geopose.ecef.quaternion[1], $geopose.ecef.quaternion[2], $geopose.ecef.quaternion[3]);

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

                    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
                    handler.setInputAction(movement => {
                        const pickedObject = viewer.scene.pick(movement.position);
                        if (Cesium.defined(pickedObject) && pickedObject.id === planeEntity) {
                            isPhotoTranslucent = !isPhotoTranslucent;
                            planeEntity.plane.material.color = isPhotoTranslucent ?
                                Cesium.Color.fromRgba(0x88ffffff) : Cesium.Color.fromRgba(0xffffffff);
                        }
                    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

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
</script>


<div id="cesiumContainer"></div>


<svelte:head>
    <link rel="stylesheet" href="/Widgets/widgets.css" />
</svelte:head>
