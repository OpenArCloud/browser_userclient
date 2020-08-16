// (c) 2020 Open AR Cloud
// This code is licensed under MIT license (see LICENSE.md for details)

<!--
    Requests GeoPose services available around the provided location.
-->

<style>
    li {
        list-style-type: none;
    }

    .active {
        background: #ea6237;
    }

    li input[type=radio] {
        display: none;
    }
</style>

<script>
    import { requestServices } from '../core/ServiceRequest.js';

    export let countryCode;
    export let h3Index;

    let geoposeServices = [];
    let selectedGeoPoseService = null;

    let isGeoposeServiceRunning = false;
    let geoposeServiceLabel = 'Start';

    function handleRequestGeoposeServices() {
        requestServices(countryCode, h3Index)
            .then(data => {
                data.forEach((item) => {
                    item.services.forEach((service)=> {
                        if (service.type === 'geopose') {
                            service = {"provider": item.provider, "service": service, "id": item.id};
                            geoposeServices = [...geoposeServices, service];
                        }
                    });
                });
            })
            .catch(error => {
                console.log(`Server access error: ${error}`);
            });
    }

    function toggleGeoposeService() {
        isGeoposeServiceRunning = !isGeoposeServiceRunning;
        geoposeServiceLabel = isGeoposeServiceRunning ? 'Stop' : 'Start';
    }
</script>


<fieldset>
    <legend>GeoPose Services</legend>
    <div>
        <ul>
            {#each geoposeServices as service}
                <li class="{selectedGeoPoseService === service.id ? 'active' : ''}">
                    <input type="radio" id="geo{service.id}" bind:group={selectedGeoPoseService} value="{service.id}"/>
                    <label for="geo{service.id}">{service.provider}</label>
                </li>
            {/each}
        </ul>

        <button on:click={handleRequestGeoposeServices}>Get</button>
        <button class="{isGeoposeServiceRunning ? 'active' : ''}" disabled="{selectedGeoPoseService === null}" on:click={toggleGeoposeService}>{geoposeServiceLabel}</button>
    </div>
</fieldset>
