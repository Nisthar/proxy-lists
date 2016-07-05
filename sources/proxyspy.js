'use strict';

var _ = require('underscore');
var async = require('async');
var EventEmitter = require('events').EventEmitter || require('events');
var request = require('request');

module.exports = {

	homeUrl: 'http://txt.proxyspy.net/proxy.txt',

	getProxies: function(options) {

		options || (options = {});

		var emitter = new EventEmitter();

		var fn = async.seq(
			this.getData,
			this.parseResponseData
		);

		fn(options, function(error, proxies) {

			if (error) {
				emitter.emit('error', error);
			} else {
				emitter.emit('data', proxies);
			}

			emitter.emit('end');
		});

		return emitter;
	},

	getData: function(options, cb) {

		var requestOptions = {
			method: 'GET',
			url: 'http://txt.proxyspy.net/proxy.txt',
		};

		request(requestOptions, function(error, response, data) {

			if (error) {
				return cb(error);
			}

			if (response.statusCode >= 300) {
				error = new Error(data);
				error.status = response.statusCode;
				return cb(error);
			}
			cb(null, { data: data, options: options });
		});
	},

	parseResponseData: function(result, cb) {

		try {
			var data = result.data;
			var options = result.options;
			var countriesKeys = _.keys(options.countries);
			var anonymityCodeMap = {
				'n': 'transparent',
				'a': 'anonymous',
				'h': 'elite'
			};
			// regex capturing groups: IP, PORT, COUNTRY, ANONYMITYLEVEL, SECURE
			var re = /((?:\d{1,3}\.){3}\d{1,3})\:(\d+)\s+(\S{2})\-([nah])\-*([s]*)/g;
			var str = (data + '').toLowerCase();
			var oneProxy;
			var proxies = [];
			while ((oneProxy = re.exec(str)) !== null) {
				var proxyItem = {
					ipAddress: oneProxy[1],
					port: oneProxy[2],
					protocols: oneProxy[5] ? ['http', 'https'] : ['http'],
					anonymityLevel: anonymityCodeMap[oneProxy[4]],
					country: oneProxy[3]
				};
				if ( (countriesKeys && _.contains(countriesKeys, proxyItem.country))
					&& (!options.anonymityLevels || options.anonymityLevels && _.contains(options.anonymityLevels, proxyItem.anonymityLevel))
					&& (!options.protocols || options.protocols && _.intersection(options.protocols, proxyItem.protocols).length) )
				{
					proxies.push(proxyItem);
				}
			}

		} catch (error) {
			return cb(error);
		}

		cb(null, proxies);
	}
};
