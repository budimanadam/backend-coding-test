'use strict';

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const winston = require('winston');

const logger = winston.createLogger({
    defaultMeta: {service: 'user-service'},
    format: winston.format.json(),
    level: 'info',
    transports: [
        
        /*
         * 
         * - Write all logs with level `error` and below to `error.log`
         * - Write all logs with level `info` and below to `combined.log`
         * 
         */
        new winston.transports.File({filename: 'error.log', 
            level: 'error'}),
        new winston.transports.File({filename: 'combined.log'})
    ]
});

/*
 * 
 * If we're not in production then log to the `console` with the format:
 * `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
 * 
 */
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

module.exports = (db) => {
    // eslint-disable-next-line func-style
    function getAll (query) {
        return new Promise(function (resolve, reject) {
            db.all(query, function (err, rows) {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    // eslint-disable-next-line func-style
    function selectLastId (query) {
        return new Promise(function (resolve, reject) {
            db.get(query, function (err, rows) {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    // eslint-disable-next-line func-style
    function insertRide (query, values) {
        return new Promise(function (resolve, reject) {
            db.run(query, values, function (err, rows) {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    // eslint-disable-next-line func-style
    function getSingleRide (query) {
        return new Promise(function (resolve, reject) {
            db.get(query, function (err, rows) {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    app.get('/health', (req, res) => {
        res.send('Healthy');
    });

    app.post('/rides', jsonParser, async (req, res) => {
        const startLatitude = Number(req.body.start_lat);
        const startLongitude = Number(req.body.start_long);
        const endLatitude = Number(req.body.end_lat);
        const endLongitude = Number(req.body.end_long);
        const riderName = req.body.rider_name;
        const driverName = req.body.driver_name;
        const driverVehicle = req.body.driver_vehicle;

        if (startLatitude < -90 || startLatitude > 90 || startLongitude < -180 || startLongitude > 180) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Start latitude and longitude must be between -90 - 90 and -180 to 180 degrees respectively'
            });
        }

        if (endLatitude < -90 || endLatitude > 90 || endLongitude < -180 || endLongitude > 180) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'End latitude and longitude must be between -90 - 90 and -180 to 180 degrees respectively'
            });
        }

        if (typeof riderName !== 'string' || riderName.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Rider name must be a non empty string'
            });
        }

        if (typeof driverName !== 'string' || driverName.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Rider name must be a non empty string'
            });
        }

        if (typeof driverVehicle !== 'string' || driverVehicle.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Rider name must be a non empty string'
            });
        }

        var values = [req.body.start_lat, req.body.start_long, req.body.end_lat, req.body.end_long, req.body.rider_name, req.body.driver_name, req.body.driver_vehicle];
        
        const sql = 'INSERT INTO Rides(startLat, startLong, endLat, endLong, riderName, driverName, driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const result = await insertRide(sql, values);
        const select = await selectLastId("SELECT last_insert_rowid() as rideID");
        const responseObject = {
            rideID: select.rideID,
            ...req.body
        };
        const response = [responseObject];
        res.send(response);
    });

    app.get('/rides', async (req, res) => {
        const page = Number(req.query.page);
        const pageSize = Number(req.query.pageSize);
        let limit = '';

        if (page) {
            if (Number.isNaN(page) || Number.isNaN(pageSize)) {
                return res.send({
                    error_code: 'VALIDATION_ERROR',
                    message: 'page and pageSize must be number'
                });
            }

            const offset = (page - 1) * pageSize;
            limit = `limit ${pageSize} offset ${offset}`;
        }
        const rows = await getAll(`select * from Rides ${limit}`);
        if (rows.length === 0) {
            res.send({
                error_code: 'RIDES_NOT_FOUND_ERROR',
                message: 'Could not find any rides'
            });
        }
        res.send(rows);
    });

    app.get('/rides/:id', async (req, res) => {
        if (Number.isNaN(req.params.id)) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Id must be number'
            });
        }

        const result = await getSingleRide(`SELECT * FROM Rides WHERE rideID='${req.params.id}'`);
        res.send(result || {
            error_code: 'RIDES_NOT_FOUND_ERROR',
            message: 'Could not find any rides'
        });
    });

    return app;
};
