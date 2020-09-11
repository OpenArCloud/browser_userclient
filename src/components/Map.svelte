<!--
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
-->

<style>
    #map {
        height: 100%;
    }

    #map :global(.h3indexmarkercontainer) {
        display: flex;
        flex-direction: column;
        align-items: center;
        height: fit-content !important;
    }

    #map :global(.h3indexmarker) {
        padding: 7px;
        overflow-x: hidden;
        border-radius: .5rem;
        font-weight: 700;
        text-overflow: ellipsis;
        background-color: #ffffff60;
    }
</style>

<script>
    import { goto } from '@sveltech/routify';

    import L from 'leaflet';
    import * as h3 from "h3-js";
    import geojson2h3 from 'geojson2h3';

    import { countryCode, h3Index, lat, lon } from '../core/store.js';
    import { H3RESOLUTION_AUTO } from '../core/store.js';
    import { DISPLAY_LATLON, DISPLAY_H3 } from '../core/store.js';

    import MapControl from './MapControl.svelte';


    const COUNT_H3RING = 1;

    const DEFAULT_ZOOM = 13;
    const MAX_ZOOM = 20;

    const COLOR_H3Center = '#ff7800';
    const COLOR_H3RING = '#e5b70b';
    const OPACITY_H3HEXAGON = 0.4;

    /**
     * Table used for marker size decisions.
     * key is map zoom, value is H3 resolution
     */
    const zoomMarkerSizeTable = {
        2: 0, 3: 1, 4: 2, 5: 2, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6,
        12: 7, 13: 8, 14: 8, 15: 9, 16: 10, 17: 11, 18: 11, 19: 12, 20: 13
    }

    let map;

    let thisLat;
    let thisLon;
    let thisH3Index;

    let currentDisplayType = $DISPLAY_H3;
    let currentH3Resolution = $H3RESOLUTION_AUTO;


    function createMap(container) {
        let m = L.map(container)
            .setView([thisLat, thisLon], DEFAULT_ZOOM);

        let calcH3Resolution = () => currentH3Resolution === $H3RESOLUTION_AUTO ?
            Math.round(0.7 * (m.getZoom() - 3)) : currentH3Resolution;

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
                            updateH3Layers(event.target.feature.id, h3Layer, h3MarkerLayer)
                        }
                    });
                }
            }
        });

        let centerId = h3.geoToH3(thisLat, thisLon, calcH3Resolution());
        updateH3Layers(centerId, h3Layer, h3MarkerLayer);

        h3Layer.addTo(m);

        m.on('click', (event) => {
            h3Layer.clearLayers();
            const clickH3 = h3.geoToH3(event.latlng.lat, event.latlng.lng, calcH3Resolution());
            updateH3Layers(clickH3, h3Layer, h3MarkerLayer)
            m.flyTo(h3.h3ToGeo(clickH3));
        })

        m.on('zoomend', () => {
            let tempResolution = currentH3Resolution === $H3RESOLUTION_AUTO ? calcH3Resolution() : currentH3Resolution;
            toolbarComponent.$set({h3Resolution: tempResolution});

            // TODO: Find a better way to change the resolution of an H3 index
            const centerGeo = h3.h3ToGeo(thisH3Index);
            const centerId = h3.geoToH3(centerGeo[0], centerGeo[1], tempResolution);
            updateH3Layers(centerId, h3Layer, h3MarkerLayer)
        })

        let toolbar = L.control({ position: 'topright' });
        let toolbarComponent;

        toolbar.onAdd = () => {
            let div = L.DomUtil.create('div');
            toolbarComponent = new MapControl({
                target: div,
                props: {}
            });

            toolbarComponent.$on('change-h3resolution', (event) => {
                let previousResolution = currentH3Resolution;
                currentH3Resolution = event.detail;

                if (previousResolution !== H3RESOLUTION_AUTO && event.detail !== H3RESOLUTION_AUTO
                        && previousResolution !== event.detail) {
                    const centerGeo = h3.h3ToGeo(thisH3Index);
                    const centerId = h3.geoToH3(centerGeo[0], centerGeo[1], calcH3Resolution());
                    updateH3Layers(centerId, h3Layer, h3MarkerLayer)
                }
            });
            toolbarComponent.$on('change-display', (event) => {
                currentDisplayType = event.detail;
                updateH3Layers(thisH3Index, h3Layer, h3MarkerLayer);
            });

            return div;
        }

        toolbar.onRemove = () => {
            if(toolbarComponent) {
                toolbarComponent.$destroy();
                toolbarComponent = null;
            }
        };

        toolbar.addTo(m);

        return m;
    }

    function updateH3Layers(centerId, gridLayer, infoLayer) {
        const features = getFeaturesForH3Index(centerId);

        gridLayer.clearLayers();
        gridLayer.addData(features);

        infoLayer.clearLayers();

        const markerStyle = getMarkerWidth();
        if (markerStyle !== undefined) {
            features.features.forEach((feature) => {
                let content = feature.id;

                const latLon = h3.h3ToGeo(feature.id);
                if (currentDisplayType === $DISPLAY_LATLON) {
                    content = `${latLon[0]}, ${latLon[1]}`;
                }

                let marker = L.marker(latLon, {
                    icon: L.divIcon({
                        html: `<button style="${markerStyle}" class="h3indexmarker">${content}</button>`,
                        className: 'h3indexmarkercontainer'
                    }),
                    id: feature.id
                });

                marker.on('click', (event) => {
                    let center = event.target.getLatLng();
                    lat.set(center.lat);
                    lon.set(center.lng);
                    h3Index.set(event.target.options.id);

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

                infoLayer.addLayer(marker);
            })
        }
    }

    function getMarkerWidth() {
        let css;
        const res = zoomMarkerSizeTable[map !== undefined ? map.getZoom() : DEFAULT_ZOOM];
        if( res === currentH3Resolution) {
            css = 'width: 50px';
        } else if (res > currentH3Resolution) {
            css = '';
        }

        return css;
    }

    function getFeaturesForH3Index(newIndex) {
        thisH3Index = newIndex;
        const kRing = h3.kRing(thisH3Index, COUNT_H3RING);
        return geojson2h3.h3SetToFeatureCollection(kRing);
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
                map = null;
            },
        };
    }

    function resizeMap() {
        if(map) { map.invalidateSize(); }
    }
</script>

<svelte:window on:resize={resizeMap} />

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css"
          integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ=="
          crossorigin=""/>
</svelte:head>

<div id="map" use:mapAction><slot></slot></div>