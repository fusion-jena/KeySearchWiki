import Config     from './../config/config' ;
import readline   from 'readline';
import fs         from 'fs';
import mkdirp     from 'mkdirp';

/**
 * plot #entries per binned metric value using chart.js library
 * @param     {String}          metric    name of metric
 * @param     {String}          color     color bars
 * @param     {Number}          max       max metric value
 * @param     {Number}          bin       bin interval length
 * @param     {String}          fileName  source of metrics
 */

export default function plotMetricFrequencyBinned(metric, color, max, bin, fileName, xLabel , yLabel, abr, yMax){

  mkdirp.sync(Config.plotMetric);

  const rl = readline.createInterface({
    input: fs.createReadStream(  fileName ),
  });

  let nrQueriesPerValue = {};
  let dataset = [], labels = [], entriesArray = [];
  rl.on('line', function(line) {
    entriesArray.push(JSON.parse(line));
  });

  rl.on('close', () => {
    if(max == undefined){
      max = Math.max.apply(Math, entriesArray.map(x => { return x[metric]; }));
    }

    //sort descending
    entriesArray.sort((a, b) => (a[metric] < b[metric]) ? 1 : -1);

    //initialize bins
    let temp = max ;
    let bins = [];

    while(temp > 0 && temp-bin > 0){
      bins.push({left:Number((temp-bin).toFixed(2)), right:Number(temp.toFixed(2))});
      temp = temp - bin;
    }

    bins.forEach(item => {
      nrQueriesPerValue[JSON.stringify(item)] = 0;
    });

    entriesArray.forEach(entry => {
      Object.keys(nrQueriesPerValue).forEach(key => {
        let check = (JSON.parse(key).left < entry[metric] && entry[metric]<= JSON.parse(key).right);
        if(check){
          nrQueriesPerValue[key]++ ;
        }
      });

    });

    Object.keys(nrQueriesPerValue).forEach(key => {
      dataset.push(nrQueriesPerValue[key]);
      labels.push(`${JSON.parse(key).left} < ${abr} <= ${JSON.parse(key).right}`);
    });

    let html = `
  <head>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>

  <body>
  <canvas id="barChart"></canvas>
  <script>
  var ctx = document.getElementById('barChart').getContext('2d');

  var chart = new Chart(ctx, {
      // The type of chart we want to create
      type: 'bar',

      // The data for our dataset
      data: {
          labels: ${JSON.stringify(labels)},
          datasets: [{
              label: '#entries',
              backgroundColor: '${color}',
              borderColor: '${color}',
              data: ${JSON.stringify(dataset)}
          }]
      },

      // Configuration options go here
      options: {
        title: {
          display:false ,
          text: '#entries per ${metric} value'
        },
        plugins: {
          legend: {
            display: false
          }
        },
          scales: {
              x: {
                  position: 'bottom',
                  title: {
                    text: 'Binned ${xLabel}',
                    display:true
                  }
              },
              y: {
                  beginAtZero: true,
                  max: ${yMax},
                  title: {
                    text: '${yLabel}',
                    display:true
                  },

              }
          }
      }
  });
  </script>
  </body>

  `;
    let htmlFile = Config.plotMetric+`binned-${metric}.html`;
    fs.writeFileSync(htmlFile, html);
  });
}
