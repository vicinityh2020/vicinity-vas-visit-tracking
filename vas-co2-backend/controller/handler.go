package controller

import (
	"github.com/gin-gonic/gin"
	uuid "github.com/satori/go.uuid"
	"log"
	"net/http"
	"vicinity-tinymesh-door-ui/vas-co2-backend/vicinity"
)

func (server *Server) getObjects(c *gin.Context) {
	sensors, exist := server.vicinity.GetSensors()
	if !exist {
		log.Println("no sensors found")
		c.AbortWithStatus(http.StatusNotFound)
		return
	}

	c.JSON(http.StatusOK, sensors)
}

func (server *Server) vicinityEventHandler(c *gin.Context) {
	oid, exists := c.Params.Get("oid")
	if !exists {
		log.Println("oid param is required")
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	eid, exists := c.Params.Get("eid")
	if !exists {
		log.Println("eid param is required")
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	id, err := uuid.FromString(oid)
	if err != nil {
		log.Println(err.Error())
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	var event vicinity.EventData
	if err := c.BindJSON(&event); err != nil {
		log.Println(err.Error())
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	if err := server.vicinity.StoreEventData(event, id, eid); err != nil {
		log.Println(err.Error())
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, nil)
}

func (server *Server) handleTD(c *gin.Context) {
	c.JSON(http.StatusOK, server.vicinity.GetThingDescription())
}

func (server *Server) getDateRange(c *gin.Context) {

	oid, exists := c.Params.Get("oid")
	if !exists {
		log.Println("oid parameter is required")
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	id, err := uuid.FromString(oid)
	if err != nil {
		log.Println(err.Error())
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	dateRange := server.vicinity.GetDateRange(id)
	c.JSON(http.StatusOK, dateRange)
}

func (server *Server) getObjectReadingsByDate(c *gin.Context) {

	oid, exists := c.Params.Get("oid")
	if !exists {
		log.Println("oid parameter is required")
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	date, exists := c.Params.Get("date")
	if !exists {
		log.Println("date parameter is required")
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	id, err := uuid.FromString(oid)
	if err != nil {
		log.Println(err.Error())
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	readings, err := server.vicinity.GetReadingsByDate(id, date)
	if err != nil {
		log.Println(err.Error())
		c.AbortWithStatus(http.StatusNotFound)
		return
	}

	c.JSON(http.StatusOK, readings)
}

// *DEPRECATED* replaced by getObjectReadingsByDate
func (server *Server) getObjectReadings(c *gin.Context) {

	oid, exists := c.Params.Get("oid")
	if !exists {
		log.Println("oid parameter is required")
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	id, err := uuid.FromString(oid)
	if err != nil {
		log.Println(err.Error())
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	readings, err := server.vicinity.GetReadings(id)
	if err != nil {
		log.Println(err.Error())
		c.AbortWithStatus(http.StatusNotFound)
		return
	}

	c.JSON(http.StatusOK, readings)
}
