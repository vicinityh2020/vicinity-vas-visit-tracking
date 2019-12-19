import React, {useEffect, useState} from 'react';
import {Chart, Line} from 'react-chartjs-2';

import {Button, ButtonGroup, ButtonToolbar, InputGroup, FormControl} from 'react-bootstrap';
import PropTypes from 'prop-types';

import axios from 'axios';

import DatePicker from 'react-datepicker';
import moment from 'moment';
import tz from 'moment-timezone';

import {roomMapping} from './RoomNameMapping'


const MAX_X_LABELS = 24;

class DateInput extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <InputGroup className="mb-3">
                <InputGroup.Prepend>
                    <InputGroup.Text id={'1'}>{'Date'}</InputGroup.Text>
                </InputGroup.Prepend>
                <FormControl
                    onClick={this.props.onClick}
                    onChange={this.props.onChange}
                    value={this.props.value}
                />
                <InputGroup.Append>
                    <Button>Refresh</Button>
                </InputGroup.Append>
            </InputGroup>
        );
    }
}

const data = {
    labels: [],
    datasets: [
        {
            label: 'No data for the selected date',
            fill: true,
            lineTension: 0.1,
            backgroundColor: 'rgba(75,192,192,0.4)',
            borderColor: 'rgba(75,192,192,1)',
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: 'rgba(75,192,192,1)',
            pointBackgroundColor: '#fff',
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: 'rgba(75,192,192,1)',
            pointHoverBorderColor: 'rgba(220,220,220,1)',
            pointHoverBorderWidth: 2,
            pointRadius: 1,
            pointHitRadius: 10,
            data: []
        }
    ]
};

function repeatHorizontal(name, y, length, color) {
    return {
        label: name,
        fill: false,
        lineTension: 0.1,
        backgroundColor: color,
        borderColor: color,
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: color,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 1,
        pointHoverRadius: 0,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: color,
        pointHoverBorderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 0,
        data: new Array(length).fill(y),
    };
}

function setYAxis(name) {
    return {
        scales: {
            yAxes: [{
                ticks: {
                    userCallback: function (item) {
                        return `${item} ${name}`;
                    },
                    padding: 0,
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    stepSize: 10
                }
            }],
            xAxes: [{
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: MAX_X_LABELS
                }
            }]
        },
        animation: {
            duration: 0
        }
    };
}

LineChartCO2.propTypes = {
    sensor: PropTypes.object.isRequired,
};

function isEmpty(v) {
    return (typeof (v) === 'undefined' || v == null);
}

