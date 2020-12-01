<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    .subjectheader {
        border-bottom: 1px solid #ea6237;
    }
</style>


<script>
    import {goto} from '@sveltech/routify';
</script>


<h2>AR Cloud Client experiments</h2>

<div>
    <p>
        Below you can find various client side experiments around UI, UX, 3D viewers and so on. The list will be
        extended over time.
    </p>

    <h3 class="subjectheader">GeoPose</h3>
    <dl on:click={$goto('../geopose/localizephoto')}>
        <dt>Determine GeoPose of a photo</dt>
        <dd><img src="/content/building-proposal.jpg" alt="Icon for GeoPose localisation experiment"/></dd>
        <dd>Some info about it</dd>
    </dl>

    <h3 class="subjectheader">Cesium</h3>
    <dl on:click={$goto('../cesium/proposedbuilding')}>
        <dt>Cesium Buildding proposal tutorial in AR</dt>
        <dd><img src="/content/building-proposal.jpg" alt="Icon for Building Proposal experiment"/></dd>
        <dd>Some info about it</dd>
    </dl>
</div>