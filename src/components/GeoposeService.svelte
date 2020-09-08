<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

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
    import { get } from 'svelte/store';

    import { requestServices } from 'ssd-access';
    import { countryCode, h3Index, selectedGeoposeService } from '../core/store.js'


    let geoposeServices = [];
    let geoposeServiceLabel = 'Start';

    function handleRequestGeoposeServices() {
        geoposeServices = [];

        requestServices(get(countryCode), get(h3Index))
            .then(data => {
                data.forEach((item) => {
                    item.services.forEach((service)=> {
                        if (service.type === 'geopose') {
                            service = {provider: item.provider, service: service, id: item.id};
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
        $selectedGeoposeService.isRunning = !$selectedGeoposeService.isRunning;
        geoposeServiceLabel = $selectedGeoposeService.isRunning ? 'Stop' : 'Start';
    }
</script>


<fieldset>
    <legend>GeoPose Services</legend>
    <div>
        <ul>
            {#each geoposeServices as service}
                <li class="{$selectedGeoposeService.id === service.id ? 'active' : ''}">
                    <input type="radio" id="geo{service.id}" bind:group={$selectedGeoposeService.id} value="{service.id}"/>
                    <label for="geo{service.id}">{service.provider}</label>
                </li>
            {/each}
        </ul>

        <button on:click={handleRequestGeoposeServices}>Get</button>
        <button
                class="{$selectedGeoposeService.isRunning ? 'active' : ''}"
                disabled="{$selectedGeoposeService.id === null}"
                on:click={toggleGeoposeService}>
            {geoposeServiceLabel}
        </button>
    </div>
</fieldset>

