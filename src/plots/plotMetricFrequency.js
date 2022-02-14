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
  let dataset = [], labels = [], entriesArray = [], ticks= '';
  rl.on('line', function(line) {
    entriesArray.push(JSON.parse(line));
  });

  rl.on('close', () => {

    //sort descending
    entriesArray.sort((a, b) => (a[metric] < b[metric]) ? 1 : -1);

    // if metric = relevantEntitiesSize show more insights
    if(metric == 'relevantEntitiesSize'){
      let range1 = 0 , range2 = 0 , range3 = 0;
      entriesArray.forEach(item => {
        if(item[metric] >= 2 && item[metric] <= 600){
          range1 ++;
        }
        if(item[metric] > 1000){
          range2 ++;
        }
        if(item[metric] <= 1000){
          range3 ++;
        }
      });

      console.log('2 <= #RE <= 600 : '+ range1 );
      console.log('#RE > 1000 : '+ range2 );
      console.log('#RE <= 1000 : '+ range3 );

      // limit ticks on x-axis
      /*ticks = `,
      ticks: {
        maxTicksLimit: 5
      }`;*/

    }

    entriesArray.forEach((item) => {
      if(nrQueriesPerValue.hasOwnProperty(item[metric])){
        nrQueriesPerValue[item[metric]] ++ ;
      }
      else{
        nrQueriesPerValue[item[metric]] = 1;
      }
    });

    Object.keys(nrQueriesPerValue).forEach(key => {
      if(metric == 'relevantEntitiesSize'){
        dataset.push({x:parseInt(key), y:nrQueriesPerValue[key]});
      }
      else{
        dataset.push(nrQueriesPerValue[key]);
        labels.push(parseInt(key));
      }

    });

    if(scale == 'log'){
      if(metric == 'relevantEntitiesSize'){
        dataset = dataset.map(value => {return {x:Math.log10(value.x), y:Math.log10(value.y)};});
      }
      else{
        dataset = dataset.map(value => Math.log10(value));
      }
    }

    let htmlBar = `
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
                  ${ticks}
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

    let htmlScatter = `
<head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.min.js"></script>
</head>

<body>
<canvas id="ScatterChart"></canvas>
<script>
var ctx = document.getElementById('ScatterChart').getContext('2d');

var chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'scatter',

    // The data for our dataset
    data: {
        datasets: [{
            label: '#final-entries',
            backgroundColor: '${color}',
            borderColor: '${color}',
            pointRadius: 1,
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
          xAxes: [{
    type:'linear',
    position: 'bottom',
    ticks: {
      userCallback: function(label, index, labels) {
        return Math.pow(10,label).toLocaleString();
      }
    },
    scaleLabel: {
      display: true,
      labelString: '${xLabel}'
           }
  }],
  yAxes: [{
      ticks:{
    stepSize: 1,
    userCallback: function(label, index, labels) {
        return Math.pow(10,label).toLocaleString();
      }
    },
    scaleLabel: {
      display: true,
      labelString: '${ylabel}'
           }

  }]


        }
    }
});
</script>
</body>

`;

    let htmlFile = Config.plotMetric+`${scale}-${metric}.html`;
    if(metric == 'relevantEntitiesSize'){
      fs.writeFileSync(htmlFile, htmlScatter);
    }
    else{
      fs.writeFileSync(htmlFile, htmlBar);
    }

  });
}
