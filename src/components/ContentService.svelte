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
    import { get } from 'svelte/store';

    import { countryCode, h3Index, selectedContentService } from '../core/store';
    import { requestServices } from 'ssd-access';


    let contentServices = [];

    function handleContentServices() {
        contentServices = [];

        requestServices(get(countryCode), get(h3Index))
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
                <li class="{$selectedContentService.id === service.id ? 'active' : ''}">
                    <input type="radio" id="content{service.id}" bind:group={$selectedContentService.id} value="{service.id}"/>
                    <label for="content{service.id}">{service.provider}</label>
                </li>
            {/each}
        </ul>

        <button on:click={handleContentServices}>Get</button>
        <button disabled="{$selectedContentService.id === null}" on:click={positionContent}>Use</button>
    </div>
</fieldset>
