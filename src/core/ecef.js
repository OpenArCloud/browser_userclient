// from http://danceswithcode.net/engineeringnotes/geodetic_to_ecef/geodetic_to_ecef.html

const a = 6378137.0;              //WGS-84 semi-major axis
const e2 = 6.6943799901377997e-3;  //WGS-84 first eccentricity squared
const a1 = 4.2697672707157535e+4;  //a1 = a*e2
const a2 = 1.8230912546075455e+9;  //a2 = a1*a1
const a3 = 1.4291722289812413e+2;  //a3 = a1*e2/2
const a4 = 4.5577281365188637e+9;  //a4 = 2.5*a2
const a5 = 4.2840589930055659e+4;  //a5 = a1+a3
const a6 = 9.9330562000986220e-1;  //a6 = 1-e2
let zp, w2, w, r2, r, s2, c2, s, c, ss;
let g, rg, rf, u, v, m, f, p;
let n;

//Convert Earth-Centered-Earth-Fixed (ECEF) to lat, Lon, Altitude
//Input is a three element array containing x, y, z in meters
//Returned array contains lat and lon in radians, and altitude in meters
export function ecef_to_geo(x, y, z) {
    let geo = [];   //Results go here (Lat, Lon, Altitude)

    zp = Math.abs(z);
    w2 = x * x + y * y;
    w = Math.sqrt(w2);
    r2 = w2 + z * z;
    r = Math.sqrt(r2);

    geo[1] = Math.atan2(y, x);       //Lon (final)

    s2 = z * z / r2;
    c2 = w2 / r2;
    u = a2 / r;
    v = a3 - a4 / r;

    if (c2 > 0.3) {
        s = (zp / r) * (1.0 + c2 * (a1 + u + s2 * v) / r);
        geo[0] = Math.asin(s);      //Lat
        ss = s * s;
        c = Math.sqrt(1.0 - ss);
    } else {
        c = (w / r) * (1.0 - s2 * (a5 - u - c2 * v) / r);
        geo[0] = Math.acos(c);      //Lat
        ss = 1.0 - c * c;
        s = Math.sqrt(ss);
    }

    g = 1.0 - e2 * ss;
    rg = a / Math.sqrt(g);
    rf = a6 * rg;
    u = w - rg * c;
    v = zp - rf * s;
    f = c * u + s * v;
    m = c * v - s * u;
    p = m / (rf / g + f);

    geo[0] = geo[0] + p;      //Lat
    geo[2] = f + m * p / 2.0;     //Altitude

    if (z < 0.0) {
        geo[0] *= -1.0;     //Lat
    }

    geo[0] = geo[0] * 180 / Math.PI;
    geo[1] = geo[1] * 180 / Math.PI;

    return (geo);    //Return Lat, Lon, Altitude in that order
}

//Convert Lat, Lon, Altitude to Earth-Centered-Earth-Fixed (ECEF)
//Input is a three element array containing lat, lon (rads) and alt (m)
//Returned array contains x, y, z in meters
export function geo_to_ecef(lat, lon, alt) {
    const ecef = [];  //Results go here (x, y, z)

    n = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
    ecef[0] = (n + alt) * Math.cos(lat) * Math.cos(lon);    //ECEF x
    ecef[1] = (n + alt) * Math.cos(lat) * Math.sin(lon);    //ECEF y
    ecef[2] = (n * (1 - e2) + alt) * Math.sin(lat);          //ECEF z

    return (ecef);     //Return x, y, z in ECEF
}