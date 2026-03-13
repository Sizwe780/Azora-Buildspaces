import { NextResponse } from "next/server"

interface SimulationResult {
  board: string
  status: "success" | "error"
  readings: {
    sensor: string
    value: number
    unit: string
    status: "normal" | "warning" | "critical"
  }[]
  gpioState: Record<string, boolean>
  memoryUsage: { used: number; total: number }
  cpuFrequency: number
  uptime: number
  logs: string[]
}

const BOARD_SPECS: Record<string, { ram: number; flash: number; cpuMHz: number; pins: number }> = {
  esp32: { ram: 520, flash: 4096, cpuMHz: 240, pins: 34 },
  esp8266: { ram: 80, flash: 1024, cpuMHz: 80, pins: 17 },
  arduino: { ram: 2, flash: 32, cpuMHz: 16, pins: 20 },
  raspberry: { ram: 1024, flash: 32000, cpuMHz: 1400, pins: 40 },
  particle: { ram: 128, flash: 1024, cpuMHz: 120, pins: 24 },
}

function hashSeed(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash
}

function seededValue(seed: number, min: number, max: number, scale = 1): number {
  const normalized = (seed % 10_000) / 10_000
  const value = min + (max - min) * normalized
  return Number(value.toFixed(scale))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { board, project } = body

    const specs = BOARD_SPECS[board] || BOARD_SPECS.esp32

    const seedBase = hashSeed(`${board}:${project || 'default-project'}`)

    // Deterministic emulated sensor readings
    const sensors = [
      { sensor: "Temperature", value: seededValue(seedBase + 11, 20, 35, 1), unit: "°C", status: "normal" as const },
      { sensor: "Humidity", value: seededValue(seedBase + 23, 40, 70, 1), unit: "%", status: "normal" as const },
      { sensor: "Light", value: Math.round(seededValue(seedBase + 37, 200, 1000, 0)), unit: "lux", status: "normal" as const },
      { sensor: "Pressure", value: seededValue(seedBase + 41, 1000, 1030, 1), unit: "hPa", status: "normal" as const },
      {
        sensor: "CO2",
        value: Math.round(seededValue(seedBase + 53, 400, 1000, 0)),
        unit: "ppm",
        status: seededValue(seedBase + 67, 0, 1, 3) > 0.8 ? "warning" as const : "normal" as const,
      },
    ]

    // Deterministic GPIO states
    const gpioState: Record<string, boolean> = {}
    for (let i = 0; i < Math.min(8, specs.pins); i++) {
      gpioState[`GPIO${i}`] = ((seedBase + i * 17) % 2) === 0
    }

    const memUsed = Math.floor(specs.ram * seededValue(seedBase + 71, 0.3, 0.7, 3))
    const uptime = Math.floor(seededValue(seedBase + 79, 120, 86400, 0))
    const wifiOctet = Math.floor(seededValue(seedBase + 83, 100, 254, 0))

    const result: SimulationResult = {
      board,
      status: "success",
      readings: sensors,
      gpioState,
      memoryUsage: { used: memUsed, total: specs.ram },
      cpuFrequency: specs.cpuMHz,
      uptime,
      logs: [
        `[${new Date().toISOString()}] Board initialized: ${board.toUpperCase()}`,
        `[${new Date().toISOString()}] Project loaded: ${project}`,
        `[${new Date().toISOString()}] WiFi connected: 192.168.1.${wifiOctet}`,
        `[${new Date().toISOString()}] Sensors initialized (${sensors.length} active)`,
        `[${new Date().toISOString()}] MQTT broker connected`,
        `[${new Date().toISOString()}] Memory: ${memUsed}KB / ${specs.ram}KB (${Math.floor((memUsed / specs.ram) * 100)}%)`,
        `[${new Date().toISOString()}] Simulation running...`,
      ],
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Simulation error:", error)
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 })
  }
}
