<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    aside {
        border-radius: .5rem;
        box-shadow: 2px 2px 2px 1px rgba(0, 0, 0, 0.2);
        background-color: white;
        padding: 7px;
    }

    input[type=number] {
        width: 2rem;
    }
</style>

<script>
    import {createEventDispatcher} from 'svelte';

    import { MIN_H3RESOLUTION, DEFAULT_H3RESOLUTION, MAX_H3RESOLUTION, H3RESOLUTION_AUTO } from '../core/store.js';

    export let h3ResolutionType = $H3RESOLUTION_AUTO;
    export let h3Resolution = $DEFAULT_H3RESOLUTION;


    const dispatch = createEventDispatcher();

    function preventDefault(event) {
        event.stopPropagation();
    }

    function handleH3Resolution() {
        dispatch('change-h3resolution', h3ResolutionType ? $H3RESOLUTION_AUTO : h3Resolution);
    }

    function handleDisplay(event) {
        dispatch('change-display', event.target.value);
    }
</script>

<aside on:click={preventDefault} on:dblclick={preventDefault}>
    <fieldset>
        <legend>Display</legend>
        <div>
            <input id="displaylatlon" type="radio" name="displayinfo" value="latlon" on:change={handleDisplay} />
            <label for="displaylatlon">Lat/Lon</label>
        </div>
        <div>
            <input id="displayh3" type="radio" name="displayinfo" value="h3" checked on:change={handleDisplay} />
            <label for="displayh3">H3</label>
        </div>
    </fieldset>
    <fieldset>
        <legend>Grid Resolution</legend>
        <div>
            <input id="autogridres" type="checkbox" bind:checked="{h3ResolutionType}" on:change={handleH3Resolution}/>
            <label for="autogridres">Auto</label>
        </div>
        <div>
            <label for="h3resolution">Resolution</label>
            <input id="h3resolution" type="number"
                   min="{$MIN_H3RESOLUTION}" max="{$MAX_H3RESOLUTION}" disabled="{h3ResolutionType}"
                   bind:value="{h3Resolution}" on:change={handleH3Resolution}/>
        </div>
    </fieldset>
</aside>
