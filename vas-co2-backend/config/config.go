package config

import (
	"fmt"
	"log"
	"os"
)

const (
	vicinityAgentUrl  = "http://localhost:9997"
	vicinityAdapterID = "d6870df4-a848-4793-8d75-dccc82bd036d"
	vicinityVASOid    = "54a6f0d9-d3bb-40d3-a129-17f6a9f6aea7"

	serverPort = "9090"

	databasePort = "5432"
	databaseHost = "localhost"
)

type VicinityConfig struct {
	AgentUrl  string
	AdapterID string
	Oid       string
}

type ServerConfig struct {
	Port string
}

type DBConfig struct {
	Host string
	Port string
	User string
	Name string
	Pass string
}

type SMSConfig struct {
	User       string
	Key        string
	Sender     string
	Recipients []string
}

type Config struct {
	Vicinity *VicinityConfig
	Server   *ServerConfig
	Database *DBConfig
}

func (dbc *DBConfig) String() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s dbname=%s password=%s sslmode=disable",
		dbc.Host, dbc.Port, dbc.User, dbc.Name, dbc.Pass,
	)
}

// New returns a new Config struct
func New() *Config {
	return &Config{
		Vicinity: &VicinityConfig{
			AgentUrl:  getEnv("VICINITY_AGENT_URL", vicinityAgentUrl),
			AdapterID: getEnv("VICINITY_ADAPTER_ID", vicinityAdapterID),
			Oid:       getEnv("VICINITY_VAS_OID", vicinityVASOid),
		},
		Server: &ServerConfig{
			Port: getEnv("SERVER_PORT", serverPort),
		},
		Database: &DBConfig{
			Host: getEnv("DB_HOST", databaseHost),
			Port: getEnv("DB_PORT", databasePort),
			User: getEnv("DB_USER", ""),
			Name: getEnv("DB_NAME", ""),
			Pass: getEnv("DB_PASS", ""),
		},
	}
}

// Simple helper function to read an environment or return a default value
func getEnv(key string, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}

	if isEmpty(defaultVal) {
		log.Printf("environment variable %v is empty\n", key)
		os.Exit(0)
	}

	return defaultVal
}

func isEmpty(val string) bool {
	return val == ""
}
