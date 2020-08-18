<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<!--
    AR Display.

    Currently just opens an empty WebAR session. Not sure which 3D framework to use, yet.
-->

<script>
    let isArsessionRunning = false;
    let arsessionAvaiableMessage = '';

    let gl = null;
    let arsession = null;
    let arRefSpace = null;


    function checkArAvailability() {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar')
                .then((isSupported) => {
                    arsessionAvaiableMessage = 'not available';
                    if (isSupported) {
                        arsessionAvaiableMessage = 'available';
                    }
                });
        }
    }

    function toggleArsession() {
        if (!arsession) {
            navigator.xr.requestSession('immersive-ar')
                .then(onSessionStarted, onRequestSessionError);
        }
    }

    function onSessionStarted(session) {
        arsession = session;
        arsession.isImmersive = true;
        isArsessionRunning = true;

        session.addEventListener('end', onSessionEnded);
        let canvas = document.createElement('canvas');
        gl = canvas.getContext('webgl', {
            xrCompatible: true
        });

        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
        session.requestReferenceSpace('local').then((refSpace) => {
            arRefSpace = refSpace;
            session.requestAnimationFrame(onXRFrame);
        });
    }

    function onRequestSessionError(error) {
        console.error(error.message);
    }

    function onEndSession(session) {
        session.end();
    }

    function onSessionEnded(session) {
        arsession = null;
        isArsessionRunning = false;

        gl = null;
    }

    function onXRFrame(t, frame) {
        let session = frame.session;
        session.requestAnimationFrame(onXRFrame);
        let pose = frame.getViewerPose(arRefSpace);
    }
</script>

<fieldset>
    <legend>AR Session</legend>
    <p>{arsessionAvaiableMessage}</p>
    <button on:click={checkArAvailability}>Check</button>
    <button disabled="{arsessionAvaiableMessage !== 'available'}" on:click={toggleArsession}>Start</button>
</fieldset>
