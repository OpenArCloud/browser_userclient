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
        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: Cesium.createWorldTerrain()
        });

        const terrainProvider = Cesium.createWorldTerrain();

        if ($geopose.pose !== undefined) {
            const positions = [Cesium.Cartographic.fromDegrees($geopose.pose.longitude, $geopose.pose.latitude)];
            Cesium.sampleTerrainMostDetailed(terrainProvider, positions)
                .then(updatedPositions => {
                    const photoElement = document.createElement('img');
                    photoElement.src = $imageDataBase64;


                    console.log(updatedPositions);
                    console.log($geopose.pose);


                    const first = Cesium.Quaternion.fromAxisAngle(new Cesium.Cartesian3(0,1,0), -Math.PI/2);
                    const second = Cesium.Quaternion.fromAxisAngle(new Cesium.Cartesian3(1,0,0), -Math.PI/2);
                    const acQuat = new Cesium.Quaternion($geopose.pose.quaternion[0], $geopose.pose.quaternion[1], $geopose.pose.quaternion[2], $geopose.pose.quaternion[3]);
                    let newQuat = Cesium.Quaternion.multiply(acQuat, first, new Cesium.Quaternion());
                    newQuat = Cesium.Quaternion.multiply(newQuat, second, new Cesium.Quaternion());

                        // newOri = orientation * Quaternion.fromAxisAngle({0,1,0}, -pi/2) * Quaternion.fromAxisAngle({1,0,0}, -pi/2)




                    const headingpitchroll = Cesium.HeadingPitchRoll.fromQuaternion(newQuat)

                    viewer.scene.primitives.add(Cesium.createOsmBuildings());
                    viewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(
                            $geopose.pose.longitude, $geopose.pose.latitude, updatedPositions[0].height + 1.5 + Math.abs($geopose.pose.altitude) * 10),
                        orientation: {
                            heading: headingpitchroll.heading,
                            pitch: headingpitchroll.pitch,
                        },
                        complete: () => {
                            viewer.scene.camera.moveBackward(3);
                        }
                    });

                    const normal = Cesium.Quaternion.multiply(newQuat, new Cesium.Quaternion(0,1,0,0), new Cesium.Quaternion());

                    viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(
                            $geopose.pose.longitude, $geopose.pose.latitude, updatedPositions[0].height + 1.5 + Math.abs($geopose.pose.altitude) * 10),
                        plane: {
                            plane: new Cesium.Plane(
                                Cesium.Quaternion.computeAxis(normal, new Cesium.Cartesian3()), 0.0),
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
