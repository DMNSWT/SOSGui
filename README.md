SOSGui
======
Partially funded by NASA grant.  Initially developed at Denver Museum of Nature & Science (DMNS) with work provided by independant contractor Andrew Strickland as an open-source project for the SOS community.  DMNS does not provide any support for this product and encourages community development to grow its capabilities as Science on a Sphere evolves.

If you wish to contribute to the code-base, please make Fork the repo and submit changes for review.

Intention of this product is to provide a platform independent solution for control, allow easy modification for sites, allow site-specific management of the NOAA SOS catalog (custom keywords, organization, user management, etc.), allow for multi-lingual versions and to stay up with current and cutting edge web technologies.


Technologies used - see list-o-tech.md

Installation dependencies:
- must have Node 10 with NPM (see http://nodejs.org/download/)
- once this is cloned to SOS computer (as SOS user), go into SOSGui directory and run: npm install
- create in SOSGui directory a config.json file using the following as an example:
 {
        "sosTelnet":{
            "host": "127.0.0.1",
            "port": 2468
        },
        "controlInterface":{
            "server":{
                "port": 3500
            }
        },
        "cmsInterface":{
            "server":{
                "bind": "0.0.0.0",
                "port": 3510
            },
            "library": [
                "/shared/sos/media",
                "/shared/sos/rt",
                "/home/sosdemo/sosrc"
            ],
            "playlistFsLocation": "/ml-sos-cms-data/playlists"
        },
        "database":{
            "fsLocation": "/ml-sos-cms-data/database"
        }
    }

NOTE: 
- "library" locations can be modified if playlist.sos files are stored elsewhere
- "playlistFsLocation" location can be different.  You should manually make this directory location.
- "fsLocation" location can be different.  You should manually make this directory location.

After that run at the command-line (as SOS):

    node index.js

To access, use any browser (tested with Chrome):    
- Presenter GUI: http://<sos-computer>:3500
- CMS GUI: http://<sos-computer>:3510
