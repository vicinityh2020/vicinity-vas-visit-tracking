package main

import (
	"fmt"
	"github.com/jinzhu/gorm"
	"github.com/joho/godotenv"
	"log"
	"math/rand"
	"os"
	"os/signal"
	"path"
	"syscall"
	"time"
	"vicinity-tinymesh-door-ui/vas-co2-backend/config"
	"vicinity-tinymesh-door-ui/vas-co2-backend/controller"
	"vicinity-tinymesh-door-ui/vas-co2-backend/database"
	"vicinity-tinymesh-door-ui/vas-co2-backend/model"
	"vicinity-tinymesh-door-ui/vas-co2-backend/vicinity"
)

type Environment struct {
	Config  *config.Config
	DB      *gorm.DB
	LogPath string
}

var app Environment

func (app *Environment) init() {
	// loads values from .env into the system

	app.LogPath = path.Join(".", "logs")
	if err := os.MkdirAll(app.LogPath, os.ModePerm); err != nil {
		log.Fatal("could not create path:", app.LogPath)
	}

	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	if err := godotenv.Load(); err != nil {
		log.Fatalln("No .env file found")
	}

	app.Config = config.New()
}

func (app *Environment) newLogWriter(logName string) *os.File {
	l, err := os.OpenFile(path.Join(app.LogPath, fmt.Sprintf("%s-%s.log", logName, time.Now().Format("2006-01-02"))), os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)

	if err != nil {
		log.Fatal("Could not create mainLogger logfile:", err.Error())
	}

	return l
}

func (app *Environment) run() {
	rand.Seed(time.Now().UnixNano())
	// Main logger
	mainLogger := app.newLogWriter("adapter")
	defer mainLogger.Close()

	// Gin logger
	ginLogger := app.newLogWriter("gin")
	defer ginLogger.Close()

	// DB logger
	dbLogger := app.newLogWriter("gorm")
	defer dbLogger.Close()

	log.SetOutput(mainLogger)

	// Database
	app.DB = database.New(app.Config.Database, dbLogger)
	defer app.DB.Close()

	app.DB = app.DB.AutoMigrate(&model.Sensor{}, &model.Reading{})
	if app.DB.Error != nil {
		fmt.Print("error migrating> ", app.DB.Error)
	}
	app.DB.Model(&model.Reading{}).AddForeignKey("sensor_oid", "sensors(oid)", "CASCADE", "RESTRICT")

	// VICINITY
	vas := vicinity.New(app.Config.Vicinity, app.DB)

	// Controller
	server := controller.New(app.Config.Server, app.DB, vas, ginLogger)
	go server.Listen()
	defer server.Shutdown()

	// INT handler
	quit := make(chan os.Signal, 1)
	defer close(quit)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit

	log.Println("VAS shutting down...")
}

// init is invoked before main automatically
func init() {
	app.init()
}

func main() {
	app.run()
}
