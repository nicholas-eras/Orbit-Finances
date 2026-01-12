'use client';

import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

import styles from './DoughnutChart.module.scss';

// registra plugins (igual no Vue)
ChartJS.register(ArcElement, Tooltip, Legend);

export default function DoughnutChart({ labels, data, colors }) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderWidth: 0
      }
    ]
  }), [labels, data, colors]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#cbd5e1',
          font: {
            size: 12
          }
        }
      }
    }
  };

  return (
    <div className={styles.chartContainer}>
      {data.length > 0 ? (
        // @ts-ignore
        <Doughnut data={chartData} options={chartOptions} />
      ) : (
        <div className={styles.noData}>
          Sem gastos neste período
        </div>
      )}
    </div>
  );
}
