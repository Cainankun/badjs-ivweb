/**
 * Created by chriscai on 2015/4/29.
 */

var fs = require('fs');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var express = require('express');
var pako = require('pako');

var app = express();

global.offlineLogMonitorInfo = {};

var log4js = require('log4js'),
    logger = log4js.getLogger();

var offlineLogMonitorPath = path.join(global.pjconfig.offline_log, 'offline_log_monitor.db');
try {
    global.offlineLogMonitorInfo = JSON.parse(fs.readFileSync(offlineLogMonitorPath).toString());
    logger.info('offline_log_monitor.db success ');
} catch (e) {
    logger.error('offline_log_monitor.db error ', e);
    fs.writeFile(offlineLogMonitorPath, fs.readFileSync(path.join(__dirname, 'offline_log_monitor.db')), function (err) {
        if (err) {
            logger.error('make file offline_log_monitor.db error ', err);
        } else {
            logger.log('make file offline_log_monitor.db success');
        }
    });
}

setInterval(function () {
    fs.writeFileSync(offlineLogMonitorPath, JSON.stringify(global.offlineLogMonitorInfo));
}, 3600000);

app.use(bodyParser.urlencoded({ extended: false }));


app.post('/offlineLogReport', function (req, res) {
    var param = req.body;
    if (param && param.offline_log) {
        try {
            var offline_log;
            try {
                if (typeof offline_log === 'string') {
                    offline_log = JSON.parse(offline_log);
                }
            } catch (e) {
                offline_log = JSON.parse(param.offline_log);
            }

            if (!/[\w]{1,7}/.test(offline_log.id)) {
                throw new Error('invalid id ' + offline_log.id);
            }

            global.models.applyDao.one({
                id: offline_log.id
            }, function (err, apply) {
                if (!apply || err || apply.status != 1) {
                    logger.info('invalid offlineLog  id: ' + offline_log.id);
                    return;
                }

                var filePath = path.join(__dirname, '..', 'offline_log', offline_log.id + "");
                var fileName = offline_log.uin + '_' + offline_log.startDate + '_' + offline_log.endDate;

                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath);
                }

                var logs = offline_log.logs;
                var msgObj = offline_log.msgObj;
                if (msgObj) {
                    logs.map(function (log) {
                        log.msg = msgObj[log.msg];
                        return log;
                    });
                }

                fs.writeFile(path.join(filePath, fileName), JSON.stringify(offline_log), function (err) {
                    if (!err) {
                        logger.info('offlineLogReport success');
                    }
                });

                logger.info('get offline log : ' + path.join(filePath, fileName));
            });
        } catch (e) {
            logger.warn('invalid offlineLog error  ' + e);
        }
    }

    res.end();
});

app.use('/offlineLogCheck', function (req, res) {
    var param = req.query;
    if (param.id && param.uin && global.offlineLogMonitorInfo[param.id] && global.offlineLogMonitorInfo[param.id][param.uin]) {
        let key = global.offlineLogMonitorInfo[param.id][param.uin];
        if (param.delete) {
            delete global.offlineLogMonitorInfo[param.id][param.uin];
        }
        logger.info('should download offline log: ' + (param.id + '_' + param.uin));
        res.end(key);
    } else {
        res.end();
    }
});


/**
 * dispatcher
 * @returns {Stream}
 */
module.exports = function () {

    logger.info('offline service start ok...');
    app.listen(9010);

};
