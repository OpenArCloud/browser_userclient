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
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NjMwMzYwNi1lNTJiLTQwOWItODc0NS0wOGVhMWJjMjBhNWQiLCJpZCI6MjQyNjIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1ODQ5MTY5MjB9.5yH_PV4X2a_yfqoRqXGwAXcIBFN7G0Rg70lbh97Hi-Y';


    let viewer;


    onMount(() => {
        const terrainProvider = Cesium.createWorldTerrain();

        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: terrainProvider,
            showRenderLoopErrors: true,
        });

        if ($geopose.pose !== undefined) {
            const positions = [Cesium.Cartographic.fromDegrees($geopose.pose.longitude, $geopose.pose.latitude)];
            Cesium.sampleTerrainMostDetailed(terrainProvider, positions)
                .then(updatedPositions => {
                    const photoElement = document.createElement('img');
                    photoElement.src = $imageDataBase64;


                    console.log(updatedPositions);
                    console.log($geopose);

                    const acQuat = new Cesium.Quaternion($geopose.pose.quaternion[0], $geopose.pose.quaternion[1], $geopose.pose.quaternion[2], $geopose.pose.quaternion[3]);


                    viewer.scene.primitives.add(Cesium.createOsmBuildings());

                    const headingPitchRoll = Cesium.HeadingPitchRoll.fromQuaternion(acQuat);
                    const position = Cesium.Cartesian3.fromDegrees(
                        $geopose.pose.longitude, $geopose.pose.latitude, updatedPositions[0].height + 1.5 + Math.abs($geopose.pose.altitude) * 10);

                    viewer.camera.flyTo({
                        destination: position,
                        orientation: {
                            heading: headingPitchRoll.heading,
                            pitch: headingPitchRoll.pitch,
                        },
                        complete: () => {
                            viewer.scene.camera.moveBackward(3);
                        }
                    });

                    const normal =  Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Y);

                    viewer.entities.add({
                        position: position,
                        plane: {
                            plane: new Cesium.Plane(normal, 0.0),
                            dimensions: new Cesium.Cartesian2(1.77, 1),
                            material: new Cesium.ImageMaterialProperty({
                                image: photoElement
                            }),
                            outline: true,
                            outlineColor: Cesium.Color.BLACK,
                        },
                    });
                });
        } else {
            $goto('../localizephoto');
        }
    })
</script>

<div id="cesiumContainer"></div>
