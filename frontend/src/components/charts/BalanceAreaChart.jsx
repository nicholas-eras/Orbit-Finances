'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import styles from './BalanceAreaChart.module.scss';

const ApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false
});

/* ---------------------------
   NICE NUMBERS (eixo Y)
---------------------------- */
const getSmartMax = (val) => {
  if (val === 0) return 100;

  const target = Math.abs(val) * 1.05;
  const magnitude = Math.pow(10, Math.floor(Math.log10(target)));
  const normalized = target / magnitude;

  let scalar;
  if (normalized <= 1) scalar = 1;
  else if (normalized <= 1.25) scalar = 1.25;
  else if (normalized <= 1.5) scalar = 1.5;
  else if (normalized <= 2) scalar = 2;
  else if (normalized <= 2.5) scalar = 2.5;
  else if (normalized <= 5) scalar = 5;
  else scalar = 10;

  return scalar * magnitude;
};

/* ------------------------------------
   THRESHOLD DINÂMICO
------------------------------------- */
const getDynamicThreshold = (data) => {
  if (!data.length) return 0;

  const maxAbs = Math.max(
    ...data.map(d => Math.abs(d.y))
  );

  return maxAbs * 0.15;
};

/* ------------------------------------
   PONTOS RELEVANTES (ANTI-POLUIÇÃO)
------------------------------------- */
const getRelevantPoints = (data, maxPoints = 4) => {
  const threshold = getDynamicThreshold(data);
  const events = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].y;
    const curr = data[i].y;
    const impact = Math.abs(curr - prev);

    if (impact >= threshold) {
      events.push({
        x: data[i].x,
        y: curr,
        impact
      });
    }
  }

  events.sort((a, b) => b.impact - a.impact);

  let selected = events.slice(0, maxPoints);

  if (data.length) {
    selected.unshift(data[0]);
    selected.push(data[data.length - 1]);
  }

  return Array.from(
    new Map(selected.map(p => [p.x, p])).values()
  );
};

export default function BalanceAreaChart({ data }) {  
  const chartOptions = useMemo(() => {
    const values = data.map(d => d.y);
    const maxAbsValue = values.length
      ? Math.max(...values.map(v => Math.abs(v)))
      : 0;

    const limit = getSmartMax(maxAbsValue);
    const points = getRelevantPoints(data, 4);

    return {
      chart: {
        type: 'area',
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: 'inherit'
      },
      colors: ['#3b82f6'],
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.6,
          opacityTo: 0.05,
          stops: [0, 90, 100]
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        type: 'datetime',
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: '#94a3b8' } },
        tooltip: { enabled: false }
      },
      yaxis: {
        min: -limit * 1.1,
        max: limit * 1.1,
        tickAmount: 4,
        labels: {
          style: { colors: '#94a3b8' },
          formatter: value =>
            value.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0
            })
        }
      },
      grid: {
        borderColor: '#334155',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } }
      },
      theme: { mode: 'dark' },
      annotations: {
        yaxis: [
          {
            y: 0,
            borderColor: '#475569'
          }
        ],
        points: points.map((point, index) => {
          const isFirst = index === 0;
          const isLast = index === points.length - 1;

          let offsetX = 0;
          if (isLast) offsetX = -40;
          if (isFirst) offsetX = 40;

          return {
            x: new Date(point.x).getTime(),
            y: point.y,
            marker: {
              size: isLast ? 7 : 6,
              fillColor: point.y >= 0 ? '#10b981' : '#ef4444',
              strokeColor: '#fff',
              strokeWidth: 2
            },
            label: {
              show: isFirst || isLast,
              text: point.y.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0
              }),
              offsetX,
              offsetY: point.y >= 0 ? -18 : 18,
              style: {
                background: point.y >= 0 ? '#10b981' : '#ef4444',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700
              }
            }
          };
        })
      }
    };
  }, [data]);

  const series = useMemo(() => [
    {
      name: 'Saldo Projetado',
      data
    }
  ], [data]);

  return (
    <div className={styles.chartContainer}>
      <ApexChart
        type="area"
        height={300}
        // @ts-ignore
        options={chartOptions}
        series={series}
      />
    </div>
  );
}
