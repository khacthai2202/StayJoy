import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

export const dynamic = 'force-dynamic'

const STATS_FILE = path.join(os.tmpdir(), 'stayjoy_landing_stats.json')

function getStats() {
  if (fs.existsSync(STATS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'))
    } catch (e) {
      console.error(e)
    }
  }
  
  // Initial data
  const initial = {
    metadata: { consulted_extra: 0 },
    months: {
      '06/2026': { visitors: 28, leads: 8 },
      '07/2026': { visitors: 10, leads: 2 }
    }
  }
  // Migrating old data format if needed
  fs.writeFileSync(STATS_FILE, JSON.stringify(initial))
  return initial
}

function migrateStatsIfNeeded(rawData: any) {
  if (!rawData.metadata || !rawData.months) {
    const newData = { metadata: { consulted_extra: 0 }, months: {} as any }
    for (const [key, value] of Object.entries(rawData)) {
      if (key !== 'metadata' && key !== 'months') {
        newData.months[key] = value
      }
    }
    return newData
  }
  return rawData
}

export async function GET() {
  try {
    let rawData = getStats()
    rawData = migrateStatsIfNeeded(rawData)
    
    let totalVisitors = 0
    let totalLeadsAllTime = 0
    const chartData = []

    for (const [month, data] of Object.entries(rawData.months)) {
      const v = (data as any).visitors || 0
      const l = (data as any).leads || 0
      totalVisitors += v
      totalLeadsAllTime += l
      chartData.push({ month: `Tháng ${month}`, visitors: v, leads: l })
    }
    
    // Calculate current month's leads
    const now = new Date()
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    const currentMonthData = rawData.months[currentMonth] || { visitors: 0, leads: 0 }
    const currentLeads = currentMonthData.leads || 0

    const stats = {
      kpis: {
        totalVisitors: totalVisitors,
        totalLeads: currentLeads,
        totalLeadsAllTime: totalLeadsAllTime,
      },
      chartData
    }

    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    let rawData = getStats()
    rawData = migrateStatsIfNeeded(rawData)
    
    rawData.metadata.consulted_extra = (rawData.metadata.consulted_extra || 0) + 1
    
    fs.writeFileSync(STATS_FILE, JSON.stringify(rawData))
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
