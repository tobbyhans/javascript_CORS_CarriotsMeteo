JavaScript_CORS_CarriotsMeteo
=============================

An example of how to do CORS requests to Carriots.
A complete client-only frontend display using our weather station (Madrid-Spain). 
http://demo.carriots.com/meteocarriots/index.html

You can play with the data using the Carriots API and an open data feed.

There is a device available at Carriots where data streams are sent and can be used for your own purposes. Here are the details:

    Device ID developer: madrid@carriotsMeteo.carriotsMeteo
    Read-only apikey: a3dd2a33c514de9ed0ad1e8e751a82a8c699916858b1ad0a6e2425d71cce48ea
    REST request URL (GET stream list):
    http://api.carriots.com/devices/madrid@carriotsMeteo.carriotsMeteo/streams/

How to query Carriots API to request data is detailed in our documentation page https://www.carriots.com/documentation/api/data_management#s-list and in this example.

##Note

In this example we are using a template from Theme Forest. http://themeforest.net/

If you want to use it, please visit the website and purchase this template.


## Preview and regression tests

Serve the frontend with `python3 -m http.server 8000 --directory carriotsMeteo`.
Run the dependency-free tests with Node.js 18 or newer:

```sh
node --test tests/weather.test.cjs
```

The weather service must support HTTPS and allow the page origin and
`carriots.apiKey` header through CORS. There is no insecure HTTP fallback.
Google Maps depends on the provider's access/key configuration; map failure
no longer prevents the weather request. External services have not been verified live.
Only the public read-only demo key belongs in this browser client; private or
write-capable credentials require a server-side integration.
Charts cover the last 24 hours relative to the latest received reading and
preserve negative temperatures. Short feeds are supported; invalid or empty
feeds display an error and clear stale readings. The ThemeForest notice still applies.
