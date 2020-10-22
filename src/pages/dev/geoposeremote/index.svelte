<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<script>
    import Peer from 'peerjs';

    import ArDisplay from '../../../components/ArDisplay.svelte';


    let localPeer;

    let remotePeerId;
    let lastPeerId = null;
    let connection = null;

    let loadStates = {
        AR: 'Not available',
        Admin: 'Waiting for Admin Id'
    };

    let locationData;
    let isArAvailable = false;

    $: {
        if(isArAvailable === true) {
            loadStates.AR = 'Available'
            startSetup();
        } else {
            loadStates.AR = 'Not available';
        }
    }

    $: defineUi = loadStates.RTC === 'Connected' ? 'button' : 'none';


    function startSetup() {
        remotePeerId = new URL(document.location).searchParams.get('peerid');

        if (isArAvailable) {
            if (remotePeerId) {
                localPeer = new Peer(null, {  // TODO: Introduce .env parameters
                    debug: 2,
                    host: '192.168.1.103',
                    port: 3001,
                    path: '/'
                });

                localPeer.on('open', () => {
                    // Workaround for peer.reconnect deleting previous id
                    if (localPeer.id === null) {
                        console.log('Received null id from peer open');
                        localPeer.id = lastPeerId;
                    } else {
                        lastPeerId = localPeer.id;
                    }

                    loadStates.RTC = 'Connection initiated...';

                    join();
                });

                localPeer.on('connection', (c) => {
                    // Disallow incoming connections
                    c.on('open', () => {
                        c.send("Sender does not accept incoming connections");
                        setTimeout(() => {
                            c.close();
                        }, 500);
                    });
                });

                localPeer.on('disconnected', () => {
                    loadStates.RTC = "Connection lost. Please reconnect";
                    console.log('Connection lost. Please reconnect');

                    // Workaround for peer.reconnect deleting previous id
                    localPeer.id = lastPeerId;
                    localPeer._lastServerId = lastPeerId;
                    localPeer.reconnect();
                });

                localPeer.on('close', () => {
                    connection = null;
                    loadStates.RTC = "Connection destroyed. Please refresh";
                });

                localPeer.on('error', (err) => {
                    loadStates.RTC = 'Not found. Check Peer ID.';
                    console.log(err);
                });
            } else {
                loadStates.RTC = 'URL incomplete. WebRTC Connection to Admin not possible.';
            }
        } else {
            loadStates.AR = 'Not available';
        }
    }

    function join() {
        if (connection) connection.close();

        connection = localPeer.connect(remotePeerId, {reliable: true});
        connection.on('open', () => {
            loadStates.RTC = "Connected";

            signal('locationdata');
        });
        
        connection.on('data', (data) => {
            `Peer: ${data}`;

            const dataObject = JSON.parse(data);

            switch (dataObject.type) {
                case 'location':
                    locationData = dataObject;
                    break;
                default:
                    console.log(`unknown data type received: ${dataObject.type}`);
            }
        });
        
        connection.on('close', () => {
            loadStates.RTC = 'Connection closed';
        });
    }

    function signal(sigName) {
        if (connection && connection.open) {
            connection.send(sigName);
            console.log(sigName + " signal sent");
        } else {
            console.log('Connection is closed');
        }
    }
</script>


<h1>Simulated location</h1>

<p>Allows to verify and correct the location of content prepared for the Spatial Content Discovery service.</p>
<p>
    Settings done in the Admin app are automatically transferred to the mobile device. According to these settings,
    a map from the area around the GeoPose is downloaded, placed in front of the mobile device on the ground and the
    content placed relative to this map. This should give a good impression how the content looks in this surrounding
    and verify that the GeoPose entered is correct. Changes done at the admin screen are immediately transferred to
    the mobile device and applied.
</p>
<p>
    Communication between computer and mobile device is done locally over <a href="https://webrtc.org/">WebRTC</a>.
    Internet access is only used to initiated the connection.
</p>

<dl>
    <dt>Load state:</dt>
    <dd>AR -  {loadStates.AR}</dd>

    {#if isArAvailable}
        <dd>Admin - {loadStates.RTC}</dd>
    {/if}
</dl>

<ArDisplay displayUi="{defineUi}" locationData="{locationData}" bind:isArAvailable />
