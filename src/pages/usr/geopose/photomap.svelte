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

    import { geopose, imageDataBase64 } from "./geoposestore.js";

    import * as Cesium from 'cesium';
    import "cesium/Build/Cesium/Widgets/widgets.css";

    window.CESIUM_BASE_URL = '/';
    Cesium.Ion.defaultAccessToken = '';


    let viewer;


    onMount(() => {
        const terrainProvider = Cesium.createWorldTerrain();

        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: terrainProvider,
            showRenderLoopErrors: true,
        });

        if ($geopose.ecef !== undefined) {
            const positions = [Cesium.Cartographic.fromCartesian(new Cesium.Cartesian3($geopose.ecef.x, $geopose.ecef.y, $geopose.ecef.z))];
            Cesium.sampleTerrainMostDetailed(terrainProvider, positions)
                .then(updatedPositions => {
                    const photoElement = document.createElement('img');
                    photoElement.src = $imageDataBase64;

                    viewer.scene.primitives.add(Cesium.createOsmBuildings());

                    const position = new Cesium.Cartesian3($geopose.ecef.x, $geopose.ecef.y, $geopose.ecef.z);
                    const orientation = new Cesium.Quaternion($geopose.ecef.quaternion[0], $geopose.ecef.quaternion[1], $geopose.ecef.quaternion[2], $geopose.ecef.quaternion[3]);

                    const local2fixed = Cesium.Transforms.northWestUpToFixedFrame(position);
                    const higher_position = Cesium.Matrix4.multiplyByPoint(local2fixed, new Cesium.Cartesian3(0, 0, updatedPositions[0].height + $geopose.pose.altitude * 10), {});

                    let mat3 = Cesium.Matrix4.getMatrix3(local2fixed, {});

                    let fixed2local = Cesium.Quaternion.fromRotationMatrix(Cesium.Matrix3.inverse(mat3, {}));

                    let local_ori = Cesium.Quaternion.multiply(fixed2local, orientation, {});
                    const headingPitchRoll = Cesium.HeadingPitchRoll.fromQuaternion(local_ori);

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

                    viewer.entities.add({
                        position: higher_position,
                        orientation: orientation,
                        plane: {
                            plane: new Cesium.Plane(normal, 0.0),
                            dimensions: new Cesium.Cartesian2(3.54, 2),
                            material: new Cesium.ImageMaterialProperty({
                                image: photoElement
                            }),
                            outline: true,
                            outlineColor: Cesium.Color.BLACK,
                        },
                    });

                     viewer.entities.add({
                       position: higher_position,
                       orientation: orientation,
                       model: {
                         uri: '/content/frustum.glb',
                         scale: 1,
                         shadows: Cesium.ShadowMode.DISABLED
                       }
                     });
                });
        } else {
            $goto('../localizephoto');
        }
    })
</script>

<div id="cesiumContainer"></div>
