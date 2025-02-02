/* global module */
/**
 * Created by chriscai on 2015/1/23.
 */

/**
 * TODO: project.db 体积会随着项目的增加逐渐膨胀，每次项目更新后全量持久化到文件 I/O 时间会线性增长；并且每次启动后全量加载项目数据到内存比较粗暴；
 * 可以考虑做 redis 缓存
 */

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const log4js = require('log4js');
const logger = log4js.getLogger();

const path = require('path');

const dbPath = path.join(__dirname, '..', 'project.db');

if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '{}', 'utf8');
}

const app = express();

app.use(bodyParser.json({ limit: '10mb' }));
app.use(
    bodyParser.urlencoded({
        extended: true,
        limit: 10 * 1024 * 1024
    })
);

const ProjectService = function(clusters) {
    const dispatchCluster = function(data) {
        for (var i = 0; i < clusters.length; i++) {
            clusters[i].send(data);
        }
    };

    // 主进程接收 projects 更新，然后通知 woker 进程更新
    app.use('/getProjects', function(req, res) {
        var param = req.query;
        if (req.method === 'POST') {
            param = req.body;
        }

        if (param.auth != 'badjsAccepter' || !param.projectsInfo) {
        } else {
            dispatchCluster({
                projectsInfo: param.projectsInfo
            });

            fs.writeFile(dbPath, param.projectsInfo || '', function() {
                logger.info('update project.db');
            });
        }

        res.writeHead(200);
        res.end();
    }).listen(9001);

    var info = fs.readFileSync(dbPath, 'utf-8');

    dispatchCluster({
        projectsInfo: info
    });
};

module.exports = ProjectService;
