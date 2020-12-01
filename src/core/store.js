/*
  (c) 2020 Open AR Cloud
  This code is licensed under MIT license (see LICENSE.md for details)
*/

import { writable, readable } from 'svelte/store';


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

// Map defaults
export const MIN_H3RESOLUTION = readable(0, () => () => {});
export const DEFAULT_H3RESOLUTION = readable(7, () => () => {});
export const MAX_H3RESOLUTION = readable(15, () => () => {});
export const H3RESOLUTION_AUTO = readable(-1, () => () => {});
export const DISPLAY_LATLON = readable('latlon', () => () => {});
export const DISPLAY_H3 = readable('h3', () => () => {});
