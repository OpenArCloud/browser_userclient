<!--
    (c) 2020 Open AR Cloud
    This code is licensed under MIT license (see LICENSE.md for details)
-->

<!-- routify:options bundle=true -->

<script>
    import { ready } from '@sveltech/routify'


    /*
     * since SCR normally won't render till all components have been loaded
     * and our <slot /> will never load, we will have to let SCR do its job
     * right away by calling $ready()
     */
    $ready()
</script>


<slot />
