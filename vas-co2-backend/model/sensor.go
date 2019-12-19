package model

import (
	_ "database/sql"
	uuid "github.com/satori/go.uuid"
)

type Sensor struct {
	Oid      uuid.UUID `gorm:"primary_key"`
	Eid      string    `gorm:"type:varchar(100)"`
	Readings []Reading `gorm:"foreignkey:SensorOid"`
}
