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
  
  // Cores do tema VTUR
  const colors = {
    clientes: {
      primary: '#2457a6',
      light: '#c7d7f2',
      bg: 'rgba(36, 87, 166, 0.12)'
    },
    financeiro: {
      primary: '#b45309',
      light: '#f3c48b',
      bg: 'rgba(180, 83, 9, 0.12)'
    },
    vendas: {
      primary: '#0f766e',
      light: '#99f6e4',
      bg: 'rgba(15, 118, 110, 0.12)'
    }
  };
  
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
  
  onMount(() => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    chart = new Chart(ctx, {
      type,
      data,
      options: { ...defaultOptions, ...options }
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
