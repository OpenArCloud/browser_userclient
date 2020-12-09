<!--
    (c) 2020 Open AR Cloud
    This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    #dropzone {
        /*height: 4rem;*/
        display: flex;
        flex-direction: column;
        align-items: center;
        /* margin: 2rem; */
    }

    #dropzone.disabled {
        border-color: lightgray;
        color: lightgray;
    }

    #dropzone button {
        /* margin: auto; */
        /* padding: 1.5rem 5rem; */
    }

    input[type=file] {
        display: none;
    }

    /* eslint-disable-next-line css-unused-selector */
    #search {
        margin-top: 2rem;
    }
</style>


<script>
    export let postFileFunction;
    export let accepts = ".json";
    export let header = ""
    export let message = '';
    export let buttonLabel = '';


    let dropEnabled = true;

    function handleDropOver(event) {
        event.preventDefault();
    }

    function handleDrop(event) {
        event.preventDefault();

        if (event.dataTransfer.items) {
            dropEnabled = false;

            for (const file of event.dataTransfer.files) {
                uploadFile(file);
            }
        }
        dropEnabled = true;
    }

    function handleFileInput(event) {
        if (event.target.files) {
            dropEnabled = false;

            for (const file of event.target.files) {
                uploadFile(file);
            }
        }
        dropEnabled = true;
    }

    function uploadFile(file) {
        postFileFunction(file)
    }
</script>


<h2>{header}</h2>

<slot name="intro" />

<slot name="search" />

<div id="dropzone" class:disabled={!dropEnabled} on:drop={handleDrop} on:dragover={handleDropOver}>
    <span>{message}</span>
    <button disabled={!dropEnabled}>
        {buttonLabel}
        <input type="file" disabled={!dropEnabled} accept={accepts} on:change={handleFileInput}/>
    </button>
    <slot name="alternative" />
</div>
