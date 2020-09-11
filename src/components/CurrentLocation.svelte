<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<!--
    Requests and displays the current location of a device.

    Simple lat,long for now. Other formats could be added.
    Could potentially be used to fake a location for testing.

    First draft, most functionality still missing.
-->

<script>
    import { get } from 'svelte/store';
    import { lat, lon, countryCode, h3Index} from '../core/store.js';

    import { goto } from '@sveltech/routify';


    function handleGetLocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                lat.set(position.coords.latitude);
                lon.set(position.coords.longitude);
            }, (error) => {
                console.log(`Location request failed: ${error}`)
            }, {
                enableHighAccuracy: false
            });

            countryCode.set('US');
    /*
            // Not available over https. Hardcoding to US for now
            fetch("https://api.geonames.org/countryCode?lat=30.284863403785405&lng=-97.73540496826172&username=oarc")
                .then((result) => {
                    result = countryCode;
                });


    */
        } else {
            console.log('No GeoLocation');
        }
    }

    function handleSetLocation() {
        $goto('map')
    }

    function handleGetH3index() {
        if (get(lat) === 0 || get(lon) === 0) {
            handleGetLocation()
        }

        // Almost no content on the server yet. Hardcoding index for now
        // h3index = h3.geoToH3(latitude, longitude, 8);

        h3Index.set('88489e3425fffff');
    }
</script>


<fieldset>
    <legend>Location</legend>
    <div>
        <label for="latloninput">Lat, Long</label>
        <input id="latloninput" value="{$lat}, {$lon}"/>
        <button on:click={handleGetLocation}>Get</button>
        <button on:click={handleSetLocation}>Set</button>
    </div>
    <div>
        <label for="countryinput">Country</label>
        <input id="countryinput" bind:value="{$countryCode}"/>
    </div>
    <div>
        <label for="h3input">H3 index</label>
        <input id="h3input" bind:value="{$h3Index}"/>
        <button on:click={handleGetH3index}>Get</button>
    </div>
</fieldset>
