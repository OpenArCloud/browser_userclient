import { writable } from 'svelte/store';


// Location properties
export const lat = writable(0);
export const lon = writable(0);

export const countryCode = writable('');
export const h3Index = writable('');


// GeoPose Services properties
export const selectedGeoposeService = writable({
    id: null,
    isRunning: false
});


// Content Services properties
export const selectedContentService = writable({
    id: null,
    isRunning: false
})