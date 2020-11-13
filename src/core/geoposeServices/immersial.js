import { ecef_to_geo } from "../ecef";

export let local = false;


const referenceImageUrl = '/content/PXL_20201102_142648945.png';
const referenceLocalisationUrl = 'https://api.immersal.com/fcgi?21';
const referenceLocalisationParameters = {
    radius: 50,
    longitude: 8.695943579077722,   // TODO: Set from provided GeoPose
    latitude: 48.661773184610375,
    b64: null,
    token: '',
    ox: 319.5929,   // TODO: Pixel 4 values. Get from actual camera used to shoot photo --- somehow...
    oy: 239.48145,
    fy: 501.38055,
    fx: 501.28745
}

const mapEcefUrl = 'https://api.immersal.com/fcgi?23';
const mapEcefParameters = {
    id: '',
    token: ''
}

/* eslint-disable no-unused-vars */
const sparseMapUrl = 'https://api.immersal.com/fcgi?5';
const denseMapUrl = '/content/8058-FromGateRight-dense.ply';
// const denseMapUrl = 'https://api.immersal.com/fcgi?14';


export async function getLocalisationData() {
    // Get map and GeoLocations from GeoPose provider
    const refRelativeEcef = await getReferenceImage(referenceImageUrl)
        .then(image => getReferenceImageEcef(image))

    const mapEcef = await getMapEcef(refRelativeEcef.map);
    const refEcef = getAbsoluteEcef(mapEcef, [refRelativeEcef.px, refRelativeEcef.py, refRelativeEcef.pz]);

    const mapPose = ecef_to_geo(...mapEcef);
    const refPose = ecef_to_geo(...refEcef);

    return [denseMapUrl, mapPose, refPose];     // &refRelativeEcef.map
}

function getReferenceImage() {
    return fetch(referenceImageUrl)
        .then((response) => response.arrayBuffer())
        .then((buffer) => btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')));
}

function getReferenceImageEcef(image) {
    referenceLocalisationParameters.b64 = image;

    if (local === true) {
        return Promise.resolve({
            "error": "none",
            "success": true,
            "map": 8058,
            "px": 11.011953353881836,
            "py": 1.3616589307785034,
            "pz": 34.436748504638672,
            "r00": 0.1640438437461853,
            "r01": 0.97426104545593262,
            "r02": -0.1546124666929245,
            "r10": 0.8057713508605957,
            "r11": -0.041925031691789627,
            "r12": 0.5907408595085144,
            "r20": 0.56905370950698853,
            "r21": -0.22148971259593964,
            "r22": -0.79190921783447266
        });
    } else {
        return fetch(referenceLocalisationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(referenceLocalisationParameters)
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => data)
            .catch(error => {
                console.error('Error:', error);
            });
    }
}

function getMapEcef(mapId) {
    mapEcefParameters.id = mapId;

    if (local === true) {
        return Promise.resolve([4172627.6566282497, 638225.67631673731, 4766293.0519185094,
            -0.61784237623214722, 0.3628784716129303, 0.69756001234054565,
            -0.030869480222463608, 0.87526208162307739, -0.48266276717185974,
            -0.78569579124450684, -0.3197428286075592, -0.52957218885421753,
            1.0063717365264893]
        );
    } else {
        return fetch(mapEcefUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(mapEcefParameters)
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(json => json.ecef);
    }
}

function getAbsoluteEcef(reference, relative) {
    const mp = [-relative[1], -relative[0], relative[2], 1.0];
    const s = reference[12];
    const m = [[s * reference[3], s * reference[6], s * reference[9], 0.0],
        [s * reference[4], s * reference[7], s * reference[10], 0.0],
        [s * reference[5], s * reference[8], s * reference[11], 0.0],
        [reference[0], reference[1], reference[2], 1.0]];
    /* eslint-disable no-undef */
    return nj.dot(mp, m).selection.data;
}
