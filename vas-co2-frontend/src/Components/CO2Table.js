import React, {useEffect, useState} from 'react';
import {Chart, Line} from 'react-chartjs-2';

import {Button, ButtonGroup, ButtonToolbar, InputGroup, FormControl, Table} from 'react-bootstrap';
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
    data: []
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

function isEmpty(v) {
    return (typeof (v) === 'undefined' || v == null);
}

export default function LineChartCO2(props) {

    const [dataDoorVisits, setDataCO2] = useState(data);
    const [toggle, setToggle] = useState(false);
    const [date, setDate] = useState(moment().tz('Europe/Oslo').toDate());
    const [dateRange, setDateRange] = useState([moment().tz('Europe/Oslo')]);
    const [warningPanel, toggleWarning] = useState(false);

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
                data: response.data.data
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
                <Table responsive >
                    <tr>
                        <td>Hours</td>
                        {dataDoorVisits.labels.map(label => <td>{label}</td>)}
                    </tr>
                    <tr>
                        <td>Number of visits</td>
                        {dataDoorVisits.data.map(visit => <td>{visit}</td>)}
                    </tr>
                </Table>
            </ButtonToolbar>
        </div>
    );
}