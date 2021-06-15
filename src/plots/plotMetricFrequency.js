import Config     from './../config/config' ;
import readline   from 'readline';
import fs         from 'fs';
import mkdirp     from 'mkdirp';


/**
 * plot #entries per metric value using chart.js library
 * @param     {String}          metric    name of metric
 * @param     {String}          scale     log or linear
 * @param     {String}          color     color bars
 * @param     {String}          fileName  source of metrics
 * @param     {String}          xLabel    label of x axis
 */

export default function plotMetricFrequency(metric, scale, color , fileName ,xLabel){

  mkdirp.sync(Config.plotMetric);

  let ylabel = '#final-entries';

  const rl = readline.createInterface({
    input: fs.createReadStream( fileName ),
  });

  let nrQueriesPerValue = {};
  let dataset = [], labels = [], entriesArray = [];
  rl.on('line', function(line) {
    entriesArray.push(JSON.parse(line));
  });

  rl.on('close', () => {

    //sort descending
    entriesArray.sort((a, b) => (a[metric] < b[metric]) ? 1 : -1);

    entriesArray.forEach((item, i) => {
      if(nrQueriesPerValue.hasOwnProperty(item[metric])){
        nrQueriesPerValue[item[metric]] ++ ;
      }
      else{
        nrQueriesPerValue[item[metric]] = 1;
      }
    });

    Object.keys(nrQueriesPerValue).forEach(key => {
      dataset.push(nrQueriesPerValue[key]);
      labels.push(parseInt(key));
    });

    if(scale == 'log'){
      dataset = dataset.map(value => Math.log10(value));
      ylabel = 'log10(#final-entries)';
    }

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
              label: '#final-entries',
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
                  beginAtZero: true,
                  position: 'bottom',
                  title: {
                    text: '${xLabel}',
                    display:true
                  }
              },
              y: {
                  beginAtZero: true,
                  title: {
                    text: '${ylabel}',
                    display:true
                  },

              }
          }
      }
  });
  </script>
  </body>

  `;

    let htmlFile = Config.plotMetric+`${scale}-${metric}.html`;
    fs.writeFileSync(htmlFile, html);
  });
}
