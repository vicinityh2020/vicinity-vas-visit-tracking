# VAS TinyMesh Door UI

Adapter used to connect the Value-Added Services and expose them to the VICINITY neighborhood.

## Prerequisites

Before running this adapter, ensure that you have installed the following:

- Go 1.12+
    ###### Ubuntu 18.04: <br>
    `$ sudo snap install go --classic`<br>

- PostgreSQL 10.10+
    ###### Ubuntu 18.04:
    `$ sudo apt-get install postgresql` <br>
    
- npm 6.9.0+
    ###### Ubuntu 18.04:
    `$ sudo apt-get install npm` <br>

- Configured and working [VICINITY Client Node](https://github.com/vicinityh2020/vicinity-agent#vicinity-client-node)

## Build

#### Go Backend

1. Clone this repository using `git clone` <br>

2. `cd` into the [vas-co2-backend](vas-co2-backend) folder

###### Ubuntu 18.04:
`$ go build main.go`

###### OSX or Windows (for Linux 64-bit):
`$ GOOS=linux GOARCH=amd64 go build main.go`

#### ReactJS App
1. Follow the general `npm build` procedure described in the README of `vas-co2-frontend`

#### Nginx Server
2. Install and enable Nginx
3. Create a site config inside the `/etc/nginx/sites-available`
4. Configure the redirect settings to serve static files from your frontend `build` folder.
5. Configure the proxy settings to communicate with the backend API.

Here is an example [Nginx server config](samples/example-nginx.conf) file.

## Configuration

#### Project structure
Make sure to implement the following project structure:
 1. Create an empty folder called `logs` in the same directory
 2. Create an empty file with executable permissions called `start.sh`
 3. (Optionally) create an environment file called `.env`  
 
 The final project structure should resemble:
 
vicinity-tinymesh-door-ui/ <br>
├── <strong>logs/</strong> <br>
├── <strong>.env</strong> <br>
├── <strong>start.sh</strong> <br>
└── vas `// built go executable` <br>

Credentials and endpoints can be configured using the following environment variables (optionally through a .env file).

```
VICINITY_AGENT_URL=http://localhost:9997
VICINITY_VAS_OID=<UUID4>
VICINITY_ADAPTER_ID=<UUID4>
VICINITY_KPI_KEY=

SERVER_PORT=9090

DB_HOST=localhost
DB_PORT=5432
DB_USER=
DB_NAME=
DB_PASS=

KEYSMS_USER=
KEYSMS_API_KEY=
```

`start.sh` serves as a wrapper for the go executable. This is necessary for systemd. Inside of `start.sh` have the following code:

```
#!/bin/sh -
./vas
```

## Run (systemd)
Example [service](samples/ui-vas.service) file.