export default function LineChartCO2(props) {

    const [dataDoorVisits, setDataCO2] = useState(data);
    const [toggle, setToggle] = useState(false);
    const [date, setDate] = useState(moment().tz('Europe/Oslo').toDate());
    const [dateRange, setDateRange] = useState([moment().tz('Europe/Oslo')]);
    const [warningPanel, toggleWarning] = useState(false);

    Chart.pluginService.register({
        afterUpdate: function (chart) {
            var xScale = chart.scales['x-axis-0'];
            if (xScale.options.ticks.maxTicksLimit) {
                // store the original maxTicksLimit
                xScale.options.ticks._maxTicksLimit = xScale.options.ticks.maxTicksLimit;
                // let chart.js draw the first and last label
                xScale.options.ticks.maxTicksLimit = (xScale.ticks.length % xScale.options.ticks._maxTicksLimit === 0) ? 1 : 2;

                var originalXScaleDraw = xScale.draw;
                xScale.draw = function () {
                    originalXScaleDraw.apply(this, arguments);

                    var xScale = chart.scales['x-axis-0'];
                    if (xScale.options.ticks.maxTicksLimit) {
                        var helpers = Chart.helpers;

                        var tickFontColor = helpers.getValueOrDefault(xScale.options.ticks.fontColor, Chart.defaults.global.defaultFontColor);
                        var tickFontSize = helpers.getValueOrDefault(xScale.options.ticks.fontSize, Chart.defaults.global.defaultFontSize);
                        var tickFontStyle = helpers.getValueOrDefault(xScale.options.ticks.fontStyle, Chart.defaults.global.defaultFontStyle);
                        var tickFontFamily = helpers.getValueOrDefault(xScale.options.ticks.fontFamily, Chart.defaults.global.defaultFontFamily);
                        var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);
                        var tl = xScale.options.gridLines.tickMarkLength;

                        var isRotated = xScale.labelRotation !== 0;
                        var yTickStart = xScale.top;
                        var yTickEnd = xScale.top + tl;
                        var chartArea = chart.chartArea;

                        // use the saved ticks
                        var maxTicks = xScale.options.ticks._maxTicksLimit - 1;
                        var ticksPerVisibleTick = xScale.ticks.length / maxTicks;

                        // chart.js uses an integral skipRatio - this causes all the fractional ticks to be accounted for between the last 2 labels
                        // we use a fractional skipRatio
                        var ticksCovered = 0;
                        helpers.each(xScale.ticks, function (label, index) {
                            if (index < ticksCovered)
                                return;

                            ticksCovered += ticksPerVisibleTick;

                            // chart.js has already drawn these 2
                            if (index === 0 || index === (xScale.ticks.length - 1))
                                return;

                            // copy of chart.js code
                            var xLineValue = this.getPixelForTick(index);
                            var xLabelValue = this.getPixelForTick(index, this.options.gridLines.offsetGridLines);

                            if (this.options.gridLines.display) {
                                this.ctx.lineWidth = this.options.gridLines.lineWidth;
                                this.ctx.strokeStyle = this.options.gridLines.color;

                                xLineValue += helpers.aliasPixel(this.ctx.lineWidth);

                                // Draw the label area
                                this.ctx.beginPath();

                                if (this.options.gridLines.drawTicks) {
                                    this.ctx.moveTo(xLineValue, yTickStart);
                                    this.ctx.lineTo(xLineValue, yTickEnd);
                                }

                                // Draw the chart area
                                if (this.options.gridLines.drawOnChartArea) {
                                    this.ctx.moveTo(xLineValue, chartArea.top);
                                    this.ctx.lineTo(xLineValue, chartArea.bottom);
                                }

                                // Need to stroke in the loop because we are potentially changing line widths & colours
                                this.ctx.stroke();
                            }

                            if (this.options.ticks.display) {
                                this.ctx.save();
                                this.ctx.translate(xLabelValue + this.options.ticks.labelOffset, (isRotated) ? this.top + 12 : this.options.position === 'top' ? this.bottom - tl : this.top + tl);
                                this.ctx.rotate(helpers.toRadians(this.labelRotation) * -1);
                                this.ctx.font = tickLabelFont;
                                this.ctx.textAlign = (isRotated) ? 'right' : 'center';
                                this.ctx.textBaseline = (isRotated) ? 'middle' : this.options.position === 'top' ? 'bottom' : 'top';
                                this.ctx.fillText(label, 0, 0);
                                this.ctx.restore();
                            }
                        }, xScale);
                    }
                };
            }
        },
    });

    useEffect(() => {
        const fetchData = async () => {

            const dateString = moment(date).tz('Europe/Oslo').format('YYYY-MM-DD');

            const options = {
                method: 'get',
                url: `/api/objects/${props.sensor.oid}/date/${dateString}`,
                time: 3000
            };

            let response;
            try {
                response = await axios(options);
            } catch (e) {
                // alert('Unable to connect to backend server. Make sure the backend server is running');
                console.log(e);
                return response;
            }

            if (isEmpty(response.data.data)) {
                console.log('no data received');
                return;
            }

            if (isEmpty(response.data.labels)) {
                console.log('no labels received');
                return;
            }

            setDataCO2({
                labels: response.data.labels,
                datasets: [
                    {
                        label: roomMapping[props.sensor.name] ? roomMapping[props.sensor.name] : [props.sensor.name],//[props.sensor.name],
                        fill: true,
                        lineTension: 0.1,
                        backgroundColor: 'rgba(75,192,192,0.4)',
                        borderColor: 'rgba(75,192,192,1)',
                        borderCapStyle: 'butt',
                        borderDash: [],
                        borderDashOffset: 0.0,
                        borderJoinStyle: 'miter',
                        pointBorderColor: 'rgba(75,192,192,1)',
                        pointBackgroundColor: '#fff',
                        pointBorderWidth: 1,
                        pointHoverRadius: 10,
                        pointHoverBackgroundColor: 'rgba(75,192,192,0.25)',
                        pointHoverBorderColor: 'rgba(220,220,220,0.3)',
                        pointHoverBorderWidth: 2,
                        pointRadius: 1,
                        pointHitRadius: 5,
                        data: response.data.data
                    },
                    repeatHorizontal('threshold', 25, response.data.labels.length, 'rgba(255, 5, 18, 0.25)'),

                ]
            });
        };

        fetchData().catch((error) => {
            console.log(error);
        });

    }, [toggle, date, props.sensor.name, props.sensor.oid]);

    useEffect(() => {
        const fetchDataRange = async () => {
            const options = {
                method: 'get',
                url: `/api/objects/${props.sensor.oid}/date`,
                time: 3000
            };

            return await axios(options);
        };

        fetchDataRange().then((response) => {
            const days = response.data.days;
            if (!isEmpty(days)) {
                const updated = days.map((e) => {
                    return moment(e).tz('Europe/Oslo');
                });

                setDateRange(updated);
            }
        }).catch((error) => {
            console.log(error);
        });

    }, [props.sensor.oid]);

    useEffect(() => {
        const fetchWarning = async () => {
            const options = {
                method: 'get',
                url: `/api/objects/${props.sensor.oid}/show-warning`,
                time: 3000
            };

            return await axios(options);
        };

        fetchWarning().then(response => {
            toggleWarning(response.data.sent);
        }).catch(error => {
            console.log(error);
        });

    }, [warningPanel]);

    const toggleFetch = () => setToggle(!toggle);
    const changeDate = (x) => setDate(x);

    const inDateRange = (receivedDate) => {
        return (dateRange.filter((element) => {
            const day = moment(receivedDate).tz('Europe/Oslo');
            return element.diff(day, 'days') === 0;
        }).length > 0);
    };

    const maxDate = moment().tz('Europe/Oslo').toDate();

    // Function components receiving refs: change with the class above if problems arise
    const CustomDateInput = ({onChange, placeholder, value, isSecure, id, onClick}) => (
        <InputGroup className="mb-3">
            <InputGroup.Prepend>
                <InputGroup.Text id={id}>{'Date'}</InputGroup.Text>
            </InputGroup.Prepend>
            <FormControl
                onChange={onChange}
                onClick={onClick}
                aria-describedby={id}
                value={value}
            />
            <InputGroup.Append>
                <Button onClick={toggleFetch}>Refresh</Button>
            </InputGroup.Append>
        </InputGroup>
    );

    const clearWarning = () => {
        const resetWarning = async () => {
            const options = {
                method: 'put',
                url: `/api/objects/${props.sensor.oid}/reset-warning`,
                time: 3000
            };

            return await axios(options);
        };

        resetWarning().then(r => {
            toggleWarning(false);
        }).catch(error => {
            console.log(error);
        });
    };

    const ShowWarningPanel = ({show}) => show ? (
        <InputGroup style={{marginLeft: 'auto'}}>
            <InputGroup.Prepend style={{display: 'block'}}>
                <InputGroup.Text>Warning</InputGroup.Text>
            </InputGroup.Prepend>
            <InputGroup.Append style={{display: 'block'}}>
                <Button onClick={clearWarning}>Clear</Button>
            </InputGroup.Append>
        </InputGroup>
    ): '';

    return (
        <div>
            <ButtonToolbar className="mb-3" aria-label="Toolbar with Button groups">
                <DatePicker
                    dateFormat={'yyyy/MM/dd'}
                    todayButton={'Today'}
                    customInput={<CustomDateInput/>}
                    selected={date}
                    onChange={changeDate}
                    maxDate={maxDate}
                    filterDate={inDateRange}
                    showDisabledMonthNavigation
                />
                <ShowWarningPanel show={warningPanel}/>
            </ButtonToolbar>

            <Line data={dataDoorVisits} options={setYAxis('visits')}/>
        </div>
    );
}