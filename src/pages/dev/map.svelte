<style>
    #map {
        height: 100%;
    }

    #map :global(.h3indexmarkercontainer) {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    #map :global(.h3indexmarker) {
        background-color: #ffffff60;
        padding: 7px;
        border-radius: .5rem;
        font-weight: 700;
    }
</style>

<script>
    import { goto } from '@sveltech/routify';

    import L from 'leaflet';
    import * as h3 from "h3-js";
    import geojson2h3 from 'geojson2h3';

    import { lat, lon, countryCode, h3Index } from '../../core/store.js';

    const DEFAULT_ZOOM = 13;
    const MAX_ZOOM = 20;
    const DEFAULT_H3RESOLUTION = 7;

    const COLOR_H3Center = "#ff7800";
    const COLOR_H3RING = "#e5b70b";
    const OPACITY_H3HEXAGON = 0.4;

    let map;

    let thisLat;
    let thisLon;
    let thisH3Index;


    function createMap(container) {
        let m = L.map(container)
            .setView([thisLat, thisLon], DEFAULT_ZOOM);

        let thisH3Factor = () => Math.round(0.7 * (m.getZoom() - 3));

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: `&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,
                                &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>`,
                subdomains: 'abcd',
                maxZoom: MAX_ZOOM
            }
        ).addTo(m);

        let h3MarkerLayer = L.layerGroup()
        h3MarkerLayer.addTo(m);

        let h3Layer = L.geoJSON([], {
            style: function (feature) {
                return {
                    "color": feature.id === thisH3Index ? COLOR_H3Center : COLOR_H3RING,
                    "opacity": OPACITY_H3HEXAGON
                }
            },
            onEachFeature: (feature, layer) => {
                if(feature.id !== thisH3Index) {
                    layer.on({
                        click: (event) => {
                            updateH3Layers(event.target.feature.id, h3Layer, h3MarkerLayer, thisH3Factor())
                        }
                    });
                }
            }
        });

        let centerId = h3.geoToH3(thisLat, thisLon, thisH3Factor());
        updateH3Layers(centerId, h3Layer, h3MarkerLayer, thisH3Factor());

        h3Layer.addTo(m);

        m.on('click', (event) => {
            h3Layer.clearLayers();
            const clickH3 = h3.geoToH3(event.latlng.lat, event.latlng.lng, thisH3Factor());
            updateH3Layers(clickH3, h3Layer, h3MarkerLayer)
            m.flyTo(h3.h3ToGeo(clickH3));
        })

        m.on('zoomend', () => {
            // TODO: Find a better way to change the resolution of the H3 index
            const centerGeo = h3.h3ToGeo(thisH3Index);
            const centerId = h3.geoToH3(centerGeo[0], centerGeo[1], thisH3Factor());
            updateH3Layers(centerId, h3Layer, h3MarkerLayer)
        })

        return m;
    }

    function updateH3Layers(centerId, hexagonLayer, indexLayer) {
        const features = getFeaturesForH3Index(centerId);

        hexagonLayer.clearLayers();
        hexagonLayer.addData(features);

        indexLayer.clearLayers();

        features.features.forEach((feature) => {
            let marker = L.marker(h3.h3ToGeo(feature.id), {
                icon: L.divIcon({
                    html: `<button class="h3indexmarker">${feature.id}</button>`,
                    className: 'h3indexmarkercontainer'
                }),
                id: feature.id
        });
            marker.on('click', (event) => {
                let center = event.target.getLatLng();
                lat.set(center.lat);
                lon.set(center.lng);
                h3Index.set(event.target.options.id);

                console.log(center.lat + "' " + center.lng);

                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${center.lat}&lon=${center.lng}&format=json&zoom=1&email=info%40michaelvogt.eu`)
                .then((response) => {
                    if (response.ok) {
                        return response.json();
                    } else {
                        throw new Error(response.text());
                    }
                })
                .then((data) => {
                    countryCode.set(data.address.country_code);
                    $goto('/dev/');
                })
                .catch((error) => {
                    throw new Error(error.statusText());
                })
            })
            indexLayer.addLayer(marker);
        })
    }

    function getFeaturesForH3Index(newIndex) {
        thisH3Index = newIndex;
        const kRing = h3.kRing(thisH3Index, 1);
        return geojson2h3.h3SetToFeatureCollection(kRing);
    }

    function mapAction(container) {
        thisLat = $lat;
        thisLon = $lon;

        if (thisLat === undefined || thisLat === 0
            || thisLon === undefined || thisLon === 0) {
            [thisLat, thisLon] = getCurrentLocation();
        }

        map = createMap(container);
        return {
            destroy: () => {
                map.remove();
            },
        };
    }

    function resizeMap() {
        if(map) { map.invalidateSize(); }
    }

    function getCurrentLocation() {
        // Heidelberg Castle
        let thisLoc = [49.410625, 8.715277];

        if ($lat === 0 || $lon === 0) {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition((position) => {
                    thisLoc = [position.coords.latitude, position.coords.longitude];
                }, (error) => {
                    console.log(`Location request failed: ${error}`)
                }, {
                    enableHighAccuracy: false
                });
            }
        }
        return thisLoc;
    }
</script>

<svelte:window on:resize={resizeMap} />

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css"
          integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ=="
          crossorigin=""/>
</svelte:head>


<div id="map" use:mapAction></div>