<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import type { Chart as ChartType, ChartData, ChartOptions } from 'chart.js';
  
  export let type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' = 'line';
  export let data: ChartData;
  export let options: ChartOptions = {};
  export let height: number = 300;
  
  let canvas: HTMLCanvasElement;
  let chart: ChartType | null = null;
  
  const defaultOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          }
        }
      }
    },
    scales: type === 'pie' || type === 'doughnut' ? undefined : {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        ticks: {
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          }
        }
      }
    }
  };
  
  // Merge profundo: override prevalece sobre defaults mas preserva sub-objetos não sobrescritos
  function deepMerge(base: any, override: any): any {
    if (!override || typeof override !== 'object') return base;
    const result = { ...base };
    for (const key of Object.keys(override)) {
      const ov = override[key];
      const bv = base?.[key];
      if (ov !== null && typeof ov === 'object' && !Array.isArray(ov)
          && bv !== null && typeof bv === 'object' && !Array.isArray(bv)) {
        result[key] = deepMerge(bv, ov);
      } else {
        result[key] = ov;
      }
    }
    return result;
  }

  onMount(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chart = new Chart(ctx, {
      type,
      data,
      options: deepMerge(defaultOptions, options)
    });
  });
  
  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });
  
  // Update chart when data changes
  $: if (chart && data) {
    chart.data = data;
    chart.update('active');
  }
</script>

<div style="height: {height}px;">
  <canvas bind:this={canvas}></canvas>
</div>
