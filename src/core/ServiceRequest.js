/*
    Main access point to the spatial discovery services of the Open Spatial Computing Platform.
*/

// Allows to return local JSON response
const local = false;


export function requestServices(countryCode, h3Index) {
    if (local) {
        return localRequest();
    } else {
        return serverRequest(countryCode, h3Index);
    }
}

function serverRequest(countryCode, h3Index) {
    if (countryCode === undefined || countryCode === ''
            || h3Index === undefined || countryCode === '') {
        throw new Error(`Check parameters: ${countryCode} ${h3Index}`);
    }

    return fetch(`https://dev1.ssd.oscp.cloudpose.io:7000/${countryCode}/ssrs?h3Index=${h3Index}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            }

            throw new Error(`Server access failed: ${response.statusText}`);
        })
        .then((data) => {
            return data;
        })
        .catch(error => {
            console.log(error);
        });
}

export function localRequest() {
    return  [{"id":"e32ca955c776ecec","type":"ssr","services":[{"type":"geopose","url":"http://geopose.geo1.example.com"},{"type":"content-discovery","url":"http://content-discovery.geo1.example.com"}],"geometry":{"type":"Polygon","coordinates":[[[-97.74437427520752,30.27830380593801],[-97.73051261901855,30.28590104010804],[-97.74703502655028,30.291014944499693],[-97.74437427520752,30.27830380593801]]]},"provider":"oscptest","timestamp":"2020-08-12T05:08:10.824Z"},{"id":"e0f25f91555e0fba","type":"ssr","services":[{"type":"geopose","url":"http://geopose.geo1.example.com"},{"type":"content-discovery","url":"http://content-discovery.geo1.example.com"}],"geometry":{"type":"Polygon","coordinates":[[[-97.73042678833008,30.283677520264256],[-97.73102760314941,30.28193572785586],[-97.72969722747803,30.2815280698483],[-97.72901058197021,30.28356634294924],[-97.73042678833008,30.283677520264256]]]},"provider":"oscptest","timestamp":"2020-08-12T05:08:36.344Z"}];
}
