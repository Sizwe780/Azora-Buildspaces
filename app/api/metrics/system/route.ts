import { NextResponse } from 'next/server'
import os from 'os'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile);

interface NetworkSample {
  rxBytes: number;
  txBytes: number;
}

interface NetworkSnapshot extends NetworkSample {
  timestamp: number;
}

let previousNetworkSnapshot: NetworkSnapshot | null = null;

async function getLinuxNetworkSample(): Promise<NetworkSample | null> {
  try {
    const content = await readFile("/proc/net/dev", "utf8");
    const lines = content
      .split("\n")
      .slice(2)
      .map((line) => line.trim())
      .filter(Boolean);

    let rxBytes = 0;
    let txBytes = 0;

    for (const line of lines) {
      const [ifaceRaw, statsRaw] = line.split(":");
      const iface = ifaceRaw?.trim();
      if (!iface || iface === "lo" || !statsRaw) continue;

      const columns = statsRaw.trim().split(/\s+/);
      const ifaceRx = Number(columns[0] || "0");
      const ifaceTx = Number(columns[8] || "0");

      if (Number.isFinite(ifaceRx)) rxBytes += ifaceRx;
      if (Number.isFinite(ifaceTx)) txBytes += ifaceTx;
    }

    return { rxBytes, txBytes };
  } catch {
    return null;
  }
}

async function getWindowsNetworkSample(): Promise<NetworkSample | null> {
  try {
    const command = [
      "$stats = Get-NetAdapterStatistics",
      "$rx = ($stats | Measure-Object -Property ReceivedBytes -Sum).Sum",
      "$tx = ($stats | Measure-Object -Property SentBytes -Sum).Sum",
      'Write-Output "$rx,$tx"',
    ].join("; ");

    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      command,
    ]);
    const [rxRaw = "0", txRaw = "0"] = stdout.trim().split(",");
    const rxBytes = Number(rxRaw);
    const txBytes = Number(txRaw);

    if (!Number.isFinite(rxBytes) || !Number.isFinite(txBytes)) return null;
    return { rxBytes, txBytes };
  } catch {
    return null;
  }
}

async function getNetworkSample(): Promise<NetworkSample | null> {
  if (process.platform === "linux") return getLinuxNetworkSample();
  if (process.platform === "win32") return getWindowsNetworkSample();
  return null;
}

function buildNetworkMetrics(sample: NetworkSample | null) {
  if (!sample) return null;

  const now = Date.now();
  const previous = previousNetworkSnapshot;

  let rxPerSec: number | null = null;
  let txPerSec: number | null = null;

  if (previous && now > previous.timestamp) {
    const elapsedSeconds = (now - previous.timestamp) / 1000;
    if (elapsedSeconds > 0) {
      rxPerSec = Math.max(
        0,
        (sample.rxBytes - previous.rxBytes) / elapsedSeconds,
      );
      txPerSec = Math.max(
        0,
        (sample.txBytes - previous.txBytes) / elapsedSeconds,
      );
    }
  }

  previousNetworkSnapshot = { ...sample, timestamp: now };

  return {
    rxBytes: sample.rxBytes,
    txBytes: sample.txBytes,
    rxPerSec,
    txPerSec,
  };
}

/**
 * System Metrics API
 * GET /api/metrics/system
 *
 * Returns real CPU load and memory usage from the host OS.
 * Consumed by the status bar (when NEXT_PUBLIC_METRICS_ENABLED=true).
 */
export async function GET() {
  try {
    // ── CPU Usage ─────────────────────────────────
    // os.loadavg() returns [1min, 5min, 15min] load averages.
    // Normalise against CPU count so the value ~0-100%.
    const cpuCount = os.cpus().length;
    const loadAvg1 = os.loadavg()[0]; // 1-minute average
    const cpuPercent = Math.min(100, (loadAvg1 / cpuCount) * 100);

    // ── Memory Usage ──────────────────────────────
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    // ── Uptime ────────────────────────────────────
    const uptime = os.uptime(); // seconds

    // ── Network I/O ───────────────────────────────
    const networkSample = await getNetworkSample();
    const network = buildNetworkMetrics(networkSample);

    return NextResponse.json({
      cpu: Math.round(cpuPercent * 10) / 10,
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percent: Math.round(memPercent * 10) / 10,
      },
      cpuCount,
      platform: os.platform(),
      arch: os.arch(),
      uptime,
      network,
      hostname: os.hostname(),
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get system metrics" },
      { status: 500 },
    );
  }
}
