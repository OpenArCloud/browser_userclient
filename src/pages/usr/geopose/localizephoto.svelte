<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    summary {
        outline: none;
    }

    p {
        margin-top: 0;
    }

    #preview {
        width: 75vw;
    }

    #defaultbutton {
        margin-top: 10px;
    }

    .title {
        font-weight: bold;
    }

    .centered {
        height: 4rem;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .hidden {
        display: none;
    }
</style>


<script>
    import Import from '../../../components/Import.svelte';

    import { goto } from '@sveltech/routify';

    import { geopose, imageDataBase64, imageRotation } from "./geoposestore.js";

    import { getServicesAtLocation } from 'ssd-access';
    import { sendRequest, objectEndpoint } from 'gpp-access';
    import GeoPoseRequest from 'gpp-access/request/GeoPoseRequest.js';
    import ImageOrientation from 'gpp-access/request/options/ImageOrientation.js';
    import { IMAGEFORMAT } from 'gpp-access/GppGlobals.js';

    import * as h3 from "h3-js";
    import { v4 as uuidv4 } from 'uuid';


    // TODO: Get from EXIF
    const imageSize = [1920, 1080];
    $: imageBytes = $imageDataBase64.split(',')[1];

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
                imageRotation.set(decodeRotation(EXIF.getTag(this, "Orientation")));

                latAngle = Number((lat[0]) + Number(lat[1]) / 60 + Number(lat[2]) / (60 * 60)) * latRef;
                lonAngle = Number((lon[0]) + Number(lon[1]) / 60 + Number(lon[2]) / (60 * 60)) * lonRef;

                setCountryCode();

                photoHasLocation = true;
                photoLocationMessage = `<div>Lat: ${round(latAngle, 3)},</div><div>Lon: ${round(lonAngle, 3)}</div>`;
            } else {
                latAngle = undefined;
                lonAngle = undefined;

                photoLocationMessage = 'No location found. Try another photo with location available in EXIF data';
            }
        });
    }

    async function localizePhoto() {
        accessingGeoPoseServer = true;

        const serviceUrl = await requestServiceUrl();
        const geoPoseRequest = new GeoPoseRequest(uuidv4())
            .addLocationData(latAngle, lonAngle, 0, 0, 0, 0, 0)
            .addCameraData(IMAGEFORMAT.JPG, imageSize, imageBytes, 0, new ImageOrientation(false, 0));

        sendRequest(`${serviceUrl}/${objectEndpoint}`, JSON.stringify(geoPoseRequest))
            .then(data => {
                isGeoposeLoaded = true;
                accessingGeoPoseServer = false;

                geopose.set(data.geopose);
                geoposeLocationMessage =
                    `<div>Lat: ${round(latAngle, 3)},</div><div>Lon: ${round(lonAngle, 3)},</div><div>Quaternion: ${$geopose.ecef.quaternion.toLocaleString()}</div>`;
            })
            .catch(error => {
                console.error(error);
                geoposeLocationMessage = "No GeoPose found. Maybe the map isn't public";
            });
    }

    function requestServiceUrl() {
        const h3Index = h3.geoToH3(latAngle, lonAngle, 8);

        return getServicesAtLocation(selectedCountry.text, h3Index)
            .then(data => {
                if (data.length !== 0) {
                    let url = data[0].services[0].url;

                    if (!url.includes('https://')) {
                        url = url.replace('http://', 'https://');
                    }

                    return url;
                } else {
                    // no ssd available in the requested country. Using Augmented City as a fallback for now
                    return 'http://developer.augmented.city';
                }
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

    function decodeRotation(rotation) {
        let result = 'none'

        switch (rotation) {
            case 8:
                result = 'right';
                break;
            case 3:
                result = 'half';
                break;
            case 6:
                result = 'left';
                break;
        }

        return result;
    }
</script>


<div class="contentwrapper">
    <h2>Photo positioning</h2>

    <details open>
        <summary>Intro</summary>
        <p>
            Given a photo with rough coordinates where it was shot, it is possible to position it in 3D
            at the exact position and rotation it was shot.
        </p>

        <dl class="processlist">
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
    </details>

    <p>
        Note: Currently, this experiment works with <a href="https://www.augmented.city/">Augmented City</a> and soon
        with <a href="https://immersal.com/">Immersal</a>. Others to come. Feel free to contact them when you are
        interested to map an area you want to make this experiment work.
    </p>

    <div>
        <h3 class="title">Location from photo:</h3>
        {#if photoHasLocation === false}
            <p>{@html photoLocationMessage}</p>
            <Import accepts="image/jpeg" buttonLabel="Select photo" postFileFunction="{loadPhoto}">
                <button id="defaultbutton" class="selectbutton" slot="alternative" on:click={getDefaultImage}>Take Default</button>
            </Import>
        {:else}
            <p>{@html photoLocationMessage}</p>
        {/if}

        {#if photoHasLocation === true && isGeoposeLoaded === false}
            <h3 class="title">GeoPose from photo:</h3>
            <p>{@html geoposeLocationMessage}</p>
            <div class="centered">
                <button class="selectbutton"
                        disabled="{latAngle === undefined || lonAngle === undefined || accessingGeoPoseServer === true}"
                        on:click={  localizePhoto}>
                    Localize photo
                    {#if accessingGeoPoseServer === true}
                        <img src="/spinner.svg" />
                    {/if}
                </button>
            </div>
        {:else if isGeoposeLoaded === true}
            <h3 class="title">GeoPose from photo:</h3>
            <p>{@html geoposeLocationMessage}</p>
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