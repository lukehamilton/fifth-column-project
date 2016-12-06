var rp = require('request-promise');
var NodeGeocoder = require('node-geocoder');

var NASA_API = 'https://data.nasa.gov/resource/y77d-th95.json'
var MAPS_API_KEY = 'AIzaSyDEdpOxJZquMijR9_iXTAxcaxvq17MptnI'

var geoCoderOpts = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: MAPS_API_KEY,
  formatter: null
};

var geocoder = NodeGeocoder(geoCoderOpts);

var countryData = {
  '2008':{},
  '2010': {}
}

var items = []

var options = {
    uri: NASA_API,
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true,
    transform: function (records) {
      records = records.filter(function(record) {
        var date = record.year
        if (date !== undefined) {
          var year = date.slice(0, 4)
          if (year == '2008' || year == '2010') {
            return record
          }
        }
      });
      return records
    }
};


rp(options)
  .then(function (records) {
    geocodeRecords(records, function()  {
      addPublications(function()  {
        printOutput()
      })
    })
  }).catch(function (err) {
    console.log('Error: ', err)
  });

function saveRecord(opts) {
  items.push(opts)
}

function geocodeRecords(records, callback)  {
  var results = []
  var counter = records.length
  for (var i = 0; i < records.length; i++)  {
    (function(i) {
      var record = records[i]
      var coordinates = records[i].geolocation.coordinates
      var lat = coordinates[0],
          lng = coordinates[1]
      var date = new Date(record.year)
      var year = date.getFullYear() + 1
      geocoder.reverse({lat: lat, lon: lng}, function(err, res) {
        if (res !== undefined)  {
          var opts = {
            record: record,
            year: year,
            country: res[0].country,
            countryCode: res[0].countryCode
          }
          saveRecord(opts)
          results.push(opts)
        } else {
          counter = counter - 1
        }
        if (results.length == counter)  {
          callback()
        }
      })
    })(i)
  }
}

function addPublications(callback)  {
  var counter = 0;
  for (var j = 0; j < items.length; j++)  {
    (function(j)  {
      var item = items[j]
      var url = 'http://api.worldbank.org/countries/' + item.countryCode + '/indicators/IP.JRN.ARTC.SC?per_page=100&format=json&date=' + item.year
      rp({
        uri: url,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
      }).then(function(result)  {
        if (result[1] !== undefined)  {
          var value = result[1][0].value
        } else {
          value = 0
        }
        countryData[item.year][item.countryCode] = {
          record: item.record,
          country: item.country,
          value: value
        }
        counter = counter + 1
        if (counter == items.length)  {
          callback()
        }
      })
    })(j)
  }
}

function printOutput()  {
  var countriesA = [], countriesB = [];
  for ( country in countryData['2008']) {
    if (countryData['2008'][country].value != 0)  {
      countriesA.push(countryData['2008'][country].country)
    }
  }
  for ( country in countryData['2010']) {
    if (countryData['2010'][country].value != 0)  {
      countriesB.push(countryData['2010'][country].country)
    }
  }
  console.log("\nQ: In 2008, what are the top 5 countries with documented meteor strikes and published scientific technical journals?\n")
  console.log(countriesA.join(', '))
  console.log("\nQ: In 2010, what are the top 5 countries with documented meteor strikes and published scientific technical journals?\n")
  console.log(countriesB.join(', '))
  console.log("\nQ: What countries are unique to both years?\n")
  console.log("2008:\n")
  for (var i = 0; i < countriesA.length; i++) {
    if (countriesB.indexOf(countriesA[i]) == -1) {
      console.log(countriesA[i])
    }
  }
  console.log("\n2010:\n")
  for (var i = 0; i < countriesB.length; i++) {
    if (countriesA.indexOf(countriesB[i]) == -1) {
      console.log(countriesB[i])
    }
  }
  console.log("Q: What countries are the same from both years?\n")
  for (var i = 0; i < countriesA.length; i++) {
    if (countriesB.indexOf(countriesA[i]) != -1) {
      console.log(countriesA[i])
    }
  }
  console.log("\nQ: Can you infer anything from this data? Why or why not?\n")
  console.log("No, because the WorldBank API does not have published scientific technical journal values for Antarctica (2008, 2010) or 'Svalbard and Jan Mayen' (2008), which both had documented meteor strikes for one or both of the specified years.\n")
  console.log('Data Structure:\n')
  console.log(countryData)
  console.log('\n')
}
