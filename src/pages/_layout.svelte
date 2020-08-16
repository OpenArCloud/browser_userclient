// (c) 2020 Open AR Cloud
// This code is licensed under MIT license (see LICENSE.md for details)

<script>
    import { isActive, url } from "@sveltech/routify";

    const links =
            [
                ['/index', 'Home'],
                ['/user', 'User'],
                ['/dev', 'Developer'],
            ]
</script>

<style>
    header {
        padding: 6vw;
        background: linear-gradient(180deg,#000,#09374b 67%,#1b5f7c),
        linear-gradient(180deg,transparent,transparent);
    }

    main {
        padding: 8px;
    }

    a {
        color: #fff;
        margin-right: 15px;
    }

    a.active {
        color: #ea6237;
    }

    #oarc_logo {
        width: auto;
        max-width: 100%;
        max-height: 51px;
    }
</style>

<header>
    <h1><img id="oarc_logo" src="OARC_Logo_without_BG.png" alt="Open AR Cloud header image"/></h1>

    <nav>
        {#each links as [path, name]}
            <a class:active={$isActive(path)} href={$url(path)}>{name}</a>
        {/each}
    </nav>
</header>

<main>
    <slot></slot>
</main>