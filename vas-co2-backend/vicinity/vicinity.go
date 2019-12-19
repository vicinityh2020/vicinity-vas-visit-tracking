package vicinity

import (
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"
	uuid "github.com/satori/go.uuid"
	"log"
	"strings"
	"time"
	"vicinity-tinymesh-door-ui/vas-co2-backend/config"
	"vicinity-tinymesh-door-ui/vas-co2-backend/model"
)

type Client struct {
	config *config.VicinityConfig
	db     *gorm.DB
	td     *gin.H
}

type EventData struct {
	Value      bool   `json:"value"`
	TimeString string `json:"timestamp" binding:"required"`
}

type chartData struct {
	T     time.Time
	Value int
}

type dateRange struct {
	T time.Time
}

type sensor struct {
	Name string `json:"name"`
	Oid  string `json:"oid"`
}

const (
	coreService = "core:Service"
	version     = "1.0.0"
)

type VAS struct {
	Oid        string        `json:"oid"`
	Name       string        `json:"name"`
	Type       string        `json:"type"`
	Version    string        `json:"version"`
	Keywords   []string      `json:"keywords"`
	Properties []interface{} `json:"properties"`
	Events     []interface{} `json:"events"`
	Actions    []interface{} `json:"actions"`
}

func New(vicinityConfig *config.VicinityConfig, db *gorm.DB) *Client {
	return &Client{
		config: vicinityConfig,
		db:     db,
		td:     nil,
	}
}

// creates the VAS portion of a thing-description
func (c *Client) makeVAS(oid, name, version string, kw []string) VAS {
	return VAS{
		Oid:      oid,
		Name:     name,
		Type:     coreService,
		Version:  version,
		Keywords: kw,
		// rest is empty
		Properties: []interface{}{},
		Events:     []interface{}{},
		Actions:    []interface{}{},
	}
}

// returns the full thing description JSON
func (c *Client) GetThingDescription() *gin.H {
	if c.td == nil {

		var vasGroup []VAS
		vasGroup = append(vasGroup, c.makeVAS(c.config.Oid, "TinyMesh VAS - CWi Door Sensor UI", version, []string{"door", "ui"}))

		c.td = &gin.H{
			"adapter-id":         c.config.AdapterID,
			"thing-descriptions": vasGroup,
		}
	}

	return c.td
}

// Returns all the dates with recorded data (at least 1 data point must exist)
// used in enabling date picker dates
func (c *Client) GetDateRange(oid uuid.UUID) *gin.H {
	var result []dateRange
	c.db.Raw(
		`SELECT DATE_TRUNC('day', time) as t
		FROM readings r 
		WHERE r.sensor_oid = ?
		GROUP BY t
		ORDER BY t
		ASC`, oid).Scan(&result)

	var days []time.Time

	for _, day := range result {
		days = append(days, day.T)
	}

	return &gin.H{
		"days": days,
	}
}

// Get all readings at a specified date
func (c *Client) GetReadingsByDate(oid uuid.UUID, dateString string) (*gin.H, error) {
	var labels []string
	var data []int
	var result []chartData

	c.db.Raw(
		`SELECT DATE_TRUNC('hour', time) as t, 
		(COUNT(value) / 2) as value 
		FROM readings r 
		WHERE r.time::date = ? 
		AND r.sensor_oid = ?
		GROUP BY t 
		ORDER BY t
		ASC`, dateString, oid).Scan(&result)

	//c.db.Raw(
	//	`select time as t, value
	//	FROM readings r
	//	WHERE r.time::date = ?
	//	AND r.sensor_oid = ?
	//	ORDER BY r.time ASC`, dateString, oid).Scan(&result)

	for _, row := range result {
		labels = append(labels, row.T.Format("15:04"))
		data = append(data, row.Value)
	}

	readings := &gin.H{
		"labels": labels,
		"data":   data,
	}

	return readings, nil
}

// Stores the event data in the database relating to a sensor.
// If the sensor is not present the function creates a new one.
func (c *Client) StoreEventData(e EventData, oid uuid.UUID, eid string) error {
	var sensor model.Sensor
	timestampWithoutTzVITIR := "2006-01-02 15:04:05" // vitir
	timestampWithoutTzTmp := "2006-01-02T15:04:05"   // TinyM
	timestampWithTZ := "2006-01-02 15:04:05Z07:00"

	t, err := time.Parse(timestampWithTZ, e.TimeString)

	if err != nil {
		err = nil
		t, err = time.Parse(timestampWithoutTzTmp, e.TimeString)
		if err != nil {
			err = nil
			t, err = time.Parse(timestampWithoutTzVITIR, e.TimeString)
			if err != nil {
				fmt.Println(err)
			}
		}
	}

	fmt.Println(t.String())

	// create new sensor if no sensor corresponding to the oid is in the database
	c.db.Where(model.Sensor{Oid: oid}).FirstOrCreate(&sensor, model.Sensor{Oid: oid, Eid: eid})

	if c.db.Error != nil {
		log.Println(c.db.Error.Error())
		return errors.New(fmt.Sprintf("could not fetch/create oid %v", oid.String()))
	}

	var val int8 = 0
	if e.Value {
		val = 1
	}

	c.db.Create(&model.Reading{Value: val, Time: t, SensorOid: sensor.Oid})

	if c.db.Error != nil {
		log.Println(c.db.Error.Error())
		return errors.New(fmt.Sprintf("could not store event reading of oid: %v", oid.String()))
	}

	return nil
}

// Gets all sensors in the database. The frontend app relies on this method the following way:
// For each sensor returned by this method -> call GetDateRange
func (c *Client) GetSensors() (*gin.H, bool) {
	var sensors []model.Sensor
	var responseSensors []*sensor

	c.db.Order("oid asc").Find(&sensors)

	for _, v := range sensors {
		responseSensors = append(responseSensors, &sensor{Name: strings.Split(v.Eid, "-")[0], Oid: v.Oid.String()})
	}

	result := &gin.H{"sensors": responseSensors}

	return result, len(sensors) > 0
}

// *DEPRECATED* replaced by GetReadingsByDate
func (c *Client) GetReadings(oid uuid.UUID) (*gin.H, error) {
	var result []chartData
	var labels []string
	var data []int

	lowerTime := time.Now().Add(time.Duration(-12) * time.Hour)
	upperTime := time.Now()

	c.db.Raw(
		`SELECT DATE_TRUNC('hour', time) as t, 
		ROUND(AVG(value), 0) as value 
		FROM readings r 
		WHERE r.time BETWEEN ? AND ?
		AND r.sensor_oid = ? 
		GROUP BY t 
		ORDER BY t
		ASC`, lowerTime, upperTime, oid).Scan(&result)

	if c.db.Error != nil {
		log.Println(c.db.Error.Error())
		return nil, errors.New("could not execute select query")
	}

	for _, row := range result {
		labels = append(labels, row.T.Format("15:04"))
		data = append(data, row.Value)
	}

	readings := &gin.H{
		"labels": labels,
		"data":   data,
	}

	return readings, nil
}
