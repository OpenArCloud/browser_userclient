<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    #preview {
        width: 90vw;
    }

    .title {
        font-weight: bold;
    }

    .hidden {
        display: none;
    }
</style>


<script>
    import Import from '../../../components/Import.svelte';

    import { goto } from '@sveltech/routify';

    import { geopose, imageDataBase64 } from "./geoposestore.js";

    import { getServicesAtLocation } from 'ssd-access';
    import * as h3 from "h3-js";

    import { v4 as uuidv4 } from 'uuid';


    let preview;
    let isPhotoLoaded = false;
    let filename;
    let latAngle, lonAngle;
    let photoLocationMessage = '';

    let isGeoposeLoaded = false;
    let geoposeLocationMessage = '';

    let countries = [{
            id: 1, text: `FI`
        }, {
            id: 2, text: `IT`
        }, {
            id: 3, text: `RU`
        }, {
            id: 4, text: `US`
        }];
    let selectedCountry = countries[3];

    let round = (number) => Math.round(number * 1000) / 1000;


    function loadPhoto(file) {
        const reader = new FileReader();
        reader.onload = () => {
            preview.src = reader.result;
            imageDataBase64.set(reader.result);
            filename = file.name;
        };
        reader.onerror = () => {
            reader.abort();
            console.log(`Unable to get Content of ${file.name}: ${reader.error}`);
        };

        reader.readAsDataURL(file);
    }

    function photoLoaded() {
        isPhotoLoaded = true;

        /* eslint-disable no-undef */
        EXIF.getData(preview, function() {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef") === 'S' ? -1 : 1;
            const lon = EXIF.getTag(this, "GPSLongitude");
            const lonRef = EXIF.getTag(this, "GPSLongitudeRef") === 'W' ? -1 : 1;

            if (lat !== undefined && lon !== undefined) {
                latAngle = Number((lat[0]) + Number(lat[1]) / 60 + Number(lat[2]) / (60 * 60)) * latRef;
                lonAngle = Number((lon[0]) + Number(lon[1]) / 60 + Number(lon[2]) / (60 * 60)) * lonRef;

                photoLocationMessage = `${round(latAngle, 3)}, ${round(lonAngle, 3)}`;
            } else if (filename === 'seattle.jpg') {
                // The demo image available to me has no location in EXIF data, unfortunately. Faking it here.
                latAngle = 47.611550;
                lonAngle = -122.337056;

                photoLocationMessage = `${round(latAngle, 3)}, ${round(lonAngle, 3)}`;
            } else {
                latAngle = undefined;
                lonAngle = undefined;

                photoLocationMessage = 'No location found. Try another photo with location available in EXIF data';
            }
        });
    }

    function localizePhoto() {
        const h3Index = h3.geoToH3(latAngle, lonAngle, 8);

        getServicesAtLocation(selectedCountry.text, h3Index)
            .then(data => data[0].services[0].url)
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
                                "imageBytes": $imageDataBase64.split(',')[1]
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
                const localisationUrl = `${serviceUrl}/scrs/geopose`;
                fetch(localisationUrl, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }

                        return response.json();
                    })
                    .then(data => {
                        isGeoposeLoaded = true;
                        geopose.set(data);

                        geoposeLocationMessage =
                            `${round(latAngle, 3)}, ${round(lonAngle, 3)}, ${$geopose.pose.quaternion.toLocaleString()}`;
                    })
                    .catch(error => {
                        console.error(error);
                        geoposeLocationMessage = "No GeoPose found. Maybe the map isn't public";
                    });
            })
    }
</script>


<div>
    <p>Introduction of the demo TBD</p>

    <div>
        <p class="title">Location from photo:</p>
        {#if isPhotoLoaded === false}
            <Import buttonLabel="Select photo" postFileFunction="{loadPhoto}"/>
        {:else}
            <p>{photoLocationMessage}</p>
        {/if}

        {#if isPhotoLoaded === true && isGeoposeLoaded === false}
            <p class="title">GeoPose from photo:</p>
            <button
                    disabled="{latAngle === undefined || lonAngle === undefined}"
                    on:click={localizePhoto}>
                Localize photo
            </button>
            <span>in</span>
            <select bind:value={selectedCountry}>
                {#each countries as country}
                    <option value={country}>{country.text}</option>
                {/each}
            </select>
        {:else if isGeoposeLoaded === true}
            <p class="title">GeoPose from photo:</p>
            <p>{geoposeLocationMessage}</p>
        {/if}

        {#if isGeoposeLoaded === true}
            <button on:click={$goto('../photomap')}>Show location on 3D Map</button>
        {/if}

        <img id="preview" class:hidden={isPhotoLoaded === false} bind:this={preview} on:load={photoLoaded} alt="Preview of the selected file" />
    </div>
</div>



<svelte:head>
    <script src="https://cdn.jsdelivr.net/npm/exif-js"></script>
</svelte:head>