// @ts-nocheck
'use client';

import { useMemo } from 'react';
// 1. MUDAMOS A IMPORTAÇÃO PARA 'Pie'
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import styles from './DoughnutChart.module.scss';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function DoughnutChart({ labels, data, colors }) {
  
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderWidth: 1, 
        borderColor: '#1e293b', 
        hoverOffset: 10
      }
    ]
  }), [labels, data, colors]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    // 2. REMOVEMOS O 'cutout' (Isso que deixava oco)
    layout: {
      // padding: {
      //   top: 20,
      //   bottom: 20
      // }
    },
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: { size: 16 }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
             const val = context.raw;
             const total = context.chart._metasets[context.datasetIndex].total;
             const pct = ((val / total) * 100).toFixed(1);
             return ` ${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${pct}%)`;
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: {
          weight: 'bold',
          size: 16
        },
        formatter: (value, ctx) => {
          const total = ctx.chart._metasets[ctx.datasetIndex].total;
          const percentage = (value / total * 100).toFixed(0); 
          
          if (percentage < 5) return null;

          return `${percentage}%`;
        },
        textShadowBlur: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  };

  return (
    <div className={styles.chartContainer}>
      {data.length > 0 ? (
        // 3. RENDERIZAMOS <Pie /> AO INVÉS DE <Doughnut />
        // @ts-ignore
        <Pie data={chartData} options={chartOptions} />
      ) : (
        <div className={styles.noData}>
          Sem gastos neste período
        </div>
      )}
    </div>
  );
}