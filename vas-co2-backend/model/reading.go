package model

import (
	"github.com/jinzhu/gorm"
	uuid "github.com/satori/go.uuid"
	"time"
)

type Reading struct {
	gorm.Model
	Value     int8 `gorm:"type:int;not null"`
	Time      time.Time
	SensorOid uuid.UUID `gorm:"index"`
}
