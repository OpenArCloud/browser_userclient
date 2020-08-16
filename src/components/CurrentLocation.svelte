<!--
    Requests and displays the current location of a device.

    Simple lat,long for now. Other formats could be added.
    Could potentially be used to fake a location for testing.

    First draft, most functionality still missing.
-->


<script>
    export let countryCode = '';
    export let h3Index = '';

    let latitude = '';
    let longitude = '';

    function handleGetLocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
            }, (error) => {
                console.log(`Location request failed: ${error}`)
            }, {
                enableHighAccuracy: false
            });

            countryCode = 'US';
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

    }

    function handleGetH3index() {
        if (latitude === 0 || longitude === 0) {
            handleGetLocation()
        }

        // Almost no content on the server yet. Hardcoding index for now
        // h3index = h3.geoToH3(latitude, longitude, 8);

        h3Index = '88489e3425fffff';
    }
</script>


<fieldset>
    <legend>Location</legend>
    <div>
        <label for="latloninput">Lat, Long</label>
        <input id="latloninput" value="{latitude}, {longitude}"/>
        <button on:click={handleGetLocation}>Get</button>
        <button on:click={handleSetLocation}>Set</button>
    </div>
    <div>
        <label for="countryinput">Country</label>
        <input id="countryinput" bind:value="{countryCode}"/>
    </div>
    <div>
        <label for="h3input">H3 index</label>
        <input id="h3input" bind:value="{h3Index}"/>
        <button on:click={handleGetH3index}>Get</button>
    </div>
</fieldset>
