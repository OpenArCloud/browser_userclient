**Sample OSCP Client**

Sample client for _Open Spatial Computing Platform_ (OSCP) spatial service and 
spatial content discovery, and it's usage for an Augmented Reality experience.

The spatial service discovery (SSD) allows finding spatial services around the 
current location of the device. One of such services could be a GeoPose service, 
providing the GeoPose of the current device.

The spatial content discovery (SCD) can be used to find geolocated content 
available around the current location of the device. 

While this application is written using svelte, the main functional elements
will also be available as web components, directly usable in many other web 
frameworks and plain HTML pages. The aim is, that it's possible to use these
components in as many development environments as possible.

The workflow for accessing the services presented here is as follows:
- Request current location of device (coarse location is fine)
- Determine H3 index (https://eng.uber.com/h3/)
- Provide this location to SSD to discover the available services
- When an appropriate services are available, select the most appropriate 
(likely depending on current user context)
- Provide location data from this service to SCD to discover available 
geolocated content
- When appropriate content for the current context is available, download
and position it in the AR session
- Start AR session

What's available so far is in a very early state, missing most of the planned
functionality. Feedback, suggestions and (any sort of) contributions are very welcome.

To run this app locally, you need to copy SSL certificates to the root folder
of the project, named localhost.key and localhost.cert. The information on
this site might be halpful to generate these keys: 
https://matthewhoelter.com/2019/10/21/how-to-setup-https-on-your-local-development-environment-localhost-in-minutes.html

The 3D model used for the demo is from Kokutochi Museum, downloaded from Google Poly:
       https://poly.google.com/view/fowwHvCBUmB