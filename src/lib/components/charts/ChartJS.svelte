<script lang="ts">
  import { onMount } from 'svelte';
  import type { Chart as ChartType, ChartData, ChartOptions } from 'chart.js';
  
  export let type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' = 'line';
  export let data: ChartData;
  export let options: ChartOptions = {};
  export let height: number = 300;
  
  let canvas: HTMLCanvasElement;
  let chart: ChartType | null = null;
  
  function buildDefaultOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      normalized: true,
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
  }
  
  type MergeableRecord = Record<string, unknown>;

  function isMergeableRecord(value: unknown): value is MergeableRecord {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  // Merge profundo: override prevalece sobre defaults mas preserva sub-objetos não sobrescritos
  function deepMerge<T extends MergeableRecord>(base: T, override: unknown): T {
    if (!isMergeableRecord(override)) return base;
    const result: MergeableRecord = { ...base };
    for (const key of Object.keys(override)) {
      const ov = override[key];
      const bv = base[key];
      if (isMergeableRecord(ov) && isMergeableRecord(bv)) {
        result[key] = deepMerge(bv, ov);
      } else {
        result[key] = ov;
      }
    }
    return result as T;
  }

  function mergedOptions() {
    return deepMerge(buildDefaultOptions() as MergeableRecord, options) as ChartOptions;
  }

  onMount(() => {
    let canceled = false;

    void (async () => {
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { default: Chart } = await import('chart.js/auto');
      if (canceled) return;

      chart = new Chart(ctx, {
        type,
        data,
        options: mergedOptions()
      });
    })();

    return () => {
      canceled = true;
      chart?.destroy();
      chart = null;
    };
  });
  
  // Update chart when data changes
  $: if (chart && data) {
    chart.data = data;
    chart.options = mergedOptions();
    chart.update('none');
  }
</script>

<div style="height: {height}px;">
  <canvas bind:this={canvas}></canvas>
</div>
