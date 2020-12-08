<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    #preview {
        width: 75vw;
    }

    #defaultbutton {
        margin-top: 10px;
    }

    .title {
        font-weight: bold;
    }

    .selectbutton {
        position: relative;
        margin: auto;
        padding: 1.5rem 5rem;
    }

    .selectbutton img {
        position: absolute;
        top: 0px;
        left: 5.5rem;
        width: 70px;
    }

    .centered {
        height: 4rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 2rem;
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
    let photoHasLocation = false;
    let filename;
    let latAngle, lonAngle;
    let photoLocationMessage = '';
    let accessingGeoPoseServer = false;

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

    function photoLoaded(event) {
        isPhotoLoaded = true;

        // TODO: BUG - Use different EXIF reader, because this one caches the data internally
        /* eslint-disable no-undef */
        EXIF.getData(event.target, () => {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const latRef = EXIF.getTag(this, "GPSLatitudeRef") === 'S' ? -1 : 1;
            const lon = EXIF.getTag(this, "GPSLongitude");
            const lonRef = EXIF.getTag(this, "GPSLongitudeRef") === 'W' ? -1 : 1;

            if (lat !== undefined && lon !== undefined) {
                latAngle = Number((lat[0]) + Number(lat[1]) / 60 + Number(lat[2]) / (60 * 60)) * latRef;
                lonAngle = Number((lon[0]) + Number(lon[1]) / 60 + Number(lon[2]) / (60 * 60)) * lonRef;

                setCountryCode();

                photoHasLocation = true;
                photoLocationMessage = `Lat: ${round(latAngle, 3)}, Lon: ${round(lonAngle, 3)}`;
            } else {
                latAngle = undefined;
                lonAngle = undefined;

                photoLocationMessage = 'No location found. Try another photo with location available in EXIF data';
            }
        });
    }

    function localizePhoto() {
        accessingGeoPoseServer = true;

        const h3Index = h3.geoToH3(latAngle, lonAngle, 8);

        getServicesAtLocation(selectedCountry.text, h3Index)
            .then(data => {
                if (data.length !== 0) {
                    return data[0].services[0].url;
                } else {
                    // no ssd available in the requested country. Checking with Augmented City as a fallback for now
                    return 'http://developer.augmented.city';
                }
            })
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
                const localisationUrl = `${serviceUrl}/scrs/geopose_objs`;
                fetch(localisationUrl, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                })
                    .then(response => {
                        accessingGeoPoseServer = false;

                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }

                        return response.json();
                    })
                    .then(data => {
                        isGeoposeLoaded = true;
                        geopose.set(data.geopose);

                        geoposeLocationMessage =
                            `Lat: ${round(latAngle, 3)}, Lon: ${round(lonAngle, 3)}, Quaternion: ${$geopose.ecef.quaternion.toLocaleString()}`;
                    })
                    .catch(error => {
                        console.error(error);
                        geoposeLocationMessage = "No GeoPose found. Maybe the map isn't public";
                    });
            })
    }

    function setCountryCode() {
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latAngle}&lon=${lonAngle}&format=json&zoom=1&email=info%40michaelvogt.eu`)
            .then((response) => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error(response.text());
                }
            })
            .then((data) => {
                const countryCode = data.address.country_code.toUpperCase();
                const filtered = countries.filter((country) => country.text === countryCode);

                if (filtered.length !== 0) {
                    selectedCountry = filtered[0];
                } else {
                    selectedCountry = countries[1];
                }
            })
            .catch((error) => {
                throw new Error(error);
            })

    }

    function getDefaultImage() {
        fetch('/photos/seattle_gps.jpg')
            .then(response => response.arrayBuffer())
            .then(buffer => {
                imageDataBase64.set('data:image/jpeg;base64,' + btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')));
                preview.src = $imageDataBase64;
                filename = 'seattle.jpg';
            })
    }
</script>


<div>
    <h3>Photo positioning</h3>
    <p>
        Given a photo with rough coordinates where it was shot, it is possible to position it in 3D
        at the exact position and rotation it was shot.
    </p>

    <dl>
        <dt>The process to determine the required information is like this:</dt>
        <dd>Request the available services from the regional Spatial Services Discovery</dd>
        <dd>Choose a GeoPose service and request the GeoPose from the photo</dd>
        <dd>Add the photo to Cesium at the received location and rotation</dd>
    </dl>

    <p>
        This means that this can be done in every region with any photo where the rough location it was shot at is known
        and any GeoPose service provider is available. For this demo, we use the location embedded in the EXIF metadata.
        But it can be provided from other sources, too.
    </p>

    <p>
        The capability to position visual content like this in a 3D environment Cesium provides, has lots of interesting
        applications, especially when taking the terrain away and using it in an AR environment.
    </p>

    <div>
        <p class="title">Location from photo:</p>
        {#if photoHasLocation === false}
            <p>{photoLocationMessage}</p>
            <Import accepts="image/jpeg" buttonLabel="Select photo" postFileFunction="{loadPhoto}">
                <button id="defaultbutton" class="selectbutton" slot="alternative" on:click={getDefaultImage} >Take Default</button>
            </Import>
        {:else}
            <p>{photoLocationMessage}</p>
        {/if}

        {#if photoHasLocation === true && isGeoposeLoaded === false}
            <p class="title">GeoPose from photo:</p>
            <p>{geoposeLocationMessage}</p>
            <div class="centered">
                <button class="selectbutton"
                        disabled="{latAngle === undefined || lonAngle === undefined || accessingGeoPoseServer === true}"
                        on:click={localizePhoto}>
                    Localize photo
                    {#if accessingGeoPoseServer === true}
                        <img src="/spinner.svg" />
                    {/if}
                </button>
            </div>
        {:else if isGeoposeLoaded === true}
            <p class="title">GeoPose from photo:</p>
            <p>{geoposeLocationMessage}</p>
        {/if}

        {#if isGeoposeLoaded === true}
            <div class="centered">
                <button class="selectbutton" on:click={$goto('../photomap')}>Place on 3D Map</button>
            </div>
        {/if}

        <div class="centered">
            <img id="preview" class:hidden={isPhotoLoaded === false}
                bind:this={preview} on:load={photoLoaded} alt="Preview of the selected photo" />
        </div>
    </div>
</div>



<svelte:head>
    <script src="https://cdn.jsdelivr.net/npm/exif-js"></script>
</svelte:head>