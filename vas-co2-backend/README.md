## Components

#### Config

Contains a struct datatype containing the environment variables. The reference is included in all the other major components.

#### Controller

[controller.go](controller/controller.go) sets up the router for all incoming API requests inside the `setupRouter()` function.

[handler.go](controller/handler.go) contains callbacks that handle each incoming API request.

#### Database

[db.go](database/db.go) establishes a DB connection regulated by the `dialect` constant (default: `postgres`)

#### Model
[sensor.go](model/sensor.go) struct for a door sensor

[reading.go](model/reading.go) struct for a door event 

relation: sensor 0..* reading

#### Vicinity
[vicinity.go](vicinity/vicinity.go) creates the TD and services all requests involving the sensors/readings. The various methods are called from within the [../controller/handler.go](controller/handler.go) file of the Controller.