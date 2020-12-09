<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
</style>


<script>
    import {goto} from '@sveltech/routify';
</script>


<div class="contentwrapper">
    <h2>AR Cloud Client experiments</h2>

    <p>
        Below you can find various client side experiments around UI, UX, 3D viewers and so on. The list will be
        extended over time.
    </p>

    <dl class="card" on:click={$goto('../geopose/localizephoto')}>
        <dd><img src="/content/photoposition.jpg" alt="Icon for GeoPose localisation experiment"/></dd>
    </dl>

    <dl class="card" on:click={$goto('../cesium/proposedbuilding')}>
        <dd><img src="/content/building-proposal.jpg" alt="Icon for Building Proposal experiment"/></dd>
    </dl>
</div>