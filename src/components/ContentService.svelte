<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<!--
    Requests content available around the provided location.
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

    let contentServices = [];
    let selectedContentService = null;

    function handleContentServices() {
        requestServices(countryCode, h3Index)
            .then(data => {
                data.forEach((item) => {
                    item.services.forEach((service)=> {
                        if (service.type === 'content-discovery') {
                            service = {"provider": item.provider, "service": service, "id": item.id};
                            contentServices = [...contentServices, service];
                        }
                    });
                });
            })
            .catch(error => {
                console.log(`Server access error: ${error}`);
            });
    }

    function positionContent() {
        // Request content from selected content discovery service for positioning when AR Session is running
    }
</script>

<fieldset>
    <legend>Content Discovery</legend>
    <div>
        <ul>
            {#each contentServices as service}
                <li class="{selectedContentService === service.id ? 'active' : ''}">
                    <input type="radio" id="content{service.id}" bind:group={selectedContentService} value="{service.id}"/>
                    <label for="content{service.id}">{service.provider}</label>
                </li>
            {/each}
        </ul>

        <button on:click={handleContentServices}>Get</button>
        <button disabled="{selectedContentService == null}" on:click={positionContent}>Use</button>
    </div>
</fieldset>
