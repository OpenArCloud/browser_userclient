// (c) 2020 Open AR Cloud
// This code is licensed under MIT license (see LICENSE.md for details)

<!--
    Second part of the app allowing access to every single step of the service and content discovery workflow.
    Allows to test different scenarios and services for interoperability.

    First draft, most functionality still missing.
-->

<svelte:head>
    <!-- Wasn't able to use import. Looks like some kind of naming problem because of the hyphen in the name -->
    <script src="https://unpkg.com/h3-js"></script>
</svelte:head>

<style>
</style>

<script>
    import CurrentLocation from '../components/CurrentLocation.svelte';
    import GeoposeService from '../components/GeoposeService.svelte';
    import ContentService from '../components/ContentService.svelte';
    import ArDisplay from '../components/ArDisplay.svelte';

    let countryCode;
    let h3Index;
</script>


<h2>Open AR Cloud access workflow</h2>
<p>Access every step of the OSCP services workflow separately</p>

<CurrentLocation bind:countryCode bind:h3Index/>
<GeoposeService countryCode="{countryCode}" h3Index="{h3Index}"/>
<ContentService countryCode="{countryCode}" h3Index="{h3Index}"/>
<ArDisplay/>
