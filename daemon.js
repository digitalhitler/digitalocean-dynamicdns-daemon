#!/usr/bin/env node
/*
 ** Digital Ocean Dynamic DNS daemon **
 * https://github.com/digitalhitler/digitalocean-dynamicdns-daemon
 * 
 * (с) Sergey Petrenko 2016
 * spetrenko@me.com
 * 
 * This daemon made for dynamic updating of subdomain A-record in DNS-zone
 * provided by DigitalOcean.com service.
 * 
 ** How to use **
 * Please set all required values in config.default.ini, rename it to config.ini
 * and just start this script. You can set it up as daemon or service in your operating system.
 * 
 ** Attention **
 * This script can be a little bit buggy because it was made for my own purposes
 * and has been published because of few my friends just want the same and they
 * are too lazy to write it own. Use it on your own risk!
 * 
 ** Troubleshooting **
 * Script generates updates.log file, go there if you have issues. You can set debug to true in
 * config.ini to enable more detailed logging.
 *
 */

'use strict';

var fs = require('fs'),
    jetpack = require('fs-jetpack'),
    ini = require('ini'),
    http = require('http'),
    colors = require('colors'),
    log = require('intel'),
    syncRequest = require('sync-request'),
    https = require('https');

    
var app = { 
  config: null,
  recordId: null,
  recordIp: null,
  record: null,
  myIp: null,
  init: function (conf) {
    
    var self = this;
    
    if (!conf) throw new Exception('I need some config to run');
    
    // remembering configuration:
    self.config = conf;
    
    // determining required level to log:
    if (self.config.logging.debug) {
      self.logLevel = log.VERBOSE;
    } else {
      self.logLevel = log.INFO;
    }
   
    
    // adding console output: 
    log.addHandler(new log.handlers.Console({
      colorize: true,
      level:  self.logLevel
    }));
   
    if (self.config.logging.enable === true && typeof self.config.logging.filename === 'string') {
      log.addHandler(new log.handlers.File({
        level: self.logLevel,
        file: self.config.logging.filename,
        formatter: new log.Formatter({
          format: '[%(date)s] %(levelname)s: %(message)s',
          strip: true
        }), 
      }));
    }
    
    self.api = require('nautical').getClient({
      token: self.config.account.access_token
    });
    
    log.verbose('Looking for current external IP address...');
    self.getCurrentExternalAddress();
    log.verbose('External address is ' + self.myIp);

    log.verbose('Looking for DNS record API ID...');
    self.api.domainRecords.list(self.config.account.domain, function(err, result) {
      if (!err) {
        var records = result.body.domain_records;
        for (var curr in records) {
          var record = records[curr];
          if (record.type === 'A' && record.name === self.config.account.record) {
            log.info('DO API record ID is ' + record.id);
            self.recordId = record.id;
            self.recordIp = record.data;
            self.runDaemon();
          }
        } 
      } else {
        log.error('Failed to get domain record: ', err);
      }
    });
  },
  
  runDaemon: function() {
    var self = this;
    log.info('Daemon started');
    self.check();
    setInterval(self.check, self.config.updating.check_interval * 1000);
  },
  
  check: function () {
    var self = this;
    log.verbose('Checking for updates...');
    var myExternalIp = app.getCurrentExternalAddress();
    if (myExternalIp === app.recordIp) {
      log.verbose('Nothing changed.');
      return false;
    } else {
      log.verbose('Changes found!');
      log.info('IP Address changed to ' + myExternalIp + '. Changing A-record IP...');
      app.api.domainRecords.update(self.config.account.domain, app.recordId, { data: myExternalIp }, function (err, result) {
        if (!err) {
          log.info('Success!');
          app.recordIp = myExternalIp;
        } else {
          log.error('Failed to change A-record IP address: ', err);
        }
      });
    }
  },
  
  getCurrentExternalAddress: function () {
    var self = this;
    var res = syncRequest('GET', self.config.updating.check_ip_url, {
      timeout: self.config.updating.request_timeout * 1000
    });
    var response = res.getBody();
    if (response) {
      var extIp = response.toString().replace('\n','');
      self.myIp = extIp;
      return extIp; 
    } else {
      log.error('Failed to get current external address.');
      return false;
    }
    
  },
  
  stopOnError: function(description) {
    console.log(colors.red.bold('Error!'));
    console.log(description);
    process.exit(1);
  }
}

process.title = 'digitalocean-ddns-daemon';

var currDir = jetpack.cwd(__dirname);
var daemonConfigFile = currDir.read('config.ini');
if (daemonConfigFile !== null) {
  var daemonConfig = ini.parse(daemonConfigFile);
  
  // checking for required configuration
  if (!daemonConfig.account.access_token ||
      !daemonConfig.account.domain || 
      !daemonConfig.account.record
    ) {
    app.stopOnError('Please set access_token, domain & record settings in account scope of config.ini file');
  }
  
  // everything looks fine, let the magic begins: 
  app.init(daemonConfig);
} else {
  app.stopOnError('Please rename ' + colors.underline('config.default.ini') + ' to ' +
    colors.underline('config.ini') + ' and fill out required configuration variables inside this file.');
};
