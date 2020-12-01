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
    import {onMount} from 'svelte';

    import {geopose, imageDataBase64} from "./geoposestore.js";

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
            Cesium.sampleTerrain(terrainProvider, 11, positions)
                .then(updatedPositions => {
                    const photoElement = document.createElement('img');
                    photoElement.src = $imageDataBase64;

                    const headingpitchroll = Cesium.HeadingPitchRoll.fromQuaternion(new Cesium.Quaternion(
                        $geopose.pose.quaternion[0], $geopose.pose.quaternion[1], $geopose.pose.quaternion[2], $geopose.pose.quaternion[3]))

                    viewer.scene.primitives.add(Cesium.createOsmBuildings());
                    viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(
                            $geopose.pose.longitude, $geopose.pose.latitude, updatedPositions[0].height + $geopose.pose.altitude * 10),
                        orientation: {
                            heading: headingpitchroll.heading,
                            pitch: headingpitchroll.pitch,
                            roll: headingpitchroll.roll
                        },
                        complete: () => {
                            viewer.scene.camera.moveBackward(3);
                        }
                    });

                    viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(
                            $geopose.pose.longitude, $geopose.pose.latitude, updatedPositions[0].height + $geopose.pose.altitude * 10),
                        plane: {
                            plane: new Cesium.Plane(Cesium.Cartesian3.normalize(
                                new Cesium.Cartesian3($geopose.pose.quaternion[0], $geopose.pose.quaternion[1] + Math.PI, $geopose.pose.quaternion[2]),
                                new Cesium.Cartesian3()), 0.0),
                            dimensions: new Cesium.Cartesian2(1.77, 1),
                            material: new Cesium.ImageMaterialProperty({
                                image: photoElement
                            }),
                            outline: true,
                            outlineColor: Cesium.Color.BLACK,
                        },
                    });
                })
        } else {
            alert("Can open this page only from another page providing a GeoPose")
        }
    })

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
</script>

<div id="cesiumContainer"></div>
