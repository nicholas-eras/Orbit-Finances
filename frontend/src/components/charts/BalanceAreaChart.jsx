// @ts-nocheck
'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect } from 'react';
import styles from './BalanceAreaChart.module.scss';

const ApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div style={{ height: 250, width: '100%' }} />
});

/* ---------------------------
   HELPERS (Mantidos da versão anterior)
---------------------------- */
const safeTimestamp = (val) => {
  // SE a data vier apenas como "YYYY-MM-DD", adicionamos T00:00:00
  // Isso força o browser a criar a data no fuso horário LOCAL, não em UTC.
  const dateStr = val.length === 10 ? `${val}T00:00:00` : val;
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? 0 : date.getTime();
};

const getSmartMax = (val) => {
  if (!val || val === 0) return 100;
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

const getDynamicThreshold = (data) => {
  if (!data || !data.length) return 0;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.y || 0)));
  return maxAbs * 0.15;
};

const getRelevantPoints = (data, maxPoints = 4) => {
  if (!data || data.length < 2) return data || [];

  const threshold = getDynamicThreshold(data);
  const events = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].y;
    const curr = data[i].y;
    const impact = Math.abs(curr - prev);

    if (impact >= threshold) {
      events.push({ x: data[i].x, y: curr, impact });
    }
  }

  events.sort((a, b) => b.impact - a.impact);
  
  let selected = events.slice(0, maxPoints);
  selected.unshift(data[0]);
  selected.push(data[data.length - 1]);

  const uniqueMap = new Map();
  selected.forEach(p => {
    const ts = safeTimestamp(p.x);
    if (ts > 0 && !uniqueMap.has(ts)) {
      uniqueMap.set(ts, p);
    }
  });

  return Array.from(uniqueMap.values());
};

export default function BalanceAreaChart({ data }) {
  // Aumentei a altura base do mobile de 200 para 240 para dar mais respiro
  const [chartHeight, setChartHeight] = useState(300);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 480);
      
      if (width <= 480) setChartHeight(240); // Altura mobile
      else if (width <= 768) setChartHeight(260); // Altura tablet
      else setChartHeight(300); // Altura desktop
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chartOptions = useMemo(() => {
    if (!data || data.length === 0) return null;

    const values = data.map(d => d.y);
    const maxAbsValue = values.length ? Math.max(...values.map(v => Math.abs(v))) : 0;
    const limit = getSmartMax(maxAbsValue);
    
    const timestamps = data.map(d => safeTimestamp(d.x));
    let minX = Math.min(...timestamps);
    let maxX = Math.max(...timestamps);

    if (minX === maxX) {
      minX = minX - 86400000;
      maxX = maxX + 86400000;
    }

    const points = getRelevantPoints(data, 4);
    
    // No mobile, mostramos apenas o primeiro e o último ponto nas anotações
    // const relevantPoints = isMobile 
    //   ? points.filter((p, i) => i === 0 || i === points.length - 1)
    //   : points;
    const relevantPoints = points;
    return {
      chart: {
        type: 'area',
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: 'inherit',
        animations: { enabled: true }, // Desativa animação no mobile para performance
        zoom: { enabled: false }
      },
      colors: ['#3b82f6'],
      stroke: {
        curve: 'smooth',
        width: isMobile ? 2 : 3 // Linha um pouco mais fina no mobile
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5, // Levemente menos opaco no topo
          opacityTo: 0.05,
          stops: [0, 90, 100]
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        type: 'datetime',
        min: minX,
        max: maxX,
        tooltip: { enabled: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: 6, // Reduz drasticamente ticks no mobile
        labels: { 
          datetimeUTC: false, // <--- O PULO DO GATO
          style: { colors: '#94a3b8', fontSize: isMobile ? '10px' : '12px' },
          rotate: 0, // Nunca rotacionar no mobile
          hideOverlappingLabels: true,
          formatter: function(value, timestamp, opts) {
             // Formatação mais curta no mobile
             const date = new Date(timestamp);
             if (isMobile) {
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
             }
             return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          }
        },
        crosshairs: { show: true } // Remove crosshair no mobile para limpar visual
      },
      yaxis: {
        min: -limit * 1.1,
        max: limit * 1.1,
        tickAmount: 4,
        show: true, // ESCONDE labels do eixo Y no mobile para ganhar largura
        labels: {
          style: { colors: '#94a3b8', fontSize: isMobile ? '10px' : '12px' },
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
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
        padding: {
          // Aumenta padding lateral no mobile para as etiquetas não cortarem
          left: isMobile ? 15 : 10, 
          right: isMobile ? 20 : 30,
          bottom: 0,
          top: 0
        }
      },
      theme: { mode: 'dark' },
      annotations: {
        yaxis: [
          {
            y: 0,
            borderColor: '#475569',
            strokeDashArray: 0,
            opacity: 0.3,
            width: '100%'
          }
        ],
        points: relevantPoints.map((point, index) => {
          const isFirst = index === 0;
          const isLast = index === relevantPoints.length - 1;
          const pointX = safeTimestamp(point.x);

          if (!pointX) return null;

          // Ajuste fino do Offset para garantir que fique dentro do gráfico
          let offsetX = 0;
          let offsetY = point.y >= 0 ? -15 : 15;

          return {
            x: pointX,
            y: point.y,
            marker: {
              size: isLast ? 6 : 5,
              fillColor: point.y >= 0 ? '#10b981' : '#ef4444',
              strokeColor: '#fff',
              strokeWidth: 2
            },
            label: {
              show: isFirst || isLast,
              text: (point.y || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0
              }),
              offsetX,
              offsetY,
              style: {
                background: point.y >= 0 ? '#10b981' : '#ef4444',
                color: '#fff',
                fontSize: isMobile ? '10px' : '11px',
                fontWeight: 600,
                padding: {
                  left: 4, right: 4, top: 2, bottom: 2
                },
                // Borda arredondada para ficar mais moderno
                borderRadius: 4
              }
            }
          };
        }).filter(Boolean)
      }
    };
  }, [data, chartHeight, isMobile]);

  const series = useMemo(() => [
    {
      name: 'Saldo',
      data: data ? data.map(d => ({ x: safeTimestamp(d.x), y: d.y })) : []
    }
  ], [data]);

  if (!isMounted) return <div className={styles.chartContainer} style={{ height: chartHeight }} />;
  if (!data || data.length === 0) return null;

  return (
    <div className={styles.chartContainer}>
      <ApexChart
        key={`${isMobile ? 'm' : 'd'}-${data.length}`} 
        type="area"
        height={chartHeight}
        options={chartOptions}
        series={series}
      />
    </div>
  );
}