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
  const initial = {
    metadata: { consulted_extra: 0 },
    months: {
      '06/2026': { visitors: 28, leads: 8 },
      '07/2026': { visitors: 10, leads: 2 }
    }
  }
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'visitor' or 'lead'

    let rawData = getStats()
    rawData = migrateStatsIfNeeded(rawData)
    
    // Determine current month in format MM/YYYY
    const now = new Date()
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    
    if (!rawData.months[currentMonth]) {
      rawData.months[currentMonth] = { visitors: 0, leads: 0 }
    }
    
    if (type === 'lead') {
      rawData.months[currentMonth].leads += 1
    } else {
      rawData.months[currentMonth].visitors += 1
    }
    
    // Save
    fs.writeFileSync(STATS_FILE, JSON.stringify(rawData))

    // Return a 1x1 transparent GIF (tracking pixel)
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
